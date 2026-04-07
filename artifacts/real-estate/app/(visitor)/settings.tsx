import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import C from "@/constants/colors";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export default function VisitorSettingsScreen() {
  const { user, logout } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const handleDeleteData = () => {
    Alert.alert(
      "حذف بياناتي",
      "سيتم حذف جميع إعلاناتك وبياناتك نهائياً ولا يمكن التراجع. هل أنت متأكد؟",
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
                body: JSON.stringify({ phone: user.phone, role: "visitor" }),
              });
              const data = await res.json();
              if (res.ok && data.success) {
                Alert.alert("تم", "تم حذف جميع بياناتك بنجاح.", [
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
      <AppHeader title="إعداداتي" showBack />
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.infoBox}>
          <Text style={styles.infoName}>{user?.name}</Text>
          <Text style={styles.infoPhone}>{user?.phone || "لم يُسجَّل رقم هاتف"}</Text>
          <Text style={styles.infoRole}>زائر</Text>
        </View>

        <View style={styles.divider} />
        <Text style={styles.dangerTitle}>منطقة الخطر</Text>
        <Text style={styles.dangerSub}>
          حذف بياناتك يعني حذف جميع إعلاناتك المنشورة نهائياً.
        </Text>
        <TouchableOpacity
          style={[styles.deleteBtn, deleting && { opacity: 0.6 }]}
          onPress={handleDeleteData}
          disabled={deleting}
        >
          {deleting
            ? <ActivityIndicator color={C.error} />
            : <Text style={styles.deleteBtnText}>حذف جميع بياناتي نهائياً 🗑</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={() => logout()}>
          <Text style={styles.logoutBtnText}>تسجيل الخروج</Text>
        </TouchableOpacity>

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
});
