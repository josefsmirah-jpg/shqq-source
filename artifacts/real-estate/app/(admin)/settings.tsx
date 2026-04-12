import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Switch, Modal, FlatList, Linking, Platform
} from "react-native";
import { useGetAdminConfig, useUpdateAdminConfig, useGetStats, useResetVisitorCount } from "@workspace/api-client-react";
import AppHeader from "@/components/AppHeader";
import ConfirmModal from "@/components/ConfirmModal";
import { useAuth } from "@/contexts/AuthContext";
import C from "@/constants/colors";
import { FIXED_PHONE } from "@/utils/arabic";

export default function AdminSettingsScreen() {
  const { user, updateUser, logout } = useAuth();
  const { data: config, isLoading } = useGetAdminConfig();
  const updateConfig = useUpdateAdminConfig();
  const { data: stats } = useGetStats();
  const resetCount = useResetVisitorCount();

  const [welcomeText, setWelcomeText] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const [adminName, setAdminName] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showVisitors, setShowVisitors] = useState(false);

  useEffect(() => {
    if (config) {
      setWelcomeText((config as any).welcomeText || "");
      setContactPhone((config as any).contactPhone || FIXED_PHONE);
      setMaintenanceMode((config as any).maintenanceMode || false);
    }
  }, [config]);

  useEffect(() => {
    if (user) {
      setAdminName(user.name || "");
      setAdminUsername((user as any).username || "");
    }
  }, [user]);

  const handleSaveSettings = () => {
    updateConfig.mutate({
      data: { welcomeText, contactPhone, maintenanceMode } as any
    }, {
      onSuccess: () => Alert.alert("تم ✅", "تم حفظ إعدادات التطبيق"),
      onError: () => Alert.alert("خطأ", "تعذر الحفظ"),
    });
  };

  const handleSaveAccount = () => {
    if (!adminName.trim()) {
      Alert.alert("تنبيه", "يرجى إدخال اسم المدير");
      return;
    }
    if (!adminUsername.trim()) {
      Alert.alert("تنبيه", "يرجى إدخال اسم المستخدم");
      return;
    }
    if (adminPassword && adminPassword !== adminPasswordConfirm) {
      Alert.alert("تنبيه", "كلمتا السر غير متطابقتين");
      return;
    }
    if (adminPassword && adminPassword.length < 3) {
      Alert.alert("تنبيه", "كلمة السر يجب أن تكون 3 أحرف على الأقل");
      return;
    }

    const data: any = {
      name: adminName.trim(),
      username: adminUsername.trim(),
    };
    if (adminPassword.trim()) data.password = adminPassword.trim();

    updateConfig.mutate({ data }, {
      onSuccess: () => {
        updateUser({ name: adminName.trim(), username: adminUsername.trim() });
        setAdminPassword("");
        setAdminPasswordConfirm("");
        Alert.alert("تم ✅", "تم تحديث بيانات حساب المدير");
      },
      onError: () => Alert.alert("خطأ", "تعذر التحديث"),
    });
  };

  const handleResetVisitors = () => { setShowResetConfirm(true); };
  const confirmResetVisitors = () => {
    setShowResetConfirm(false);
    resetCount.mutate(undefined, {});
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader title="الإعدادات" showBack />
        <View style={styles.center}><ActivityIndicator size="large" color={C.gold} /></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="الإعدادات" showBack />

      <ConfirmModal
        visible={showResetConfirm}
        title="إعادة تعيين العداد"
        message="هل تريد إعادة تعيين عداد الزوار إلى صفر؟"
        confirmText="تأكيد"
        onConfirm={confirmResetVisitors}
        onCancel={() => setShowResetConfirm(false)}
      />

      <Modal visible={showVisitors} animationType="slide" transparent onRequestClose={() => setShowVisitors(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>👥 قائمة الزوار ({(stats as any)?.visitorData?.length ?? 0})</Text>
            {((stats as any)?.visitorData?.length ?? 0) === 0 ? (
              <Text style={styles.emptyText}>لا يوجد زوار مسجلون</Text>
            ) : (
              <FlatList
                data={((stats as any)?.visitorData ?? []) as { name: string; phone: string }[]}
                keyExtractor={(_, i) => String(i)}
                style={{ maxHeight: 420 }}
                renderItem={({ item, index }) => (
                  <View style={styles.visitorRow}>
                    <Text style={styles.visitorNum}>{index + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.visitorName}>{item.name}</Text>
                      <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.phone}`)}>
                        <Text style={styles.visitorPhone}>{item.phone}</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={styles.waBtn}
                      onPress={() => Linking.openURL(`https://wa.me/962${item.phone.replace(/^0/, "")}`)}>
                      <Text style={styles.waBtnText}>واتساب</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowVisitors(false)}>
              <Text style={styles.closeBtnText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Stats ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 الإحصائيات</Text>
          <View style={styles.statsRow}>
            <TouchableOpacity onPress={() => setShowVisitors(true)} activeOpacity={0.75}>
              <StatCard value={stats?.totalVisitors ?? 0} label="الزوار 👁" highlight />
            </TouchableOpacity>
            <StatCard value={stats?.totalListings ?? 0} label="الإعلانات" />
            <StatCard value={stats?.approvedListings ?? 0} label="معتمد" />
            <StatCard value={stats?.pendingListings ?? 0} label="معلق" />
          </View>
          <TouchableOpacity style={styles.resetBtn} onPress={handleResetVisitors}>
            <Text style={styles.resetBtnText}>🔄 إعادة تعيين عداد الزوار</Text>
          </TouchableOpacity>
        </View>

        {/* ── Admin Account ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 حساب المدير</Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoHint}>
              اليوزر الحالي: <Text style={{ color: C.gold, fontWeight: "700" }}>{(config as any)?.username || "1"}</Text>
            </Text>
          </View>

          <FieldLabel>اسم المدير</FieldLabel>
          <TextInput
            style={styles.input}
            value={adminName}
            onChangeText={setAdminName}
            placeholder="اسم المدير"
            placeholderTextColor={C.textMuted}
            textAlign="right"
          />

          <FieldLabel>اسم المستخدم (Username)</FieldLabel>
          <TextInput
            style={styles.input}
            value={adminUsername}
            onChangeText={setAdminUsername}
            placeholder="اسم المستخدم للدخول"
            placeholderTextColor={C.textMuted}
            textAlign="right"
            autoCapitalize="none"
          />

          <FieldLabel>كلمة السر الجديدة (اتركها فارغة إن لم تريد تغييرها)</FieldLabel>
          <TextInput
            style={styles.input}
            value={adminPassword}
            onChangeText={setAdminPassword}
            placeholder="كلمة السر الجديدة"
            placeholderTextColor={C.textMuted}
            textAlign="right"
            secureTextEntry
          />

          <FieldLabel>تأكيد كلمة السر</FieldLabel>
          <TextInput
            style={styles.input}
            value={adminPasswordConfirm}
            onChangeText={setAdminPasswordConfirm}
            placeholder="أعد كتابة كلمة السر"
            placeholderTextColor={C.textMuted}
            textAlign="right"
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.saveBtn, updateConfig.isPending && { opacity: 0.7 }]}
            onPress={handleSaveAccount}
            disabled={updateConfig.isPending}
          >
            {updateConfig.isPending
              ? <ActivityIndicator color={C.bgDark} />
              : <Text style={styles.saveBtnText}>حفظ بيانات الحساب ✅</Text>}
          </TouchableOpacity>
        </View>

        {/* ── App Settings ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ إعدادات التطبيق</Text>

          <FieldLabel>نص الترحيب</FieldLabel>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={welcomeText}
            onChangeText={setWelcomeText}
            placeholder="نص الترحيب للزوار..."
            placeholderTextColor={C.textMuted}
            textAlign="right"
            multiline
          />

          <FieldLabel>رقم هاتف التواصل</FieldLabel>
          <TextInput
            style={styles.input}
            value={contactPhone}
            onChangeText={setContactPhone}
            placeholder="07XXXXXXXX"
            placeholderTextColor={C.textMuted}
            keyboardType="phone-pad"
            textAlign="right"
          />

          <View style={styles.switchRow}>
            <Switch
              value={maintenanceMode}
              onValueChange={setMaintenanceMode}
              trackColor={{ false: C.border, true: C.warning }}
              thumbColor={C.white}
            />
            <Text style={styles.switchLabel}>وضع الصيانة</Text>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, updateConfig.isPending && { opacity: 0.7 }]}
            onPress={handleSaveSettings}
            disabled={updateConfig.isPending}
          >
            {updateConfig.isPending
              ? <ActivityIndicator color={C.bgDark} />
              : <Text style={styles.saveBtnText}>حفظ إعدادات التطبيق ✅</Text>}
          </TouchableOpacity>
        </View>

        {/* ── Logout & Account Deletion ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔐 الحساب</Text>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => {
              if (Platform.OS === "web") {
                if (window.confirm("هل تريد تسجيل الخروج من حساب المدير؟")) logout().then(() => window.location.reload());
              } else {
                Alert.alert("تسجيل الخروج", "هل تريد تسجيل الخروج من حساب المدير؟", [
                  { text: "إلغاء", style: "cancel" },
                  { text: "خروج", style: "destructive", onPress: () => logout() },
                ]);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="تسجيل الخروج"
          >
            <Text style={styles.logoutBtnText}>تسجيل الخروج</Text>
          </TouchableOpacity>

          <View style={{ height: 12 }} />
          <Text style={styles.dangerZoneTitle}>منطقة الخطر</Text>
          <TouchableOpacity
            style={styles.deleteBtn}
            accessibilityRole="button"
            accessibilityLabel="حذف حساب المدير نهائياً"
            accessibilityHint="لحذف حساب المدير، تواصل مع فريق الدعم الفني"
            onPress={() =>
              Alert.alert(
                "حذف حساب المدير",
                "لحذف حساب المدير نهائياً، يرجى التواصل مع فريق الدعم الفني عبر البريد الإلكتروني.",
                [
                  { text: "إلغاء", style: "cancel" },
                  { text: "تواصل مع الدعم", onPress: () => Linking.openURL("mailto:josefsmirah@gmail.com?subject=طلب%20حذف%20حساب%20المدير") },
                ]
              )
            }
          >
            <Text style={styles.deleteBtnText}>حذف الحساب نهائياً 🗑</Text>
          </TouchableOpacity>
        </View>

        {/* ── Legal ── */}
        <View style={styles.legalRow}>
          <TouchableOpacity onPress={() => Linking.openURL(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/privacy`)} accessibilityRole="link" accessibilityLabel="سياسة الخصوصية">
            <Text style={styles.legalLink}>سياسة الخصوصية</Text>
          </TouchableOpacity>
          <Text style={styles.legalSep}> · </Text>
          <TouchableOpacity onPress={() => Linking.openURL(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/terms`)} accessibilityRole="link" accessibilityLabel="شروط الاستخدام">
            <Text style={styles.legalLink}>شروط الاستخدام</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
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

function StatCard({ value, label, highlight }: { value: number; label: string; highlight?: boolean }) {
  return (
    <View style={{ flex: 1, backgroundColor: highlight ? "rgba(201,160,34,0.15)" : C.card, borderRadius: 10, padding: 12, alignItems: "center", borderWidth: 1, borderColor: highlight ? C.gold : C.border }}>
      <Text style={{ color: highlight ? C.gold : C.white, fontSize: 20, fontWeight: "800" }}>{value}</Text>
      <Text style={{ color: highlight ? C.gold : C.textMuted, fontSize: 11, textAlign: "center" }}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
      <Text style={{ color: C.textMuted, fontSize: 13 }}>{value}</Text>
      <Text style={{ color: C.gold, fontSize: 13, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 50 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", padding: 16 },
  modalBox: { backgroundColor: C.bgDark, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.gold },
  modalTitle: { color: C.gold, fontSize: 16, fontWeight: "700", textAlign: "center", marginBottom: 12 },
  emptyText: { color: C.textMuted, textAlign: "center", paddingVertical: 20, fontSize: 14 },
  visitorRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  visitorNum: { color: C.textMuted, fontSize: 12, width: 22, textAlign: "center" },
  visitorName: { color: C.white, fontSize: 14, fontWeight: "600", textAlign: "right" },
  visitorPhone: { color: C.gold, fontSize: 13, textAlign: "right" },
  waBtn: { backgroundColor: "rgba(37,211,102,0.2)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "#25D166" },
  waBtnText: { color: "#25D166", fontSize: 11, fontWeight: "600" },
  closeBtn: { marginTop: 14, backgroundColor: C.bgLight, borderRadius: 10, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: C.border },
  closeBtnText: { color: C.textMuted, fontSize: 14 },
  section: { marginBottom: 20, backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border },
  sectionTitle: { color: C.gold, fontSize: 15, fontWeight: "700", textAlign: "right", marginBottom: 12 },
  statsRow: { flexDirection: "row", gap: 8 },
  resetBtn: { marginTop: 10, backgroundColor: "rgba(217,119,6,0.2)", borderRadius: 8, paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: C.warning },
  resetBtnText: { color: C.warning, fontSize: 14 },
  infoCard: { borderRadius: 10, padding: 4 },
  infoBox: { backgroundColor: C.bgDark, borderRadius: 8, padding: 10, marginBottom: 4 },
  infoHint: { color: C.textMuted, fontSize: 13, textAlign: "right" },
  input: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.inputBorder, borderRadius: 10, padding: 14, color: C.white, fontSize: 15 },
  textArea: { height: 80, textAlignVertical: "top" },
  switchRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 12 },
  switchLabel: { color: C.white, fontSize: 14 },
  saveBtn: { marginTop: 16, backgroundColor: C.gold, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { color: C.bgDark, fontWeight: "800", fontSize: 15 },
  logoutBtn: {
    backgroundColor: C.bgDark, borderRadius: 12, paddingVertical: 13,
    alignItems: "center", borderWidth: 1, borderColor: C.border,
  },
  logoutBtnText: { color: C.textMuted, fontWeight: "700", fontSize: 14 },
  dangerZoneTitle: { color: C.error, fontSize: 13, fontWeight: "700", textAlign: "right", marginBottom: 8 },
  deleteBtn: {
    backgroundColor: "rgba(220,38,38,0.12)", borderWidth: 1, borderColor: C.error,
    borderRadius: 12, paddingVertical: 13, alignItems: "center",
  },
  deleteBtnText: { color: C.error, fontWeight: "700", fontSize: 14 },
  legalRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 20, marginTop: 4 },
  legalLink: { color: C.goldLight, fontSize: 12, textDecorationLine: "underline" },
  legalSep: { color: C.textMuted, fontSize: 12 },
});
