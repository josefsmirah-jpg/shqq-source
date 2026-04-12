import React, { useState, useRef, useCallback, memo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Image, FlatList, Alert, Platform
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateListing, useApproveListing } from "@workspace/api-client-react";
import AppHeader from "@/components/AppHeader";
import ConfirmModal from "@/components/ConfirmModal";
import C from "@/constants/colors";
import { PROPERTY_TYPES } from "@/utils/arabic";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

async function requestUploadUrl(): Promise<{ uploadURL: string; objectPath: string }> {
  const res = await fetch(`${API_BASE}/api/upload-url`, { method: "POST" });
  if (!res.ok) throw new Error("upload-url failed");
  return res.json();
}

async function uploadImageToStorage(uploadURL: string, localUri: string): Promise<void> {
  if (Platform.OS === "web") {
    const fetched = await fetch(localUri);
    const blob = await fetched.blob();
    await fetch(uploadURL, { method: "PUT", body: blob, headers: { "Content-Type": "image/jpeg" } });
  } else {
    await FileSystem.uploadAsync(uploadURL, localUri, {
      httpMethod: "PUT",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { "Content-Type": "image/jpeg" },
    });
  }
}

function getImageUri(img: string): string {
  if (!img) return "";
  if (img.startsWith("file://") || img.startsWith("data:") || img.startsWith("http://") || img.startsWith("https://")) return img;
  if (img.startsWith("/objects/")) return `${API_BASE}/api/storage${img}`;
  return img;
}

type FloorRow = { name: string; area: string; price: string };

const DEFAULT_FLOOR_NAMES = [
  "طابق التسوية",
  "الطابق الارضي مع ترس",
  "الطابق الارضي مع حديقة",
  "الطابق الاول والثاني مكرر",
  "الطابق الثالث مع روف وترس",
];

const makeDefaultFloors = (): FloorRow[] =>
  DEFAULT_FLOOR_NAMES.map((name) => ({ name, area: "", price: "" }));

const TABLE_BG = "rgba(0,0,0,0.25)";
const TABLE_BG_ALT = "rgba(0,0,0,0.15)";
const GOLD = "#C9A022";

type FloorRowItemProps = {
  row: FloorRow; index: number; isAlt: boolean; totalRows: number;
  onUpdate: (i: number, f: keyof FloorRow, v: string) => void;
  onRemove: (i: number) => void;
  setRef: (i: number, col: string, r: TextInput | null) => void;
  focusNext: (i: number, col: "price" | "area" | "name") => void;
};
const FloorRowItem = memo(
  ({ row, index, isAlt, totalRows, onUpdate, onRemove, setRef, focusNext }: FloorRowItemProps) => (
    <View style={[styles.tableRow, isAlt && styles.tableRowAlt]}>
      <View style={styles.numCellView}>
        <TextInput ref={r => setRef(index, "price", r)} style={styles.numInput}
          value={row.price} onChangeText={v => onUpdate(index, "price", v)}
          placeholder="---" placeholderTextColor="#C9A02255" keyboardType="default"
          textAlign="center" textAlignVertical="center" returnKeyType="next" blurOnSubmit={false}
          onSubmitEditing={() => { if (index < totalRows - 1) focusNext(index + 1, "name"); }} />
        <Text style={styles.unitLabel}>ألف</Text>
      </View>
      <View style={styles.colBorder} />
      <View style={styles.numCellView}>
        <TextInput ref={r => setRef(index, "area", r)} style={styles.numInput}
          value={row.area} onChangeText={v => onUpdate(index, "area", v)}
          placeholder="---" placeholderTextColor="#C9A02255" keyboardType="default"
          textAlign="center" textAlignVertical="center" returnKeyType="next" blurOnSubmit={false}
          onSubmitEditing={() => focusNext(index, "price")} />
        <Text style={styles.unitLabel}>م²</Text>
      </View>
      <View style={styles.colBorder} />
      <View style={styles.nameCellView}>
        <TextInput ref={r => setRef(index, "name", r)} style={styles.nameInput}
          value={row.name} onChangeText={v => onUpdate(index, "name", v)}
          placeholder="---" placeholderTextColor="#C9A02255"
          textAlign="right" textAlignVertical="center" returnKeyType="next" blurOnSubmit={false}
          onSubmitEditing={() => focusNext(index, "area")} />
        <TouchableOpacity style={styles.trashBtn} onPress={() => onRemove(index)}>
          <Text style={styles.trashIcon}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  ),
  (p, n) => p.row === n.row && p.isAlt === n.isAlt && p.totalRows === n.totalRows
);

