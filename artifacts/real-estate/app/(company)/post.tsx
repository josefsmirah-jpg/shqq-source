import React, { useState, useRef, useCallback, memo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Image, FlatList, Linking,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useCreateListing } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import C from "@/constants/colors";
import { PROPERTY_TYPES, arabicToEnglish } from "@/utils/arabic";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

type FloorRow = { name: string; area: string; price: string };
type AdType = "free" | "paid" | null;
type Screen = "chooseType" | "form" | "pending";

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
          value={row.price} onChangeText={v => onUpdate(index, "price", arabicToEnglish(v))}
          placeholder="---" placeholderTextColor="#C9A02255" keyboardType="numeric"
          textAlign="center" textAlignVertical="center" returnKeyType="next" blurOnSubmit={false}
          onSubmitEditing={() => { if (index < totalRows - 1) focusNext(index + 1, "name"); }} />
        <Text style={styles.unitLabel}>ألف</Text>
      </View>
      <View style={styles.colBorder} />
      <View style={styles.numCellView}>
        <TextInput ref={r => setRef(index, "area", r)} style={styles.numInput}
          value={row.area} onChangeText={v => onUpdate(index, "area", arabicToEnglish(v))}
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

export default function CompanyPostScreen() {
  const { user } = useAuth();
  const createListing = useCreateListing();

  const [screen, setScreen] = useState<Screen>("chooseType");
  const [adType, setAdType] = useState<AdType>(null);
  const [propertyType, setPropertyType] = useState("");
  const [region, setRegion] = useState("");
  const [price, setPrice] = useState("");
  const [floor, setFloor] = useState("");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");
  const [ownerName, setOwnerName] = useState(user?.name || "");
  const [ownerPhone, setOwnerPhone] = useState(user?.phone || "");
  const [mapsLink, setMapsLink] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [floors, setFloors] = useState<FloorRow[]>(makeDefaultFloors());
  const [showTypes, setShowTypes] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [floorError, setFloorError] = useState("");

  const resetForm = () => {
    setPropertyType("");
    setRegion("");
    setPrice("");
    setFloor("");
    setArea("");
    setDescription("");
    setOwnerName(user?.name || "");
    setOwnerPhone(user?.phone || "");
    setMapsLink("");
    setImages([]);
    setFloors(makeDefaultFloors());
    setShowTypes(false);
    setScreen("chooseType");
    setAdType(null);
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
    // عند فراغ السعر/المساحة نستخدم أول طابق مملوء كقيمة بديلة
    const firstFloor = floors.find(f => f.name.trim() && (f.price.trim() || f.area.trim()));
    const priceVal = price.trim() || firstFloor?.price?.trim() || "";
    const areaVal = area.trim() || firstFloor?.area?.trim() || "";
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

    const isLandType = propertyType === "أرض";
    if (!isLandType) {
      const hasValidFloor = floors.some(f => f.name.trim() && f.price.trim() && f.area.trim());
      if (!hasValidFloor) {
        setFloorError("⚠ يرجى إدخال المساحة والسعر لطابق واحد على الأقل");
        return;
      }
    }

    const floorData = floors.filter(f => f.name.trim() && (f.price.trim() || f.area.trim())).map(f => ({
      name: f.name.trim(), area: f.area || undefined, price: f.price || undefined
    }));
    const hasFloors = floorData.length > 0;

    createListing.mutate({ data: {
      region: region.trim(),
      projectName: hasFloors ? region.trim() : undefined,
      propertyType: propertyType || undefined,
      price: price || undefined,
      floor: floor || undefined,
      area: area || undefined,
      description: description || undefined,
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone.trim(),
      mapsLink: mapsLink || undefined,
      createdByRole: "company",
      createdByName: user?.name,
      createdByPhone: user?.phone,
      visitorId: user?.visitorId,
      images: images.length > 0 ? images : undefined,
      floors: hasFloors ? floorData : undefined,
      packageType: adType === "paid" ? "featured" : undefined,
    }}, {
      onSuccess: () => {
        if (adType === "paid") {
          setScreen("pending");
        } else {
          resetForm();
          Alert.alert("تم الإرسال ✅", "سيتم نشر إعلانك بعد المراجعة");
        }
      },
      onError: () => Alert.alert("خطأ", "تعذر إرسال الطلب، حاول مرة أخرى"),
    });
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent("مرحباً، أرسلت طلب إعلان مميز وأريد التواصل لإتمام الإجراءات");
    Linking.openURL(`https://wa.me/962798561011?text=${msg}`);
  };

  if (screen === "pending") {
    return (
      <View style={styles.container}>
        <AppHeader
          title="تم استلام طلبك"
          showBack
          onBack={() => router.back()}
        />
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.cliqCard}>
            <Text style={styles.cliqTitle}>✅ تم إرسال طلبك بنجاح</Text>
            <Text style={styles.cliqSubtitle}>
              تلقّى فريقنا طلب الإعلان المميز، وسيتواصل معك خلال ساعات قليلة لإتمام الإجراءات وتأكيد النشر
            </Text>
            <View style={styles.cliqDivider} />
            <Text style={styles.cliqNote}>
              إذا أردت التسريع، يمكنك التواصل معنا مباشرةً عبر واتساب وسنُعالج طلبك فوراً
            </Text>
            <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsApp}>
              <Text style={styles.whatsappBtnText}>💬 تواصل معنا عبر واتساب</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backBtn} onPress={resetForm}>
              <Text style={styles.backBtnText}>إعلان جديد</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (screen === "chooseType") {
    return (
      <View style={styles.container}>
        <AppHeader title="نوع الإعلان" showBack />
        <View style={styles.chooseContainer}>
          <Text style={styles.chooseTitle}>اختر نوع إعلانك</Text>
          <TouchableOpacity
            style={styles.choiceCard}
            onPress={() => { setAdType("free"); setScreen("form"); }}
          >
            <Text style={styles.choiceIcon}>📋</Text>
            <Text style={styles.choiceTitle}>إعلان مجاني</Text>
            <Text style={styles.choiceDesc}>يظهر بين الإعلانات العادية بعد موافقة المدير</Text>
            <Text style={styles.choicePrice}>مجاني</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.choiceCard, styles.choicePaidCard]}
            onPress={() => { setAdType("paid"); setScreen("form"); }}
          >
            <Text style={styles.choiceIcon}>🚀</Text>
            <Text style={[styles.choiceTitle, { color: C.gold }]}>إعلان مميز</Text>
            <Text style={styles.choiceDesc}>يظهر في أعلى القائمة مع علامة 🚀 ورقم هاتفك على البطاقة</Text>
            <Text style={[styles.choicePrice, { color: C.gold }]}>رسوم إدارية — تواصل مع الفريق</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title={adType === "paid" ? "إعلان مميز 🚀" : "إعلان مجاني 📋"}
        showBack
        right={
          <TouchableOpacity onPress={() => router.replace("/(company)")} style={{ padding: 4 }}>
            <Text style={{ color: C.gold, fontSize: 20, fontWeight: "600" }}>✕</Text>
          </TouchableOpacity>
        }
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
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

        {propertyType === "أرض" ? (
          <>
            <FieldLabel>السعر</FieldLabel>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={v => setPrice(arabicToEnglish(v))}
              placeholder="مثال: 85,000 دينار"
              placeholderTextColor={C.textMuted}
              textAlign="right"
            />
            <FieldLabel>المساحة</FieldLabel>
            <TextInput
              style={styles.input}
              value={area}
              onChangeText={v => setArea(arabicToEnglish(v))}
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

        <FieldLabel>رقم هاتف صاحب العقار *</FieldLabel>
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

        <FieldLabel>رابط الموقع (اختياري)</FieldLabel>
        <TextInput
          style={styles.input}
          value={mapsLink}
          onChangeText={setMapsLink}
          placeholder="https://maps.google.com/..."
          placeholderTextColor={C.textMuted}
          textAlign="right"
          autoCapitalize="none"
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

        {adType === "paid" && (
          <View style={[styles.noteBox, { borderColor: C.gold }]}>
            <Text style={[styles.noteText, { color: C.gold }]}>
              ⭐ الإعلان المميز يشمل رسوماً إدارية — سيتواصل معك فريقنا بعد الإرسال
            </Text>
          </View>
        )}

        <View style={styles.noteBox}>
          <Text style={styles.noteText}>ℹ️ سيتم نشر إعلانك بعد المراجعة</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, createListing.isPending && { opacity: 0.7 }, adType === "paid" && styles.submitBtnPaid]}
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

  chooseContainer: {
    flex: 1, padding: 20, gap: 16, justifyContent: "center",
  },
  chooseTitle: {
    color: C.white, fontSize: 22, fontWeight: "800",
    textAlign: "center", marginBottom: 10,
  },
  choiceCard: {
    backgroundColor: C.card, borderRadius: 14, padding: 20,
    alignItems: "center", borderWidth: 1, borderColor: C.border,
  },
  choicePaidCard: { borderColor: C.gold, borderWidth: 2 },
  choiceIcon: { fontSize: 36, marginBottom: 8 },
  choiceTitle: { color: C.white, fontSize: 18, fontWeight: "700", marginBottom: 6 },
  choiceDesc: { color: C.textMuted, fontSize: 13, textAlign: "center", lineHeight: 20 },
  choicePrice: { color: C.success, fontSize: 15, fontWeight: "700", marginTop: 10 },

  cliqCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 24,
    margin: 16, borderWidth: 2, borderColor: C.gold,
  },
  cliqTitle: { color: C.success, fontSize: 20, fontWeight: "800", textAlign: "center", marginBottom: 6 },
  cliqSubtitle: { color: C.textMuted, fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 16 },
  cliqDivider: { height: 1, backgroundColor: "rgba(201,160,34,0.3)", marginVertical: 12 },
  cliqRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  cliqLabel: { color: C.textMuted, fontSize: 14 },
  cliqValue: { color: C.white, fontSize: 14, fontWeight: "700", textAlign: "right" },
  cliqNote: { color: C.goldLight, fontSize: 13, textAlign: "center", lineHeight: 20, marginVertical: 12 },
  whatsappBtn: {
    backgroundColor: "#25D366", borderRadius: 12, paddingVertical: 14,
    alignItems: "center", marginBottom: 10,
  },
  whatsappBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  backBtn: {
    backgroundColor: C.bgLight, borderRadius: 12, paddingVertical: 12,
    alignItems: "center", borderWidth: 1, borderColor: C.border,
  },
  backBtnText: { color: C.textMuted, fontWeight: "600", fontSize: 14 },

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
    marginTop: 10, borderWidth: 1, borderColor: "rgba(201,160,34,0.3)",
  },
  noteText: { color: C.goldLight, fontSize: 13, textAlign: "right" },
  submitBtn: {
    backgroundColor: C.gold, borderRadius: 12, paddingVertical: 16,
    alignItems: "center", marginTop: 16,
  },
  submitBtnPaid: { backgroundColor: "#C9A022" },
  submitText: { color: C.bgDark, fontWeight: "800", fontSize: 16 },
});
