import React, { useState, useRef, useCallback, memo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Image, FlatList, Alert, Platform
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import { useCreateListing } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import C from "@/constants/colors";
import { PROPERTY_TYPES } from "@/utils/arabic";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

async function uploadImageViaServer(localUri: string): Promise<string> {
  let base64: string;
  if (Platform.OS === "web") {
    const fetched = await fetch(localUri);
    const blob = await fetched.blob();
    base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } else {
    base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
  }
  const res = await fetch(`${API_BASE}/api/upload-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64, contentType: "image/jpeg" }),
  });
  if (!res.ok) throw new Error("upload-image failed");
  const { objectPath } = await res.json();
  return objectPath;
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
  DEFAULT_FLOOR_NAMES.map(name => ({ name, area: "", price: "" }));

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
          placeholder="---" placeholderTextColor="#C9A02255" keyboardType="numeric"
          textAlign="center" textAlignVertical="center" returnKeyType="next" blurOnSubmit={false}
          onSubmitEditing={() => { if (index < totalRows - 1) focusNext(index + 1, "name"); }} />
        <Text style={styles.unitLabel}>ألف</Text>
      </View>
      <View style={styles.colBorder} />
      <View style={styles.numCellView}>
        <TextInput ref={r => setRef(index, "area", r)} style={styles.numInput}
          value={row.area} onChangeText={v => onUpdate(index, "area", v)}
          placeholder="---" placeholderTextColor="#C9A02255" keyboardType="numeric"
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

export default function EmployeePostScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const createListing = useCreateListing();

  const [propertyType, setPropertyType] = useState("");
  const [region, setRegion] = useState("");
  const [price, setPrice] = useState("");
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

  const cellRefs = useRef<{[key: string]: TextInput | null}>({});
  const floorsLenRef = useRef(floors.length);
  floorsLenRef.current = floors.length;

  const setRef = useCallback((row: number, col: string, ref: TextInput | null) => {
    cellRefs.current[`${row}-${col}`] = ref;
  }, []);
  const focusNext = useCallback((row: number, col: "price" | "area" | "name") => {
    cellRefs.current[`${row}-${col}`]?.focus();
  }, []);

  const resetForm = () => {
    setPropertyType("");
    setRegion("");
    setPrice("");
    setArea("");
    setDescription("");
    setOwnerName("");
    setOwnerPhone("");
    setMapsLink("");
    setImages([]);
    setFloors(makeDefaultFloors());
    setShowTypes(false);
    setErrors({});
    setSuccessMsg("");
  };

  const updateFloor = useCallback((index: number, field: keyof FloorRow, value: string) => {
    setFloors(prev => prev.map((f, i) => i === index ? { ...f, [field]: value } : f));
  }, []);
  const addFloorRow = useCallback(() => {
    setFloors(prev => [...prev, { name: "", area: "", price: "" }]);
  }, []);
  const removeFloor = useCallback((index: number) => {
    if (floorsLenRef.current <= 1) return;
    setFloors(prev => prev.filter((_, i) => i !== index));
  }, []);

  const pickImage = async () => {
    if (images.length >= 10) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10 - images.length,
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
      setImages(prev => [...prev, ...slots].slice(0, 10));

      // 3. رفع كل صورة عبر السيرفر واستبدال المسار المحلي بـ objectPath
      for (const localUri of slots) {
        try {
          const objectPath = await uploadImageViaServer(localUri);
          setImages(prev => prev.map(img => img === localUri ? objectPath : img));
        } catch (e) {
          console.error("Image upload error:", e);
        }
      }
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!region.trim()) newErrors.region = "⚠ يرجى إدخال المنطقة";
    if (!ownerName.trim()) newErrors.ownerName = "⚠ يرجى إدخال اسم صاحب العقار";
    if (!ownerPhone.trim()) {
      newErrors.ownerPhone = "⚠ يرجى إدخال هاتف صاحب العقار";
    } else {
      const digits = ownerPhone.trim().replace(/[^0-9٠-٩]/g, "");
      if (digits.length < 10) newErrors.ownerPhone = "⚠ رقم الهاتف يجب أن لا يقل عن ١٠ أرقام";
    }
    if (!mapsLink.trim()) newErrors.mapsLink = "⚠ يرجى إدخال رابط الموقع على الخريطة";
    const isLand = propertyType === "أرض";
    if (!isLand && !floors.some(f => f.name.trim() && f.price.trim() && f.area.trim())) {
      newErrors.floors = "⚠ يرجى إدخال المساحة والسعر لطابق واحد على الأقل";
    }
    const hasLocalImages = images.some(img => img.startsWith("file://") || img.startsWith("blob:") || img.startsWith("data:"));
    if (hasLocalImages) {
      Alert.alert("يرجى الانتظار", "لا تزال بعض الصور قيد الرفع، يرجى الانتظار قليلاً ثم المحاولة مجدداً.");
      return;
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});

    const floorData = isLand ? [] : floors.filter(f => f.name.trim() && (f.price.trim() || f.area.trim())).map(f => ({
      name: f.name.trim(), area: f.area || undefined, price: f.price || undefined
    }));

    createListing.mutate({ data: {
      region: region.trim(),
      projectName: floorData.length > 0 ? region.trim() : undefined,
      propertyType: propertyType || undefined,
      price: isLand ? (price || undefined) : undefined,
      area: isLand ? (area || undefined) : undefined,
      description: description || undefined,
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone.trim(),
      mapsLink: mapsLink.trim(),
      createdByRole: "employee",
      createdByName: user?.name,
      createdByPhone: user?.phone,
      images: images.length > 0 ? images : undefined,
      floors: floorData.length > 0 ? floorData : undefined,
      status: "pending",
    } as any}, {
      onSuccess: (newListing: any) => {
        // أضف الإعلان الجديد إلى الكاش فوراً حتى يظهر العدد بدون انتظار
        queryClient.setQueriesData(
          { queryKey: ["/api/listings"], exact: false },
          (old: unknown) => {
            if (!Array.isArray(old)) return old;
            const alreadyExists = old.some((l: any) => l.id === newListing?.id);
            if (alreadyExists) return old;
            return [{ ...newListing, status: "pending" }, ...old];
          }
        );
        resetForm();
        setSuccessMsg("تم إرسال إعلانك وهو الآن بانتظار موافقة المدير ⏳");
      },
      onError: () => setErrors({ _form: "تعذر الإضافة، حاول مرة أخرى" }),
    });
  };

  return (
    <View style={styles.container}>
      <AppHeader title="إضافة عقار جديد" showBack />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {successMsg !== "" && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        )}
        {errors._form && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errors._form}</Text>
          </View>
        )}

        <FieldLabel>نوع العقار</FieldLabel>
        <TouchableOpacity style={styles.select} onPress={() => setShowTypes(!showTypes)}>
          <Text style={propertyType ? styles.selectValue : styles.selectPlaceholder}>
            {propertyType || "اختر نوع العقار"}
          </Text>
        </TouchableOpacity>
        {showTypes && (
          <View style={styles.dropdown}>
            {PROPERTY_TYPES.map(t => (
              <TouchableOpacity key={t} style={styles.dropdownItem} onPress={() => { setPropertyType(t); setShowTypes(false); }}>
                <Text style={styles.dropdownText}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <FieldLabel>المنطقة / اسم المشروع *</FieldLabel>
        <TextInput
          style={[styles.input, errors.region ? styles.inputError : null]}
          value={region}
          onChangeText={v => { setRegion(v); if (errors.region) setErrors(e => ({ ...e, region: "" })); }}
          placeholder="مثال: شفا بدران - الياسمين"
          placeholderTextColor={C.textMuted}
          textAlign="right"
        />
        {!!errors.region && <Text style={styles.errorText}>{errors.region}</Text>}

        {propertyType === "أرض" ? (
          <>
            <FieldLabel>السعر</FieldLabel>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="مثال: 85,000 دينار"
              placeholderTextColor={C.textMuted}
              textAlign="right"
            />
            <FieldLabel>المساحة</FieldLabel>
            <TextInput
              style={styles.input}
              value={area}
              onChangeText={setArea}
              placeholder="مثال: 500"
              placeholderTextColor={C.textMuted}
              keyboardType="numeric"
              textAlign="right"
            />
          </>
        ) : (
          <>
            <FieldLabel>جدول الطوابق والأسعار</FieldLabel>
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderCell}>السعر</Text>
                <View style={styles.tableHeaderBorder} />
                <Text style={styles.tableHeaderCell}>المساحة</Text>
                <View style={styles.tableHeaderBorder} />
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>الطابق / الوحدة</Text>
              </View>
              {floors.map((floorRow, index) => (
                <FloorRowItem
                  key={index}
                  row={floorRow}
                  index={index}
                  isAlt={index % 2 === 1}
                  totalRows={floors.length}
                  onUpdate={updateFloor}
                  onRemove={removeFloor}
                  setRef={setRef}
                  focusNext={focusNext}
                />
              ))}
            </View>
            <TouchableOpacity style={styles.addRowBtn} onPress={addFloorRow}>
              <Text style={styles.addRowText}>+ إضافة صف</Text>
            </TouchableOpacity>
            {!!errors.floors && (
              <Text style={styles.errorText}>{errors.floors}</Text>
            )}
          </>
        )}

        <FieldLabel>وصف إضافي</FieldLabel>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="أدخل تفاصيل إضافية..."
          placeholderTextColor={C.textMuted}
          multiline
          textAlign="right"
          textAlignVertical="top"
        />

        <FieldLabel>اسم صاحب العقار *</FieldLabel>
        <TextInput
          style={[styles.input, errors.ownerName ? styles.inputError : null]}
          value={ownerName}
          onChangeText={v => { setOwnerName(v); if (errors.ownerName) setErrors(e => ({ ...e, ownerName: "" })); }}
          placeholder="الاسم الكامل"
          placeholderTextColor={C.textMuted}
          textAlign="right"
        />
        {!!errors.ownerName && <Text style={styles.errorText}>{errors.ownerName}</Text>}

        <FieldLabel>هاتف صاحب العقار *</FieldLabel>
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

        <FieldLabel>رابط الموقع (Google Maps) *</FieldLabel>
        <TextInput
          style={[styles.input, errors.mapsLink ? styles.inputError : null]}
          value={mapsLink}
          onChangeText={v => { setMapsLink(v); if (errors.mapsLink) setErrors(e => ({ ...e, mapsLink: "" })); }}
          placeholder="https://maps.google.com/..."
          placeholderTextColor={C.textMuted}
          textAlign="right"
          autoCapitalize="none"
          keyboardType="url"
        />
        {!!errors.mapsLink && <Text style={styles.errorText}>{errors.mapsLink}</Text>}

        <FieldLabel>صور العقار</FieldLabel>
        <FlatList
          horizontal
          data={images}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item, index }) => (
            <View style={styles.photoWrapper}>
              <Image source={{ uri: getImageUri(item) }} style={styles.photo} />
              <TouchableOpacity style={styles.removePhoto} onPress={() => setImages(p => p.filter((_, i) => i !== index))}>
                <Text style={styles.removePhotoText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          ListFooterComponent={images.length < 10 ? (
            <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage} disabled={uploading}>
              {uploading ? <ActivityIndicator color={C.gold} /> : <Text style={styles.addPhotoText}>+ صورة</Text>}
            </TouchableOpacity>
          ) : null}
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 8 }}
        />

        <View style={styles.noteBox}>
          <Text style={styles.noteText}>⏳ الإعلان سيظهر في قائمتك كـ"معلق" وسيُنشر بعد موافقة المدير</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, createListing.isPending && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={createListing.isPending}
        >
          {createListing.isPending
            ? <ActivityIndicator color={C.bgDark} />
            : <Text style={styles.submitText}>إرسال الإعلان للمراجعة 📤</Text>
          }
        </TouchableOpacity>
      </ScrollView>

      {/* Overlay تحميل الصور أو رفع الإعلان */}
      {(uploading || createListing.isPending) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={C.gold} />
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
    <Text style={{ color: C.gold, fontSize: 13, fontWeight: "600", textAlign: "right", marginBottom: 4, marginTop: 10 }}>
      {children}
    </Text>
  );
}

const GOLD = "#C9A022";
const TABLE_BG = "rgba(26,92,46,0.85)";
const TABLE_BG_ALT = "rgba(30,104,50,0.85)";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingBottom: 60 },
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
  textArea: { height: 90, textAlignVertical: "top" },
  tableContainer: {
    borderWidth: 1.5, borderColor: GOLD, borderRadius: 10, overflow: "hidden", marginBottom: 4,
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
  addRowBtn: {
    backgroundColor: "rgba(201,160,34,0.1)", borderWidth: 1,
    borderColor: "rgba(201,160,34,0.4)", borderRadius: 8,
    paddingVertical: 10, alignItems: "center", marginBottom: 8,
  },
  addRowText: { color: GOLD, fontSize: 14, fontWeight: "600" },
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
    borderWidth: 2, borderColor: C.gold, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
  },
  addPhotoText: { color: C.gold, fontSize: 12 },
  noteBox: {
    backgroundColor: "rgba(201,160,34,0.1)", borderRadius: 8, padding: 12,
    marginTop: 16, borderWidth: 1, borderColor: "rgba(201,160,34,0.4)",
  },
  noteText: { color: C.gold, fontSize: 13, textAlign: "right" },
  submitBtn: {
    backgroundColor: C.gold, borderRadius: 12, paddingVertical: 16,
    alignItems: "center", marginTop: 16,
  },
  submitText: { color: C.bgDark, fontWeight: "800", fontSize: 16 },
  inputError: { borderColor: "#FF6B6B", borderWidth: 1.5 },
  errorText: { color: "#FF6B6B", fontSize: 12, textAlign: "right", marginBottom: 4, marginTop: -2 },
  successBanner: {
    backgroundColor: "#1a5c2e", borderWidth: 1.5, borderColor: C.gold,
    borderRadius: 10, padding: 14, marginBottom: 12,
  },
  successText: { color: C.gold, fontWeight: "700", fontSize: 14, textAlign: "center" },
  errorBanner: {
    backgroundColor: "#3d0000", borderWidth: 1.5, borderColor: "#FF6B6B",
    borderRadius: 10, padding: 14, marginBottom: 12,
  },
  errorBannerText: { color: "#FF6B6B", fontWeight: "700", fontSize: 14, textAlign: "center" },
  loadingOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(19,68,31,0.9)", justifyContent: "center",
    alignItems: "center", zIndex: 999,
  },
  loadingMsg: { color: C.gold, marginTop: 14, fontSize: 16, fontWeight: "700", textAlign: "center" },
});