export default function AdminAddListingScreen() {
  const createListing = useCreateListing();
  const approveListing = useApproveListing();
  const queryClient = useQueryClient();
  const cellRefs = useRef<{ [key: string]: TextInput | null }>({});

  const [propertyType, setPropertyType] = useState("");
  const [region, setRegion] = useState("");
  const [price, setPrice] = useState("");
  const [floor, setFloor] = useState("");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [mapsLink, setMapsLink] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [floors, setFloors] = useState<FloorRow[]>(makeDefaultFloors());
  const [showTypes, setShowTypes] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState("");
  const [showDupWarning, setShowDupWarning] = useState(false);

  const floorsLenRef = useRef(floors.length);
  floorsLenRef.current = floors.length;

  const setRef = useCallback((row: number, col: string, ref: TextInput | null) => {
    cellRefs.current[`${row}-${col}`] = ref;
  }, []);
  const focusNext = useCallback((row: number, col: "price" | "area" | "name") => {
    cellRefs.current[`${row}-${col}`]?.focus();
  }, []);
  const addFloorRow = useCallback(() => {
    setFloors((prev) => [...prev, { name: "", area: "", price: "" }]);
  }, []);
  const updateFloor = useCallback((index: number, field: keyof FloorRow, value: string) => {
    setFloors((prev) => prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)));
  }, []);
  const removeFloor = useCallback((index: number) => {
    if (floorsLenRef.current <= 1) return;
    setFloors((prev) => prev.filter((_, j) => j !== index));
  }, []);

  const resetForm = () => {
    setPropertyType("");
    setRegion("");
    setPrice("");
    setFloor("");
    setArea("");
    setDescription("");
    setOwnerName("");
    setOwnerPhone("");
    setMapsLink("");
    setImages([]);
    setFloors(makeDefaultFloors());
  };

  const pickImage = async () => {
    if (images.length >= 10) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.6,
      selectionLimit: 10 - images.length,
      maxWidth: 1200,
      maxHeight: 1200,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setUploading(true);

      // 1. ضغط جميع الصور أولاً
      const compressed: string[] = [];
      for (const asset of result.assets) {
        try {
          const man = await ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width: 900 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
          );
          compressed.push(man.uri);
        } catch {}
      }

      // 2. عرض الصور فوراً (مسار محلي) — الزر يبقى معطّلاً حتى تنتهي كل الرفوعات
      const slots = compressed.slice(0, 10 - images.length);
      setImages((prev) => [...prev, ...slots].slice(0, 10));

      // 3. رفع كل صورة واستبدال المسار المحلي بـ objectPath
      for (const localUri of slots) {
        try {
          const { uploadURL, objectPath } = await requestUploadUrl();
          await uploadImageToStorage(uploadURL, localUri);
          setImages((prev) => prev.map(img => img === localUri ? objectPath : img));
        } catch {}
      }
      setUploading(false);
    }
  };

  const takePhoto = async () => {
    if (images.length >= 10) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") { Alert.alert("تنبيه", "يرجى السماح للتطبيق باستخدام الكاميرا من إعدادات الجهاز"); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setUploading(true);
      try {
        const man = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 900 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        const localUri = man.uri;
        setImages((prev) => [...prev, localUri].slice(0, 10));
        try {
          const { uploadURL, objectPath } = await requestUploadUrl();
          await uploadImageToStorage(uploadURL, localUri);
          setImages((prev) => prev.map(img => img === localUri ? objectPath : img));
        } catch {}
      } catch {}
      setUploading(false);
    }
  };

  const showPhotoOptions = () => {
    if (images.length >= 10) return;
    if (Platform.OS === "web") { pickImage(); return; }
    Alert.alert("إضافة صورة", "اختر طريقة الإضافة", [
      { text: "📷 التقاط صورة", onPress: takePhoto },
      { text: "🖼 اختيار من المعرض", onPress: pickImage },
      { text: "إلغاء", style: "cancel" },
    ]);
  };

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};
    if (!region.trim()) newErrors.region = "⚠ يرجى إدخال المنطقة";
    if (!ownerName.trim()) newErrors.ownerName = "⚠ يرجى إدخال اسم المالك";
    if (!ownerPhone.trim()) {
      newErrors.ownerPhone = "⚠ يرجى إدخال هاتف المالك";
    } else {
      const digits = ownerPhone.trim().replace(/[^0-9٠-٩]/g, "");
      if (digits.length < 10) newErrors.ownerPhone = "⚠ رقم الهاتف يجب أن لا يقل عن ١٠ أرقام";
    }
    if (!mapsLink.trim()) newErrors.mapsLink = "⚠ يرجى إدخال رابط الموقع على الخريطة";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});

    // فحص التكرار — يشترط مطابقة الهاتف + المنطقة + السعر + المساحة معاً
    // عند فراغ السعر/المساحة نستخدم أول طابق مملوء كقيمة بديلة
    try {
      const firstFloor = floors.find((f: any) => f.name.trim() && (f.price.trim() || f.area.trim()));
      const effectivePrice = price.trim() || firstFloor?.price?.trim() || "";
      const effectiveArea = area.trim() || firstFloor?.area?.trim() || "";
      const params = new URLSearchParams();
      if (ownerPhone.trim()) params.append("phone", ownerPhone.trim());
      if (region.trim()) params.append("region", region.trim());
      if (effectivePrice) params.append("price", effectivePrice);
      if (effectiveArea) params.append("area", effectiveArea);
      const res = await fetch(`${API_BASE}/api/listings/check-duplicate?${params}`);
      const { isDuplicate } = await res.json();
      if (isDuplicate) { setShowDupWarning(true); return; }
    } catch {}

    doSubmit();
  };

  const doSubmit = () => {
    const isLandType = propertyType === "أرض";
    if (!isLandType && !floors.some((f: any) => f.name.trim() && f.price.trim() && f.area.trim())) {
      setErrors(prev => ({ ...prev, floors: "⚠ يرجى إدخال المساحة والسعر لطابق واحد على الأقل" }));
      return;
    }

    const floorData = floors
      .filter((f) => f.name.trim())
      .map((f) => ({
        name: f.name,
        area: f.area || undefined,
        price: f.price || undefined,
      }));

    createListing.mutate(
      {
        data: {
          region,
          propertyType: propertyType || undefined,
          price: price || undefined,
          floor: floor || undefined,
          area: area || undefined,
          description: description || undefined,
          ownerName,
          ownerPhone,
          mapsLink: mapsLink || undefined,
          createdByRole: "admin",
          images: images.length > 0 ? images : undefined,
          floors: floorData.length > 0 ? floorData : undefined,
        },
      },
      {
        onSuccess: (created: any) => {
          const newId = created?.id;
          if (newId) {
            approveListing.mutate({ id: newId }, {
              onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
              },
            });
          }
          resetForm();
          setSuccessMsg("تم إضافة العقار واعتماده تلقائياً ✅");
          setTimeout(() => setSuccessMsg(""), 4000);
        },
        onError: () => setErrors({ _form: "⚠ تعذر الإضافة، حاول مرة أخرى" }),
      }
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader title="إضافة عقار - مدير" showBack />
      <ConfirmModal
        visible={showDupWarning}
        title="⚠️ إعلان مشابه موجود"
        message="يوجد إعلان بنفس رقم الهاتف والنوع والمنطقة. هل أنت متأكد من المتابعة؟"
        confirmText="نعم، أكمل الإضافة"
        cancelText="إلغاء"
        destructive={false}
        onConfirm={() => { setShowDupWarning(false); doSubmit(); }}
        onCancel={() => setShowDupWarning(false)}
      />
      {!!successMsg && (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>{successMsg}</Text>
        </View>
      )}
      {!!errors._form && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errors._form}</Text>
        </View>
      )}
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <FieldLabel>نوع العقار</FieldLabel>
        <TouchableOpacity
          style={styles.select}
          onPress={() => setShowTypes(!showTypes)}
        >
          <Text style={propertyType ? styles.selectValue : styles.selectPlaceholder}>
            {propertyType || "اختر نوع العقار"}
          </Text>
        </TouchableOpacity>
        {showTypes && (
          <View style={styles.dropdown}>
            {PROPERTY_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={styles.dropdownItem}
                onPress={() => { setPropertyType(t); setShowTypes(false); }}
              >
                <Text style={styles.dropdownText}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <FieldLabel>المنطقة *</FieldLabel>
        <TextInput
          style={[styles.input, errors.region ? styles.inputError : null]}
          value={region}
          onChangeText={v => { setRegion(v); if (errors.region) setErrors(e => ({ ...e, region: "" })); }}
          placeholder="المنطقة (مثال: عمان، الزرقاء...)"
          placeholderTextColor={C.textMuted}
          textAlign="right"
        />
        {!!errors.region && <Text style={styles.errorText}>{errors.region}</Text>}

        <FieldLabel>السعر (دينار)</FieldLabel>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          placeholder="السعر"
          placeholderTextColor={C.textMuted}
          keyboardType="number-pad"
          textAlign="right"
        />

        <FieldLabel>الطابق</FieldLabel>
        <TextInput
          style={styles.input}
          value={floor}
          onChangeText={setFloor}
          placeholder="الطابق"
          placeholderTextColor={C.textMuted}
          textAlign="right"
        />

        <FieldLabel>المساحة (م²)</FieldLabel>
        <TextInput
          style={styles.input}
          value={area}
          onChangeText={setArea}
          placeholder="المساحة"
          placeholderTextColor={C.textMuted}
          keyboardType="number-pad"
          textAlign="right"
        />

        <FieldLabel>الوصف</FieldLabel>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="وصف العقار"
          placeholderTextColor={C.textMuted}
          textAlign="right"
          multiline
          numberOfLines={4}
        />

        <FieldLabel>رابط الموقع *</FieldLabel>
        <TextInput
          style={[styles.input, errors.mapsLink ? styles.inputError : null]}
          value={mapsLink}
          onChangeText={v => { setMapsLink(v); if (errors.mapsLink) setErrors(e => ({ ...e, mapsLink: "" })); }}
          placeholder="https://maps.google.com/..."
          placeholderTextColor={C.textMuted}
          autoCapitalize="none"
        />
        {!!errors.mapsLink && <Text style={styles.errorText}>{errors.mapsLink}</Text>}

        <FieldLabel>اسم المالك *</FieldLabel>
        <TextInput
          style={[styles.input, errors.ownerName ? styles.inputError : null]}
          value={ownerName}
          onChangeText={v => { setOwnerName(v); if (errors.ownerName) setErrors(e => ({ ...e, ownerName: "" })); }}
          placeholder="الاسم الكامل"
          placeholderTextColor={C.textMuted}
          textAlign="right"
        />
        {!!errors.ownerName && <Text style={styles.errorText}>{errors.ownerName}</Text>}

        <FieldLabel>هاتف المالك *</FieldLabel>
        <TextInput
          style={[styles.input, errors.ownerPhone ? styles.inputError : null]}
          value={ownerPhone}
          onChangeText={v => { setOwnerPhone(v); if (errors.ownerPhone) setErrors(e => ({ ...e, ownerPhone: "" })); }}
          placeholder="07XXXXXXXX"
          placeholderTextColor={C.textMuted}
          keyboardType="phone-pad"
          textAlign="right"
        />
        {!!errors.ownerPhone && <Text style={styles.errorText}>{errors.ownerPhone}</Text>}

        {/* ─── Floor Table ─── */}
        <View style={styles.floorsSection}>
          <View style={styles.floorsHeaderRow}>
            <TouchableOpacity style={styles.addFloorBtn} onPress={addFloorRow}>
              <Text style={styles.addFloorBtnText}>+ إضافة طابق</Text>
            </TouchableOpacity>
            <Text style={styles.floorsTitle}>جدول الطوابق</Text>
          </View>
          <View style={styles.floorTable}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell}>السعر</Text>
              <View style={styles.tableHeaderBorder} />
              <Text style={styles.tableHeaderCell}>المساحة</Text>
              <View style={styles.tableHeaderBorder} />
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>الطابق / الوحدة</Text>
            </View>

            {floors.map((f, idx) => (
              <FloorRowItem
                key={idx}
                row={f}
                index={idx}
                isAlt={idx % 2 === 1}
                totalRows={floors.length}
                onUpdate={updateFloor}
                onRemove={removeFloor}
                setRef={setRef}
                focusNext={focusNext}
              />
            ))}
          </View>
          {!!errors.floors && (
            <Text style={styles.errorText}>{errors.floors}</Text>
          )}
        </View>

        {/* ─── Photos ─── */}
        <View style={styles.photosSection}>
          <FieldLabel>الصور ({images.length}/10)</FieldLabel>
          <FlatList
            data={images}
            horizontal
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item, index }) => (
              <View style={styles.photoWrapper}>
                <Image source={{ uri: getImageUri(item) }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhoto}
                  onPress={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Text style={styles.removePhotoText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            ListFooterComponent={
              images.length < 10 ? (
                <TouchableOpacity style={styles.addPhotoBtn} onPress={showPhotoOptions} disabled={uploading}>
                  {uploading ? (
                    <ActivityIndicator color={C.gold} />
                  ) : (
                    <Text style={styles.addPhotoText}>+ صورة</Text>
                  )}
                </TouchableOpacity>
              ) : null
            }
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, createListing.isPending && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={createListing.isPending}
        >
          {createListing.isPending ? (
            <ActivityIndicator color={C.bgDark} />
          ) : (
            <Text style={styles.submitText}>إضافة مباشرة ✅</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Overlay تحميل الصور أو رفع الإعلان */}
      {(uploading || createListing.isPending) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#C9A022" />
          <Text style={styles.loadingMsg}>
            {uploading ? "جاري معالجة الصور..." : "جاري رفع الإعلان..."}
          </Text>
        </View>
      )}
    </View>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ color: GOLD, fontSize: 13, fontWeight: "600", textAlign: "right", marginBottom: 4, marginTop: 8 }}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingBottom: 40 },
  select: {
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.inputBorder,
    borderRadius: 10, padding: 14, marginBottom: 4,
  },
  selectValue: { color: C.white, fontSize: 15, textAlign: "right" },
  selectPlaceholder: { color: C.textMuted, fontSize: 14, textAlign: "right" },
  dropdown: {
    backgroundColor: C.bgDark, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, marginBottom: 8, maxHeight: 200,
  },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  dropdownText: { color: C.white, fontSize: 14, textAlign: "right" },
  input: {
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.inputBorder,
    borderRadius: 10, padding: 14, color: C.white, fontSize: 15, marginBottom: 4,
  },
  textArea: { height: 100, textAlignVertical: "top" },

  floorsSection: { marginTop: 14 },
  floorsHeaderRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 8,
  },
  floorsTitle: { color: GOLD, fontSize: 14, fontWeight: "700" },
  addFloorBtn: {
    backgroundColor: C.bgLight, paddingHorizontal: 14,
    paddingVertical: 7, borderRadius: 8,
    borderWidth: 1, borderColor: "rgba(201,160,34,0.3)",
  },
  addFloorBtnText: { color: C.goldLight, fontSize: 13, fontWeight: "600" },

  floorTable: {
    backgroundColor: C.bgDark, borderRadius: 10,
    overflow: "hidden", borderWidth: 1, borderColor: "rgba(201,160,34,0.35)",
  },
  tableHeader: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.bgDark, paddingVertical: 13,
    borderBottomWidth: 1.5, borderBottomColor: GOLD,
  },
  tableHeaderCell: {
    flex: 1, color: GOLD, fontSize: 13, fontWeight: "800",
    textAlign: "center", writingDirection: "rtl",
  },
  tableHeaderBorder: { width: 1, backgroundColor: "rgba(201,160,34,0.5)", alignSelf: "stretch" },
  tableRow: {
    flexDirection: "row", alignItems: "stretch",
    backgroundColor: TABLE_BG, minHeight: 54,
    borderTopWidth: 1, borderTopColor: "rgba(201,160,34,0.2)",
  },
  tableRowAlt: { backgroundColor: TABLE_BG_ALT },
  numCellView: { flex: 1, position: "relative" },
  nameCellView: { flex: 2, flexDirection: "row", alignItems: "stretch" },
  nameInput: {
    flex: 1, color: C.white, fontSize: 13, textAlign: "right",
    textAlignVertical: "center",
  },
  numInput: {
    flex: 1, color: GOLD, fontSize: 14, fontWeight: "700",
    textAlign: "center", textAlignVertical: "center",
  },
  unitLabel: {
    position: "absolute", end: 3, top: 0, bottom: 0,
    color: GOLD, fontSize: 10, fontWeight: "700", textAlignVertical: "center",
  },
  trashBtn: { paddingHorizontal: 8, justifyContent: "center", alignItems: "center" },
  trashIcon: { fontSize: 17 },
  colBorder: { width: 1, backgroundColor: "rgba(201,160,34,0.4)", alignSelf: "stretch" },

  photosSection: { marginTop: 10 },
  photoWrapper: { position: "relative", marginRight: 8 },
  photo: { width: 80, height: 80, borderRadius: 8 },
  removePhoto: {
    position: "absolute", top: -6, right: -6,
    backgroundColor: C.error, borderRadius: 10,
    width: 20, height: 20, alignItems: "center", justifyContent: "center",
  },
  removePhotoText: { color: C.white, fontSize: 11, fontWeight: "700" },
  addPhotoBtn: {
    width: 80, height: 80, borderRadius: 8,
    borderWidth: 2, borderColor: GOLD, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
  },
  addPhotoText: { color: GOLD, fontSize: 12 },
  submitBtn: {
    backgroundColor: GOLD, borderRadius: 12,
    paddingVertical: 16, alignItems: "center", marginTop: 20,
  },
  submitText: { color: C.bgDark, fontWeight: "800", fontSize: 16 },
  inputError: { borderColor: "#FF6B6B", borderWidth: 1.5 },
  errorText: { color: "#FF6B6B", fontSize: 12, textAlign: "right", marginBottom: 4, marginTop: -2 },
  successBanner: {
    backgroundColor: "rgba(34,140,63,0.95)", paddingVertical: 12,
    paddingHorizontal: 16, alignItems: "center",
  },
  successBannerText: { color: "#fff", fontSize: 14, fontWeight: "700", textAlign: "center" },
  errorBanner: {
    backgroundColor: "rgba(220,38,38,0.9)", paddingVertical: 12,
    paddingHorizontal: 16, alignItems: "center",
  },
  errorBannerText: { color: "#fff", fontSize: 14, fontWeight: "700", textAlign: "center" },
  loadingOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(19,68,31,0.9)", justifyContent: "center",
    alignItems: "center", zIndex: 999,
  },
  loadingMsg: { color: "#C9A022", marginTop: 14, fontSize: 16, fontWeight: "700", textAlign: "center" },
});
