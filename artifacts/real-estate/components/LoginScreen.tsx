import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Linking
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useVisitorLogin, useStaffLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { arabicToEnglish } from "@/utils/arabic";
import C from "@/constants/colors";

function generateId(): string {
  try { return crypto.randomUUID(); } catch {}
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

async function getOrCreateVisitorId(): Promise<string> {
  const key = "visitor_device_id";
  const existing = await AsyncStorage.getItem(key);
  if (existing) return existing;
  const id = generateId();
  await AsyncStorage.setItem(key, id);
  return id;
}

type TabType = "visitor" | "company" | "employee" | "admin";

export function LoginScreen({ onClose }: { onClose?: () => void }) {
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("visitor");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [tapCount, setTapCount] = useState(0);
  const [showEmployee, setShowEmployee] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  const visitorLoginMutation = useVisitorLogin();
  const staffLoginMutation = useStaffLogin();

  const handleLogoTap = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);
    if (newCount === 5) {
      setShowEmployee(true);
      setShowAdmin(false);
      setActiveTab("employee");
    } else if (newCount === 7) {
      setShowAdmin(true);
      setActiveTab("admin");
    } else if (newCount >= 10) {
      setTapCount(0);
      setShowEmployee(false);
      setShowAdmin(false);
      setActiveTab("visitor");
    }
  };

  const handleGuestBrowse = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose?.();
  };

  const handleVisitorLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const normalizedPhone = arabicToEnglish(phone).replace(/[^0-9]/g, "");
    if (!name.trim()) { Alert.alert("تنبيه", "يرجى إدخال الاسم"); return; }
    if (normalizedPhone.length < 10) {
      Alert.alert("تنبيه", "رقم الهاتف يجب أن يكون 10 خانات على الأقل");
      return;
    }
    const visitorId = await getOrCreateVisitorId();
    visitorLoginMutation.mutate(
      { data: { name: name.trim(), phone: normalizedPhone, role: activeTab as "visitor" | "company", visitorId: visitorId || undefined } },
      {
        onSuccess: async (data) => {
          if (data.success) {
            const loginData: any = { role: data.role as any, name: data.name || name, phone: normalizedPhone };
            if (["visitor", "company"].includes(data.role as any)) loginData.visitorId = visitorId;
            await login(loginData);
            onClose?.();
          } else {
            Alert.alert("خطأ", data.message || "فشل تسجيل الدخول");
          }
        },
        onError: () => Alert.alert("خطأ", "تعذر الاتصال بالخادم"),
      }
    );
  };

  const handleStaffLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!username.trim() || !password.trim()) {
      Alert.alert("تنبيه", "يرجى إدخال اسم المستخدم وكلمة المرور");
      return;
    }
    staffLoginMutation.mutate(
      { data: { username: username.trim(), password: password.trim(), role: activeTab as "employee" | "admin" } },
      {
        onSuccess: async (data) => {
          if (data.success) {
            await login({ role: data.role as any, name: data.name || username, id: data.id, phone: (data as any).phone });
            onClose?.();
          } else {
            Alert.alert("خطأ", data.message || "اسم المستخدم أو كلمة المرور غير صحيحة");
          }
        },
        onError: (err: any) => {
          const msg = err?.data?.message || err?.message?.includes("401")
            ? "اسم المستخدم أو كلمة المرور غير صحيحة"
            : "تعذر الاتصال بالخادم";
          Alert.alert("خطأ", msg);
        },
      }
    );
  };

  const isLoading2 = visitorLoginMutation.isPending || staffLoginMutation.isPending;
  const isStaff = activeTab === "employee" || activeTab === "admin";

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {onClose && (
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="إغلاق"
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleLogoTap} activeOpacity={0.9} style={styles.logoContainer} accessibilityLabel="شعار التطبيق" accessibilityRole="image">
            <Image source={require("@/assets/images/logo.jpeg")} style={styles.logo} resizeMode="contain" />
            <Text style={styles.appName}>شقق وأراضي المستقبل</Text>
          </TouchableOpacity>

          <View style={styles.tabsRow}>
            <TabBtn label="زائر" active={activeTab === "visitor"} onPress={() => setActiveTab("visitor")} />
            <TabBtn label="شركة" active={activeTab === "company"} onPress={() => setActiveTab("company")} />
            {showEmployee && !showAdmin && (
              <TabBtn label="موظف" active={activeTab === "employee"} onPress={() => setActiveTab("employee")} />
            )}
            {showAdmin && (
              <TabBtn label="مدير" active={activeTab === "admin"} onPress={() => setActiveTab("admin")} />
            )}
          </View>

          <View style={styles.form}>
            {!isStaff ? (
              <>
                <Text style={styles.sectionTitle}>أنشئ حساب</Text>
                <Text style={styles.label}>الاسم الكامل</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="أدخل اسمك الكامل"
                  placeholderTextColor={C.textMuted}
                  textAlign="right"
                  accessibilityLabel="الاسم الكامل"
                  accessibilityHint="أدخل اسمك الكامل"
                />
                <Text style={styles.label}>رقم الهاتف</Text>
                <View style={styles.phoneBox}>
                  <TextInput
                    style={styles.phoneInput}
                    value={phone}
                    onChangeText={v => setPhone(arabicToEnglish(v))}
                    onBlur={() => setPhone(prev => arabicToEnglish(prev))}
                    placeholder="07XXXXXXXX"
                    placeholderTextColor={C.textMuted}
                    keyboardType="phone-pad"
                    textAlign="right"
                    autoCorrect={false}
                    autoComplete="tel"
                    accessibilityLabel="رقم الهاتف"
                    accessibilityHint="أدخل رقم هاتفك المكون من 10 أرقام على الأقل"
                  />
                  <View style={styles.phoneHintBox}>
                    <Text style={styles.phoneHint}>⚠️ يجب أن لا يقل رقم الهاتف عن ١٠ أرقام</Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.label}>اسم المستخدم</Text>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="اسم المستخدم"
                  placeholderTextColor={C.textMuted}
                  textAlign="right"
                  autoCapitalize="none"
                  accessibilityLabel="اسم المستخدم"
                />
                <Text style={styles.label}>كلمة المرور</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={C.textMuted}
                  secureTextEntry
                  textAlign="right"
                  accessibilityLabel="كلمة المرور"
                />
              </>
            )}

            {!isStaff && (
              <Text style={styles.consentText}>
                بالمتابعة، أنت توافق على{" "}
                <Text
                  style={styles.consentLink}
                  onPress={() => Linking.openURL(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/privacy`)}
                  accessibilityRole="link"
                  accessibilityLabel="سياسة الخصوصية"
                >
                  سياسة الخصوصية
                </Text>
                {" "}وجمع البيانات اللازمة لتقديم الخدمة
              </Text>
            )}

            <TouchableOpacity
              style={[styles.loginBtn, isLoading2 && { opacity: 0.7 }]}
              onPress={isStaff ? handleStaffLogin : handleVisitorLogin}
              disabled={isLoading2}
              accessibilityRole="button"
              accessibilityLabel={
                activeTab === "visitor" ? "دخول كزائر" :
                activeTab === "company" ? "دخول كشركة" :
                activeTab === "employee" ? "دخول كموظف" : "دخول كمدير"
              }
              accessibilityState={{ disabled: isLoading2, busy: isLoading2 }}
            >
              {isLoading2 ? (
                <ActivityIndicator color={C.bgDark} />
              ) : (
                <Text style={styles.loginBtnText}>
                  {activeTab === "visitor" ? "دخول كزائر" :
                   activeTab === "company" ? "دخول كشركة" :
                   activeTab === "employee" ? "دخول كموظف" : "دخول كمدير"}
                </Text>
              )}
            </TouchableOpacity>

            {activeTab === "visitor" && (
              <TouchableOpacity
                style={styles.guestBtn}
                onPress={handleGuestBrowse}
                accessibilityRole="button"
                accessibilityLabel="تصفح التطبيق بدون تسجيل دخول"
              >
                <Text style={styles.guestBtnText}>تصفح بدون تسجيل</Text>
              </TouchableOpacity>
            )}

            <View style={styles.legalRow}>
              <TouchableOpacity
                onPress={() => Linking.openURL(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/privacy`)}
                accessibilityRole="link"
                accessibilityLabel="سياسة الخصوصية"
              >
                <Text style={styles.legalLink}>سياسة الخصوصية</Text>
              </TouchableOpacity>
              <Text style={styles.legalSep}> · </Text>
              <TouchableOpacity
                onPress={() => Linking.openURL(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/terms`)}
                accessibilityRole="link"
                accessibilityLabel="شروط الاستخدام"
              >
                <Text style={styles.legalLink}>شروط الاستخدام</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.tab, active && styles.tabActive]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bgDark },
  scroll: { flexGrow: 1, alignItems: "center", paddingHorizontal: 24, paddingBottom: 40 },
  closeBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  closeBtnText: { color: C.textMuted, fontSize: 20, fontWeight: "600" },
  logoContainer: { alignItems: "center", marginTop: 30, marginBottom: 24 },
  logo: { width: 160, height: 120 },
  appName: { fontSize: 16, color: C.gold, marginTop: 10, fontWeight: "800", textAlign: "center" },
  tabsRow: { flexDirection: "row", backgroundColor: C.card, borderRadius: 12, padding: 4, marginBottom: 24, gap: 4 },
  tab: { flex: 1, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: "center" },
  tabActive: { backgroundColor: C.gold },
  tabText: { color: C.textMuted, fontSize: 14, fontWeight: "600" },
  tabTextActive: { color: C.bgDark },
  form: { width: "100%", gap: 8 },
  sectionTitle: { color: C.white, fontSize: 18, fontWeight: "800", textAlign: "right", marginBottom: 4, marginTop: 4 },
  label: { color: C.gold, fontSize: 14, fontWeight: "600", textAlign: "right" },
  input: {
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.inputBorder,
    borderRadius: 10, padding: 14, color: C.white, fontSize: 15,
    textAlign: "right", marginBottom: 8,
  },
  phoneBox: {
    borderWidth: 1, borderColor: C.inputBorder,
    borderRadius: 10, overflow: "hidden", marginBottom: 8,
  },
  phoneInput: {
    backgroundColor: C.inputBg, padding: 14, color: C.white,
    fontSize: 15, textAlign: "right",
  },
  phoneHintBox: {
    backgroundColor: "rgba(201,160,34,0.12)",
    paddingHorizontal: 14, paddingVertical: 7,
    borderTopWidth: 1, borderTopColor: "rgba(201,160,34,0.25)",
  },
  phoneHint: { color: C.goldLight, fontSize: 12, textAlign: "right" },
  loginBtn: {
    backgroundColor: C.gold, borderRadius: 12, paddingVertical: 16,
    alignItems: "center", marginTop: 8,
  },
  loginBtnText: { color: C.bgDark, fontSize: 16, fontWeight: "800" },
  guestBtn: {
    borderWidth: 1, borderColor: C.goldLight, borderRadius: 12,
    paddingVertical: 13, alignItems: "center", marginTop: 10,
  },
  guestBtnText: { color: C.goldLight, fontSize: 14, fontWeight: "600" },
  legalRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 16 },
  legalLink: { color: C.goldLight, fontSize: 12, textDecorationLine: "underline" },
  legalSep: { color: C.textMuted, fontSize: 12 },
  consentText: {
    color: C.textMuted, fontSize: 12, textAlign: "center",
    lineHeight: 18, marginTop: 6, paddingHorizontal: 8,
  },
  consentLink: { color: C.goldLight, textDecorationLine: "underline" },
});
