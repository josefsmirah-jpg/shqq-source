import React, { useState, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, ActivityIndicator, Image,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGetListings, useDeleteListing } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import ListingCard from "@/components/ListingCard";
import WalletBar from "@/components/WalletBar";
import C from "@/constants/colors";
import { setListingsForViewer } from "@/utils/listingsStore";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

type Tab = "approved" | "pending" | "rejected" | "deleted";

const TABS: { key: Tab; label: string; color: string; icon: string }[] = [
  { key: "approved", label: "معتمد",  color: C.success,  icon: "✅" },
  { key: "pending",  label: "معلق",   color: C.gold,     icon: "⏳" },
  { key: "rejected", label: "مرفوض",  color: C.error,    icon: "❌" },
  { key: "deleted",  label: "محذوف",  color: "#888",     icon: "🗑️" },
];

export default function EmployeeHomeScreen() {
  const { user, logout, updateUser } = useAuth();
  const [tab, setTab] = useState<Tab>("approved");
  const deleteMutation = useDeleteListing();

  // ── جلب phone تلقائياً إذا كانت الجلسة القديمة لا تحتويه ──────────────
  useEffect(() => {
    if (user?.role === "employee" && !user?.phone && user?.id) {
      fetch(`${BASE_URL}/api/employees/${user.id}`)
        .then(r => r.ok ? r.json() : null)
        .then(emp => { if (emp?.phone) updateUser({ phone: emp.phone }); })
        .catch(() => {});
    }
  }, [user?.id, user?.phone, user?.role]);

  const { data: listings = [], isLoading: listLoading, refetch, isRefetching } = useGetListings(
    { createdByPhone: user?.phone || "", role: "employee" },
    { query: { enabled: !!user?.phone } as any }
  );

  const filtered = listings.filter(l => l.status === tab);

  if (!user) return null;

  const handleDelete = (id: number) => {
    Alert.alert("حذف", "هل أنت متأكد من حذف هذا الإعلان؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف", style: "destructive",
        onPress: () => deleteMutation.mutate({ id }, {
          onSuccess: () => refetch(),
          onError: () => Alert.alert("خطأ", "تعذر الحذف"),
        })
      }
    ]);
  };

  const openCard = (index: number) => {
    setListingsForViewer(filtered as any[], index);
    router.push("/(employee)/cards");
  };

  const handleLogout = () => {
    logout();
  };

  const countOf  = (key: Tab) => listings.filter(l => l.status === key).length;
  const pendingCount  = countOf("pending");
  const deletedCount  = countOf("deleted");
  const approvedCount = countOf("approved");

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: C.bgDark }}>
        {/* ─── هيدر ─── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleLogout} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.logoutText}>خروج</Text>
          </TouchableOpacity>

          <View style={styles.headerTitleRow}>
            <Image
              source={require("@/assets/images/logo.jpeg")}
              style={styles.headerLogoSmall}
              resizeMode="contain"
            />
            <Text style={styles.headerTitle}>شقق وأراضي المستقبل</Text>
          </View>

          {/* بادجات الإشعارات — يمين الهيدر */}
          <View style={styles.badgesRow}>
            {TABS.map(t => {
              const count = countOf(t.key);
              return (
                <TouchableOpacity
                  key={t.key}
                  style={styles.badgeBtn}
                  onPress={() => setTab(t.key)}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                >
                  <Text style={styles.badgeIcon}>{t.icon}</Text>
                  {count > 0 && (
                    <View style={[styles.badge, { backgroundColor: t.color }]}>
                      <Text style={styles.badgeText}>{count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ─── شريط التبويبات ─── */}
        <View style={styles.tabsRow}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, tab === t.key && { backgroundColor: t.color, borderColor: t.color }]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
              <Text style={[styles.tabCount, tab === t.key && { color: C.bgDark }]}>
                {countOf(t.key)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {/* ─── بانرات الإشعارات (تظهر في تبويب المعتمد فقط) ─── */}
      {tab === "approved" && (pendingCount > 0 || deletedCount > 0) && (
        <View style={styles.bannersWrapper}>
          {pendingCount > 0 && (
            <TouchableOpacity
              style={styles.pendingBanner}
              onPress={() => setTab("pending")}
              activeOpacity={0.8}
            >
              <Text style={styles.pendingBannerText}>
                ⏳ لديك {pendingCount} {pendingCount === 1 ? "إعلان معلق" : "إعلانات معلقة"} بانتظار الموافقة
              </Text>
              <Text style={styles.pendingBannerArrow}>←</Text>
            </TouchableOpacity>
          )}
          {deletedCount > 0 && (
            <TouchableOpacity
              style={styles.deletedBanner}
              onPress={() => setTab("deleted")}
              activeOpacity={0.8}
            >
              <Text style={styles.deletedBannerText}>
                🗑️ تم حذف {deletedCount} {deletedCount === 1 ? "إعلان" : "إعلانات"} من قِبل المدير
              </Text>
              <Text style={styles.deletedBannerArrow}>←</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ─── أزرار الإجراءات ─── */}
      <View style={styles.topBtns}>
        <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push("/(employee)/settings")}>
          <Text style={styles.settingsBtnText}>⚙️ إعدادات</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.archiveBtn} onPress={() => router.push("/(employee)/archive")}>
          <Text style={styles.archiveBtnText}>🗄️ الأرشيف</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push("/(employee)/post")}>
          <Text style={styles.addBtnText}>➕ إضافة عقار</Text>
        </TouchableOpacity>
      </View>

      {/* ─── محفظة الموظف ─── */}
      {user?.id && (
        <WalletBar employeeId={user.id as number} employeeName={user.name} />
      )}

      {/* ─── رسالة توضيحية للمحذوفات ─── */}
      {tab === "deleted" && (
        <View style={styles.deletedInfo}>
          <Text style={styles.deletedInfoText}>🗑️ هذه الإعلانات حُذفت من قِبل المدير</Text>
        </View>
      )}

      {/* ─── القائمة ─── */}
      {listLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.gold} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>{TABS.find(t => t.key === tab)?.icon ?? "📋"}</Text>
          <Text style={styles.emptyText}>لا توجد إعلانات {TABS.find(t => t.key === tab)?.label}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item, index }) => (
            <ListingCard
              listing={item as any}
              onOpen={() => openCard(index)}
              onDelete={tab !== "deleted" ? () => handleDelete(item.id) : undefined}
              showActions={tab !== "deleted"}
            />
          )}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.gold} />}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10 },
  headerTitleRow: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  headerLogoSmall: { width: 26, height: 26, borderRadius: 5 },
  headerTitle: { textAlign: "center", color: C.gold, fontSize: 14, fontWeight: "700" },
  logoutText: { color: C.error, fontSize: 14, fontWeight: "700", minWidth: 44, paddingVertical: 4 },
  badgesRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  badgeBtn: { position: "relative", alignItems: "center", justifyContent: "center", padding: 2 },
  badgeIcon: { fontSize: 18 },
  badge: {
    position: "absolute", top: -4, right: -6,
    minWidth: 16, height: 16, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  tabsRow: { flexDirection: "row", paddingHorizontal: 10, paddingBottom: 10, gap: 6 },
  tab: { flex: 1, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: "center", gap: 2 },
  tabText: { color: C.textMuted, fontSize: 11 },
  tabTextActive: { color: C.bgDark, fontWeight: "700" },
  tabCount: { color: C.textMuted, fontSize: 11 },

  // بانرات الإشعارات
  bannersWrapper: { gap: 6, marginHorizontal: 14, marginTop: 10 },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#7a5a00",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.gold,
  },
  pendingBannerText: { color: C.gold, fontSize: 13, fontWeight: "600", flex: 1, textAlign: "right" },
  pendingBannerArrow: { color: C.gold, fontSize: 18, marginLeft: 8 },
  deletedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#3a1a1a",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c0392b",
  },
  deletedBannerText: { color: "#e74c3c", fontSize: 13, fontWeight: "600", flex: 1, textAlign: "right" },
  deletedBannerArrow: { color: "#e74c3c", fontSize: 18, marginLeft: 8 },

  // معلومة المحذوفات
  deletedInfo: {
    backgroundColor: "#333",
    marginHorizontal: 14,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deletedInfoText: { color: "#aaa", fontSize: 12, textAlign: "center" },

  topBtns: { flexDirection: "row", gap: 8, marginHorizontal: 14, marginTop: 10, marginBottom: 4 },
  settingsBtn: { flex: 1, backgroundColor: C.bgLight, borderRadius: 10, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: C.border },
  settingsBtnText: { color: C.textMuted, fontWeight: "600", fontSize: 12 },
  archiveBtn: { flex: 1, backgroundColor: C.bgLight, borderRadius: 10, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: "#4a7a60" },
  archiveBtnText: { color: "#7ec8a0", fontWeight: "600", fontSize: 12 },
  addBtn: { flex: 2, backgroundColor: C.gold, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  addBtnText: { color: C.bgDark, fontWeight: "800", fontSize: 14 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: C.textMuted, fontSize: 16 },
});
