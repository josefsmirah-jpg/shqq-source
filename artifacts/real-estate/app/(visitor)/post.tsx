import React, { useState, useRef, useCallback, memo, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Image, FlatList,
  KeyboardAvoidingView, Platform
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useCreateListing } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginModal } from "@/app/_layout";
import AppHeader from "@/components/AppHeader";
import C from "@/constants/colors";
import { PROPERTY_TYPES, arabicToEnglish } from "@/utils/arabic";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

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
  row: FloorRow;
  index: number;
  isAlt: boolean;
  totalRows: number;
  onUpdate: (index: number, field: keyof FloorRow, value: string) => void;
  onRemove: (index: number) => void;
  setRef: (index: number, col: string, ref: TextInput | null) => void;
  focusNext: (index: number, col: "price" | "area" | "name") => void;
};

const FloorRowItem = memo(
  ({ row, index, isAlt, totalRows, onUpdate, onRemove, setRef, focusNext }: FloorRowItemProps) => (
    <View style={[styles.tableRow, isAlt && styles.tableRowAlt]}>
      <View style={styles.numCellView}>
        <TextInput
          ref={r => setRef(index, "price", r)}
          style={styles.numInput}
          value={row.price}
          onChangeText={v => onUpdate(index, "price", arabicToEnglish(v))}
          placeholder="---"
          placeholderTextColor="#C9A02255"
          keyboardType="numeric"
          textAlign="center"
          textAlignVertical="center"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => {
            if (index < totalRows - 1) focusNext(index + 1, "name");
          }}
        />
        <Text style={styles.unitLabel}>ألف</Text>
      </View>
      <View style={styles.colBorder} />
      <View style={styles.numCellView}>
        <TextInput
          ref={r => setRef(index, "area", r)}
          style={styles.numInput}
          value={row.area}
          onChangeText={v => onUpdate(index, "area", arabicToEnglish(v))}
          placeholder="---"
          placeholderTextColor="#C9A02255"
          keyboardType="numeric"
          textAlign="center"
          textAlignVertical="center"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => focusNext(index, "price")}
        />
        <Text style={styles.unitLabel}>م²</Text>
      </View>
      <View style={styles.colBorder} />
      <View style={styles.nameCellView}>
        <TextInput
          ref={r => setRef(index, "name", r)}
          style={styles.nameInput}
          value={row.name}
          onChangeText={v => onUpdate(index, "name", v)}
          placeholder="---"
          placeholderTextColor="#C9A02255"
          textAlign="right"
          textAlignVertical="center"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => focusNext(index, "area")}
        />
        <TouchableOpacity style={styles.trashBtn} onPress={() => onRemove(index)}>
          <Text style={styles.trashIcon}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  ),
  (prev, next) =>
    prev.row === next.row &&
    prev.isAlt === next.isAlt &&
    prev.totalRows === next.totalRows
);

