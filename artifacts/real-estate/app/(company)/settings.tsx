import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Linking
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import C from "@/constants/colors";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export default function CompanySettingsScreen() {
  const { user, logout } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const handleDeleteData = () => {
    Alert.alert(
      "حذف بيانات الشركة",
      "سيتم حذف جميع إعلانات شركتك وبياناتها نهائياً ولا يمكن التراجع. هل أنت متأكد؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف نهائياً",
          style: "destructive",
          onPress: async () => {
            if (!user?.phone) {
              Alert.alert("تنبيه", "رقم الهاتف غير متوفر، تواصل مع الدعم.");
              return;
            }
            setDeleting(true);
            try {
              const res = await fetch(`${API_BASE}/api/auth/visitor-data`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: user.phone, role: "company" }),
              });
              const data = await res.json();
              if (res.ok && data.success) {
                Alert.alert("تم", "تم حذف جميع بيانات شركتك بنجاح.", [
                  { text: "حسناً", onPress: () => logout() },
                ]);
              } else {
                Alert.alert("خطأ", data.message || "تعذر الحذف، تواصل مع الدعم.");
              }
            } catch {
              Alert.alert("خطأ", "تعذر الاتصال بالخادم.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader title="إعدادات الشركة" showBack />
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.infoBox}>
          <Text style={styles.infoName}>{user?.name}</Text>
          <Text style={styles.infoPhone}>{user?.phone || "لم يُسجَّل رقم هاتف"}</Text>
          <Text style={styles.infoRole}>شركة عقارية</Text>
        </View>

        <View style={styles.divider} />
        <Text style={styles.dangerTitle}>منطقة الخطر</Text>
        <Text style={styles.dangerSub}>
          حذف بيانات الشركة يعني حذف جميع إعلاناتها المنشورة نهائياً.
        </Text>
        <TouchableOpacity
          style={[styles.deleteBtn, deleting && { opacity: 0.6 }]}
          onPress={handleDeleteData}
          disabled={deleting}
          accessibilityRole="button"
          accessibilityLabel="حذف جميع بيانات الشركة نهائياً"
          accessibilityHint="سيتم حذف حساب الشركة وجميع إعلاناتها بشكل دائم"
          accessibilityState={{ disabled: deleting, busy: deleting }}
        >
          {deleting
            ? <ActivityIndicator color={C.error} />
            : <Text style={styles.deleteBtnText}>حذف جميع بيانات الشركة نهائياً 🗑</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={() => logout()} accessibilityRole="button" accessibilityLabel="تسجيل الخروج">
          <Text style={styles.logoutBtnText}>تسجيل الخروج</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgDark },
  scroll: { padding: 20 },

  infoBox: {
    backgroundColor: C.bgLight, borderRadius: 14,
    padding: 20, alignItems: "center", gap: 6,
    borderWidth: 1, borderColor: C.border,
  },
  infoName: { color: "#fff", fontSize: 20, fontWeight: "800" },
  infoPhone: { color: C.gold, fontSize: 15, fontWeight: "600" },
  infoRole: { color: C.textMuted, fontSize: 13 },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 24 },
  dangerTitle: { color: C.error, fontSize: 14, fontWeight: "700", textAlign: "right", marginBottom: 6 },
  dangerSub: { color: C.textMuted, fontSize: 13, textAlign: "right", marginBottom: 14, lineHeight: 20 },

  deleteBtn: {
    backgroundColor: "rgba(220,38,38,0.15)", borderWidth: 1, borderColor: C.error,
    borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 12,
  },
  deleteBtnText: { color: C.error, fontWeight: "700", fontSize: 15 },

  logoutBtn: {
    backgroundColor: C.bgLight, borderRadius: 12,
    paddingVertical: 14, alignItems: "center",
    borderWidth: 1, borderColor: C.border,
  },
  logoutBtnText: { color: C.textMuted, fontWeight: "700", fontSize: 15 },
  legalRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 20, marginBottom: 10 },
  legalLink: { color: C.goldLight, fontSize: 12, textDecorationLine: "underline" },
  legalSep: { color: C.textMuted, fontSize: 12 },
});
