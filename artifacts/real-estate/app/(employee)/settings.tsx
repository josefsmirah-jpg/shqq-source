import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Linking
} from "react-native";
import { useUpdateEmployee } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import C from "@/constants/colors";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export default function EmployeeSettingsScreen() {
  const { user, updateUser, logout } = useAuth();
  const updateEmployee = useUpdateEmployee();

  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert("تنبيه", "يرجى إدخال الاسم");
      return;
    }
    if (phone.trim() && phone.trim().replace(/[^0-9]/g, "").length < 10) {
      Alert.alert("تنبيه", "رقم الهاتف يجب أن يكون 10 أرقام على الأقل");
      return;
    }
    if (password && password !== confirmPassword) {
      Alert.alert("تنبيه", "كلمة السر غير متطابقة");
      return;
    }
    if (password && password.length < 4) {
      Alert.alert("تنبيه", "كلمة السر يجب أن تكون 4 أحرف على الأقل");
      return;
    }

    const normalizedPhone = phone.trim().replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[^0-9]/g, "");

    const updateData: any = { name: name.trim() };
    if (username.trim()) updateData.username = username.trim();
    if (password.trim()) updateData.password = password.trim();
    updateData.phone = normalizedPhone || undefined;

    updateEmployee.mutate({ id: user!.id as number, data: updateData }, {
      onSuccess: (updated: any) => {
        updateUser({ name: updated?.name || name, username: updated?.username || username, phone: updated?.phone || normalizedPhone || undefined });
        setPassword("");
        setConfirmPassword("");
        Alert.alert("تم ✅", "تم تحديث البيانات بنجاح");
      },
      onError: () => Alert.alert("خطأ", "تعذر التحديث، حاول مرة أخرى"),
    });
  };

  return (
    <View style={styles.container}>
      <AppHeader title="إعدادات الحساب" showBack />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>موظف: {user?.name}</Text>
          <Text style={styles.infoSub}>يمكنك تغيير اسمك ومعلومات تسجيل الدخول هنا</Text>
        </View>

        <FieldLabel>الاسم الكامل</FieldLabel>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="الاسم الكامل"
          placeholderTextColor={C.textMuted}
          textAlign="right"
        />

        <FieldLabel>رقم الهاتف * (مطلوب لإدارة إعلاناتك)</FieldLabel>
        <TextInput
          style={[styles.input, !phone && styles.inputRequired]}
          value={phone}
          onChangeText={setPhone}
          placeholder="07XXXXXXXX"
          placeholderTextColor={C.textMuted}
          textAlign="right"
          keyboardType="phone-pad"
        />
        {!phone && (
          <Text style={styles.phoneWarning}>⚠️ يجب إدخال رقم الهاتف حتى تظهر إعلاناتك</Text>
        )}

        <FieldLabel>اسم المستخدم (Username)</FieldLabel>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="اسم المستخدم"
          placeholderTextColor={C.textMuted}
          textAlign="right"
          autoCapitalize="none"
        />

        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>تغيير كلمة السر</Text>
        <Text style={styles.sectionSub}>اتركها فارغة إذا لا تريد التغيير</Text>

        <FieldLabel>كلمة السر الجديدة</FieldLabel>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="كلمة السر الجديدة"
          placeholderTextColor={C.textMuted}
          textAlign="right"
          secureTextEntry
        />

        <FieldLabel>تأكيد كلمة السر</FieldLabel>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="أعد كتابة كلمة السر"
          placeholderTextColor={C.textMuted}
          textAlign="right"
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.saveBtn, updateEmployee.isPending && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={updateEmployee.isPending}
          accessibilityRole="button"
          accessibilityLabel="حفظ التغييرات"
          accessibilityState={{ disabled: updateEmployee.isPending, busy: updateEmployee.isPending }}
        >
          {updateEmployee.isPending
            ? <ActivityIndicator color={C.bgDark} />
            : <Text style={styles.saveBtnText}>حفظ التغييرات ✅</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => logout()}
          accessibilityRole="button"
          accessibilityLabel="تسجيل الخروج"
        >
          <Text style={styles.logoutBtnText}>تسجيل الخروج</Text>
        </TouchableOpacity>

        <View style={styles.divider} />
        <Text style={styles.dangerTitle}>منطقة الخطر</Text>
        <TouchableOpacity
          style={styles.deleteBtn}
          accessibilityRole="button"
          accessibilityLabel="حذف الحساب نهائياً"
          accessibilityHint="سيتم حذف حسابك وجميع بياناتك بشكل دائم ولا يمكن التراجع"
          onPress={() => {
            Alert.alert(
              "حذف الحساب",
              "هل أنت متأكد من حذف حسابك؟ سيتم حذف جميع بياناتك نهائياً ولا يمكن التراجع.",
              [
                { text: "إلغاء", style: "cancel" },
                {
                  text: "حذف نهائياً",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      const res = await fetch(`${API_BASE}/api/employees/${user!.id}`, { method: "DELETE" });
                      if (res.ok) {
                        Alert.alert("تم", "تم حذف حسابك بنجاح", [
                          { text: "حسناً", onPress: logout }
                        ]);
                      } else {
                        Alert.alert("خطأ", "تعذر حذف الحساب، تواصل مع المدير");
                      }
                    } catch {
                      Alert.alert("خطأ", "تعذر الاتصال بالخادم");
                    }
                  },
                },
              ]
            );
          }}
        >
          <Text style={styles.deleteBtnText}>حذف الحساب نهائياً 🗑</Text>
        </TouchableOpacity>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingBottom: 60 },
  infoBox: {
    backgroundColor: C.card, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: C.border, marginBottom: 16,
  },
  infoText: { color: C.gold, fontSize: 16, fontWeight: "700", textAlign: "right" },
  infoSub: { color: C.textMuted, fontSize: 13, textAlign: "right", marginTop: 4 },
  input: {
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.inputBorder,
    borderRadius: 10, padding: 14, color: C.white, fontSize: 15, marginBottom: 4,
  },
  inputRequired: { borderColor: C.gold, borderWidth: 1.5 },
  phoneWarning: { color: C.gold, fontSize: 12, textAlign: "right", marginBottom: 8 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 16 },
  sectionTitle: { color: C.white, fontSize: 15, fontWeight: "700", textAlign: "right" },
  sectionSub: { color: C.textMuted, fontSize: 12, textAlign: "right", marginTop: 4 },
  saveBtn: {
    backgroundColor: C.gold, borderRadius: 12, paddingVertical: 16,
    alignItems: "center", marginTop: 24,
  },
  saveBtnText: { color: C.bgDark, fontWeight: "800", fontSize: 16 },
  dangerTitle: { color: C.error, fontSize: 14, fontWeight: "700", textAlign: "right", marginBottom: 8 },
  deleteBtn: {
    backgroundColor: "rgba(220,38,38,0.15)", borderWidth: 1, borderColor: C.error,
    borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 20,
  },
  deleteBtnText: { color: C.error, fontWeight: "700", fontSize: 15 },
  logoutBtn: {
    backgroundColor: C.bgLight, borderRadius: 12, paddingVertical: 14,
    alignItems: "center", borderWidth: 1, borderColor: C.border, marginTop: 12,
  },
  logoutBtnText: { color: C.textMuted, fontWeight: "700", fontSize: 15 },
  legalRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 20, marginBottom: 10 },
  legalLink: { color: C.goldLight, fontSize: 12, textDecorationLine: "underline" },
  legalSep: { color: C.textMuted, fontSize: 12 },
});