export default function VisitorPostScreen() {
  const { user, isGuest } = useAuth();
  const { openLoginModal } = useLoginModal();
  const createListing = useCreateListing();

  useEffect(() => {
    if (isGuest) {
      router.back();
      openLoginModal();
    }
  }, [isGuest]);

  const [propertyType, setPropertyType] = useState("");
  const [region, setRegion] = useState("");
  const [description, setDescription] = useState("");
  const [ownerName, setOwnerName] = useState(user?.name || "");
  const [ownerPhone, setOwnerPhone] = useState(user?.phone || "");
  const [images, setImages] = useState<string[]>([]);
  const [floors, setFloors] = useState<FloorRow[]>(makeDefaultFloors());
  const [landArea, setLandArea] = useState("");
  const [landPrice, setLandPrice] = useState("");
  const [showTypes, setShowTypes] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [floorError, setFloorError] = useState("");

  const resetForm = () => {
    setPropertyType("");
    setRegion("");
    setDescription("");
    setOwnerName(user?.name || "");
    setOwnerPhone(user?.phone || "");
    setImages([]);
    setFloors(makeDefaultFloors());
    setLandArea("");
    setLandPrice("");
    setShowTypes(false);
  };

  const cellRefs = useRef<{[key: string]: TextInput | null}>({});
  const floorsLenRef = useRef(floors.length);
  floorsLenRef.current = floors.length;

  const setRef = useCallback((row: number, col: string, ref: TextInput | null) => {
    cellRefs.current[`${row}-${col}`] = ref;
  }, []);

  const focusNext = useCallback((row: number, col: "price" | "area" | "name") => {
    cellRefs.current[`${row}-${col}`]?.focus();
  }, []);

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
    if (images.length >= 10) { Alert.alert("تنبيه", "الحد الأقصى ١٠ صور"); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("تنبيه", "يرجى السماح بالوصول للصور"); return; }
    setUploading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.5,
        base64: true,
        selectionLimit: 10 - images.length,
        maxWidth: 1200,
        maxHeight: 1200,
      });
      if (!result.canceled && result.assets) {
        const newImgs = result.assets.filter(a => !!a.base64).map(a => `data:image/jpeg;base64,${a.base64}`);
        if (newImgs.length > 0) setImages(prev => [...prev, ...newImgs].slice(0, 10));
        else Alert.alert("تنبيه", "تعذر تحميل الصور، حاول مرة أخرى");
      }
    } catch (_e) { Alert.alert("خطأ", "تعذر فتح معرض الصور"); }
    finally { setUploading(false); }
  };

  const takePhoto = async () => {
    if (images.length >= 10) { Alert.alert("تنبيه", "الحد الأقصى ١٠ صور"); return; }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") { Alert.alert("تنبيه", "يرجى السماح للتطبيق باستخدام الكاميرا من إعدادات الجهاز"); return; }
    setUploading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.5, base64: true, maxWidth: 1200, maxHeight: 1200 });
      if (!result.canceled && result.assets?.[0]?.base64) {
        setImages(prev => [...prev, `data:image/jpeg;base64,${result.assets[0].base64}`].slice(0, 10));
      } else if (!result.canceled) {
        Alert.alert("تنبيه", "تعذر تحميل الصورة، حاول مرة أخرى");
      }
    } catch (_e) { Alert.alert("خطأ", "تعذر فتح الكاميرا"); }
    finally { setUploading(false); }
  };

  const showPhotoOptions = () => {
    if (images.length >= 10) { Alert.alert("تنبيه", "الحد الأقصى ١٠ صور"); return; }
    if (Platform.OS === "web") { pickImage(); return; }
    Alert.alert("إضافة صورة", "اختر طريقة الإضافة", [
      { text: "📷 التقاط صورة", onPress: takePhoto },
      { text: "🖼 اختيار من المعرض", onPress: pickImage },
      { text: "إلغاء", style: "cancel" },
    ]);
  };

  const handleSubmit = async () => {
    setFloorError("");
    if (!region.trim()) { Alert.alert("تنبيه", "يرجى إدخال المنطقة"); return; }
    if (!ownerName.trim() || !ownerPhone.trim()) { Alert.alert("تنبيه", "يرجى إدخال بيانات التواصل"); return; }

    // فحص التكرار — الهاتف + المنطقة + السعر + المساحة كلهم مطابقون
    // landPrice/landArea للأرض، وأول طابق مملوء للشقق
    const firstFloor = floors.find(f => f.name.trim() && (f.price.trim() || f.area.trim()));
    const priceVal = landPrice.trim() || firstFloor?.price?.trim() || "";
    const areaVal = landArea.trim() || firstFloor?.area?.trim() || "";
    if (priceVal && areaVal) {
      try {
        const params = new URLSearchParams({
          phone: ownerPhone.trim(),
          region: region.trim(),
          price: priceVal,
          area: areaVal,
        });
        const res = await fetch(`${API_BASE}/api/listings/check-duplicate?${params}`);
        const { isDuplicate } = await res.json();
        if (isDuplicate) {
          Alert.alert("إعلان مكرر ⚠️", "لديك إعلان مسجّل بنفس المنطقة والسعر والمساحة. لا يمكن إرسال إعلان مكرر.");
          return;
        }
      } catch {}
    }

    const isLand = propertyType === "أرض";
    if (!isLand) {
      const hasValidFloor = floors.some(f => f.name.trim() && f.price.trim() && f.area.trim());
      if (!hasValidFloor) {
        setFloorError("⚠ يرجى إدخال المساحة والسعر لطابق واحد على الأقل");
        return;
      }
    }

    const floorData = floors.filter(f => f.name.trim() && (f.price.trim() || f.area.trim())).map(f => ({
      name: f.name.trim(), area: f.area || undefined, price: f.price || undefined
    }));

    createListing.mutate({ data: {
      region: region.trim(),
      propertyType: propertyType || undefined,
      description: description || undefined,
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone.trim(),
      createdByRole: "visitor",
      createdByName: user?.name,
      createdByPhone: user?.phone,
      visitorId: user?.visitorId,
      images: images.length > 0 ? images : undefined,
      floors: floorData.length > 0 ? floorData : undefined,
      area: propertyType === "أرض" && landArea.trim() ? landArea.trim() : undefined,
      price: propertyType === "أرض" && landPrice.trim() ? landPrice.trim() : undefined,
    }}, {
      onSuccess: () => {
        resetForm();
        Alert.alert("تم الإرسال ✅", "سيتم نشر إعلانك بعد المراجعة");
      },
      onError: () => Alert.alert("خطأ", "تعذر إرسال الطلب، حاول مرة أخرى"),
    });
  };

  if (isGuest) {
    return (
      <View style={styles.container}>
        <AppHeader title="نشر إعلان" showBack />
        <View style={styles.guestPrompt}>
          <Text style={styles.guestPromptTitle}>تسجيل الدخول مطلوب</Text>
          <Text style={styles.guestPromptSub}>
            يجب تسجيل الدخول لتتمكن من نشر إعلانك
          </Text>
          <TouchableOpacity
            style={styles.guestLoginBtn}
            onPress={openLoginModal}
            accessibilityRole="button"
            accessibilityLabel="تسجيل الدخول"
          >
            <Text style={styles.guestLoginBtnText}>تسجيل الدخول</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="اعرض عقارك"
        showBack
        right={
          <TouchableOpacity onPress={() => router.replace("/(visitor)")} style={{ padding: 4 }}>
            <Text style={{ color: C.gold, fontSize: 20, fontWeight: "600" }}>✕</Text>
          </TouchableOpacity>
        }
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

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
          style={styles.input}
          value={region}
          onChangeText={setRegion}
          placeholder="مثال: شفا بدران - الياسمين"
          placeholderTextColor={C.textMuted}
          textAlign="right"
        />

        {propertyType === "أرض" && (
          <>
            <FieldLabel>مساحة الأرض</FieldLabel>
            <TextInput
              style={styles.input}
              value={landArea}
              onChangeText={v => setLandArea(arabicToEnglish(v))}
              placeholder="مثال: 500 م²"
              placeholderTextColor={C.textMuted}
              textAlign="right"
              keyboardType="numeric"
            />
            <FieldLabel>سعر الأرض</FieldLabel>
            <TextInput
              style={styles.input}
              value={landPrice}
              onChangeText={v => setLandPrice(arabicToEnglish(v))}
              placeholder="مثال: 150,000 د.أ"
              placeholderTextColor={C.textMuted}
              textAlign="right"
              keyboardType="numeric"
            />
          </>
        )}

        {propertyType !== "أرض" && (
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
            {!!floorError && (
              <Text style={{ color: "#FF6B6B", fontSize: 12, textAlign: "right", marginTop: 4 }}>{floorError}</Text>
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
          style={styles.input}
          value={ownerName}
          onChangeText={setOwnerName}
          placeholder="الاسم الكامل"
          placeholderTextColor={C.textMuted}
          textAlign="right"
        />

        <FieldLabel>هاتف صاحب العقار *</FieldLabel>
        <TextInput
          style={styles.input}
          value={ownerPhone}
          onChangeText={v => setOwnerPhone(arabicToEnglish(v))}
          onBlur={() => setOwnerPhone(prev => arabicToEnglish(prev))}
          placeholder="07XXXXXXXX"
          placeholderTextColor={C.textMuted}
          keyboardType="phone-pad"
          textAlign="right"
        />

        <FieldLabel>صور العقار</FieldLabel>
        <FlatList
          horizontal
          data={images}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item, index }) => (
            <View style={styles.photoWrapper}>
              <Image source={{ uri: item }} style={styles.photo} />
              <TouchableOpacity style={styles.removePhoto} onPress={() => setImages(p => p.filter((_, i) => i !== index))}>
                <Text style={styles.removePhotoText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          ListFooterComponent={images.length < 10 ? (
            <TouchableOpacity style={styles.addPhotoBtn} onPress={showPhotoOptions} disabled={uploading}>
              {uploading ? <ActivityIndicator color={C.gold} /> : <Text style={styles.addPhotoText}>+ صورة</Text>}
            </TouchableOpacity>
          ) : null}
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 8 }}
        />

        <View style={styles.noteBox}>
          <Text style={styles.noteText}>ℹ️ سيتم نشر إعلانك بعد المراجعة</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, createListing.isPending && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={createListing.isPending}
        >
          {createListing.isPending
            ? <ActivityIndicator color={C.bgDark} />
            : <Text style={styles.submitText}>نشر الإعلان 📤</Text>
          }
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
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
  guestPrompt: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 32, gap: 16,
  },
  guestPromptTitle: { color: C.gold, fontSize: 20, fontWeight: "800", textAlign: "center" },
  guestPromptSub: { color: C.textMuted, fontSize: 15, textAlign: "center", lineHeight: 24 },
  guestLoginBtn: {
    backgroundColor: C.gold, borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 40,
    alignItems: "center", marginTop: 8,
  },
  guestLoginBtnText: { color: "#1a1a1a", fontSize: 16, fontWeight: "800" },
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
    textAlignVertical: "center", paddingVertical: 16, paddingHorizontal: 8,
    minHeight: 54,
  },
  numInput: {
    flex: 1, color: GOLD, fontSize: 14, fontWeight: "700",
    textAlign: "center", textAlignVertical: "center",
    paddingVertical: 16, paddingHorizontal: 4,
    minHeight: 54,
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
    marginTop: 16, borderWidth: 1, borderColor: "rgba(201,160,34,0.3)",
  },
  noteText: { color: C.goldLight, fontSize: 13, textAlign: "right" },
  submitBtn: {
    backgroundColor: C.gold, borderRadius: 12, paddingVertical: 16,
    alignItems: "center", marginTop: 16,
  },
  submitText: { color: C.bgDark, fontWeight: "800", fontSize: 16 },
});
