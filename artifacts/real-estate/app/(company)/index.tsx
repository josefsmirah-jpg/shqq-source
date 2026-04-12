import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, ActivityIndicator, Image, Animated, TextInput,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGetListings, useDeleteListing } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import ListingCard from "@/components/ListingCard";
import C from "@/constants/colors";
import { setListingsForViewer } from "@/utils/listingsStore";

type Tab = "all" | "mine" | "paid";

const CACHE_KEY = "company_listings_cache_v2";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:  { label: "⏳ قيد المراجعة", color: C.gold },
  approved: { label: "✅ معتمد",         color: "#4CAF50" },
  rejected: { label: "❌ مرفوض",         color: C.error },
  deleted:  { label: "🗑️ محذوف",         color: C.textMuted },
};

function SkeletonCard() {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View style={[skStyles.card, { opacity: anim }]}>
      <View style={skStyles.topBar} />
      <View style={skStyles.title} />
      <View style={skStyles.row}>
        <View style={[skStyles.cell, { flex: 1 }]} />
        <View style={[skStyles.cell, { flex: 1.5 }]} />
        <View style={[skStyles.cell, { flex: 1 }]} />
      </View>
      <View style={skStyles.footer} />
    </Animated.View>
  );
}
const skBg = "rgba(201,160,34,0.12)";
const skStyles = StyleSheet.create({
  card: { backgroundColor: "#1E6832", borderRadius: 12, overflow: "hidden", marginHorizontal: 12, marginVertical: 8, borderWidth: 1, borderColor: "rgba(201,160,34,0.3)" },
  topBar: { height: 44, backgroundColor: "#1A5C2E" },
  title: { height: 36, backgroundColor: skBg, margin: 10, borderRadius: 6 },
  row: { flexDirection: "row", gap: 6, marginHorizontal: 10, marginBottom: 10 },
  cell: { height: 48, backgroundColor: skBg, borderRadius: 6 },
  footer: { height: 32, backgroundColor: "rgba(201,160,34,0.15)" },
});

export default function CompanyHomeScreen() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("mine");
  const [search, setSearch] = useState("");
  const deleteMutation = useDeleteListing();

  const [cachedAll, setCachedAll] = useState<any[]>([]);
  const [cacheLoaded, setCacheLoaded] = useState(false);
  const allLoadedRef = useRef(false);

  const [approvedBadge, setApprovedBadge] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (raw) {
          try { setCachedAll(JSON.parse(raw)); } catch (_e) {}
        }
      })
      .finally(() => setCacheLoaded(true));
  }, []);

  const { data: all = [], isLoading: l1, refetch: r1, isRefetching: rf1 } = useGetListings({ status: "approved" });
  const mineParams = user?.phone
    ? { status: "approved", createdByPhone: user.phone, role: "company" }
    : null;
  const { data: mine = [], isLoading: l2, refetch: r2, isRefetching: rf2 } = useGetListings(
    (mineParams ?? {}) as any,
    { query: { enabled: !!user?.phone } as any }
  );
  const { data: paid = [], isLoading: l3, refetch: r3, isRefetching: rf3 } = useGetListings({ status: "approved", q: "مميز" });

  useEffect(() => {
    if (!l1 && !rf1 && cacheLoaded) {
      if (!allLoadedRef.current) {
        allLoadedRef.current = true;
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(all)).catch(() => {});
        setCachedAll(all);
      }
    }
  }, [l1, rf1, all, cacheLoaded]);

  useEffect(() => {
    if (!user?.phone || !mine.length) return;
    const approvedCount = mine.filter((l: any) => l.status === "approved").length;
    AsyncStorage.getItem(`co_approved_seen_${user.phone}`).then(seen => {
      const seenCount = seen ? parseInt(seen) : 0;
      if (approvedCount > seenCount) setApprovedBadge(true);
    });
  }, [mine, user?.phone]);

  const clearBadge = useCallback(() => {
    if (!user?.phone) return;
    const approvedCount = mine.filter((l: any) => l.status === "approved").length;
    AsyncStorage.setItem(`co_approved_seen_${user.phone}`, String(approvedCount)).catch(() => {});
    setApprovedBadge(false);
  }, [mine, user?.phone]);

  const rawAll = (!l1 && !rf1) ? all : (all.length > 0 ? all : cachedAll);
  const baseData = tab === "all" ? rawAll : tab === "mine" ? mine : paid;

  // بحث بسيط
  const data = search.trim()
    ? baseData.filter((l: any) =>
        [l.region, l.propertyType, l.projectName, l.description, l.price, l.area]
          .filter(Boolean).join(" ").toLowerCase()
          .includes(search.trim().toLowerCase())
      )
    : baseData;

  const listLoading = tab === "all" ? (l1 && cachedAll.length === 0 && cacheLoaded) : tab === "mine" ? l2 : l3;
  const isRefreshing = tab === "all" ? rf1 : tab === "mine" ? rf2 : rf3;
  const refetch = tab === "all" ? () => { allLoadedRef.current = false; r1(); } : tab === "mine" ? r2 : r3;

  if (!user) return null;

  const handleDelete = (id: number) => {
    Alert.alert("حذف الإعلان", "هل أنت متأكد؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف", style: "destructive",
        onPress: () => deleteMutation.mutate({ id }, {
          onSuccess: () => { refetch(); },
          onError: () => Alert.alert("خطأ", "تعذر الحذف"),
        })
      }
    ]);
  };

  const openCard = (index: number) => {
    setListingsForViewer(data as any[], index);
    router.push("/(company)/cards");
  };

  const TABS = [
    { key: "mine" as Tab, label: "إعلاناتي", badge: approvedBadge },
    { key: "all"  as Tab, label: "الكل",      badge: false },
    { key: "paid" as Tab, label: "⭐ مميز",    badge: false },
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: C.bgDark }}>

        {/* ══ الهيدر: 3 أقسام ══ */}
        <View style={styles.header}>
          {/* يسار: خروج + ⚙️ */}
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={logout} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="تسجيل الخروج" style={styles.iconBox}>
              <Text style={styles.logoutText}>خروج</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/(company)/settings")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="الإعدادات" style={styles.iconBox}>
              <Text style={styles.headerIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* مركز: اللوجو + الاسم */}
          <View style={styles.headerCenter}>
            <Image source={require("@/assets/images/logo.jpeg")} style={styles.headerLogo} resizeMode="contain" />
            <Text style={styles.headerTitle}>شقق وأراضي المستقبل</Text>
          </View>

          {/* يمين: تاق الشركة */}
          <View style={styles.headerRight}>
            <View style={styles.iconBox}>
              <Text style={styles.roleTag}>🏢 شركة</Text>
            </View>
          </View>
        </View>

        {/* ══ شريط البحث + الفلتر (التابات) ══ */}
        <View style={styles.searchWrap}>
          <View style={styles.searchRow}>
            {/* تابات التصفية بديلاً عن زر الفلتر */}
            <View style={styles.searchCapsule}>
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="ابحث في إعلاناتك..."
                placeholderTextColor="rgba(255,255,255,0.35)"
                textAlign="right"
                selectionColor={C.gold}
                accessibilityLabel="حقل البحث"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")} style={styles.clearBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="مسح البحث">
                  <Text style={styles.clearBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ══ زر أضف إعلان — تحت البحث مباشرة ══ */}
          <TouchableOpacity
            style={styles.postBtnFull}
            onPress={() => router.push("/(company)/post")}
            accessibilityRole="button"
            accessibilityLabel="أضف إعلان جديد"
          >
            <Text style={styles.postBtnFullText}>➕ أضف إعلان</Text>
          </TouchableOpacity>
        </View>

        {/* ══ التابات ══ */}
        <View style={styles.tabsRow}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, tab === t.key && styles.tabActive]}
              onPress={() => { setTab(t.key); if (t.key === "mine") clearBadge(); }}
            >
              <View style={{ position: "relative" }}>
                <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
                {t.badge && <View style={styles.tabBadge} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {isRefreshing && (
          <View style={styles.refreshBanner}>
            <ActivityIndicator size="small" color={C.gold} />
            <Text style={styles.refreshBannerText}>جاري تحديث البيانات...</Text>
          </View>
        )}
      </SafeAreaView>

      {listLoading ? (
        <View style={{ flex: 1 }}>
          {[1, 2, 3].map((k) => <SkeletonCard key={k} />)}
        </View>
      ) : data.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>{tab === "mine" ? "📋" : tab === "paid" ? "⭐" : "🏠"}</Text>
          <Text style={styles.emptyText}>
            {search.trim() ? "لا توجد نتائج مطابقة" : tab === "mine" ? "لم تُضف أي إعلانات بعد" : "لا توجد عقارات"}
          </Text>
          {search.trim() && (
            <TouchableOpacity style={styles.resetBtn} onPress={() => setSearch("")}>
              <Text style={styles.resetBtnText}>مسح البحث</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => String((item as any).id)}
          renderItem={({ item, index }) => (
            <View>
              {tab === "mine" && (item as any).status && (
                <View style={[st.badge, { borderColor: STATUS_LABELS[(item as any).status]?.color || C.border }]}>
                  <Text style={[st.badgeText, { color: STATUS_LABELS[(item as any).status]?.color || C.textMuted }]}>
                    {STATUS_LABELS[(item as any).status]?.label || (item as any).status}
                  </Text>
                </View>
              )}
              <ListingCard
                listing={item as any}
                onOpen={() => openCard(index)}
                onDelete={tab === "mine" ? () => handleDelete((item as any).id) : undefined}
                showActions={tab === "mine"}
              />
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refetch}
              tintColor={C.gold}
            />
          }
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  badge: { marginHorizontal: 12, marginTop: 8, marginBottom: -4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, alignSelf: "flex-end", backgroundColor: "rgba(0,0,0,0.2)" },
  badgeText: { fontSize: 12, fontWeight: "700" },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // ══ هيدر موديرن ══
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 10,
    justifyContent: "space-between",
  },
  headerLeft:   { flexDirection: "row", gap: 10, alignItems: "center", minWidth: 70 },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  headerRight:  { flexDirection: "row", alignItems: "center", minWidth: 70, justifyContent: "flex-end" },
  headerLogo:   { width: 24, height: 24, borderRadius: 5 },
  headerTitle:  { color: C.gold, fontSize: 13, fontWeight: "700", textAlign: "center" },
  headerIcon:   { fontSize: 20 },
  logoutText:   { color: C.gold, fontSize: 13, fontWeight: "700" },
  roleTag:      { color: C.goldLight, fontSize: 13 },

  // إطار أحمر للأيقونات
  iconBox: {
    borderWidth: 1.5, borderColor: C.error, borderRadius: 10,
    padding: 5, alignItems: "center", justifyContent: "center",
  },

  // ══ شريط البحث ══
  searchWrap:    { paddingHorizontal: 14, paddingBottom: 8, gap: 8 },
  searchRow:     { flexDirection: "row", gap: 8, alignItems: "center" },
  searchCapsule: {
    flex: 1, flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 24, borderWidth: 1.5, borderColor: C.error,
    paddingHorizontal: 14, height: 46,
  },
  searchInput: {
    flex: 1, color: "#FFFFFF", fontSize: 15,
    textAlign: "right", paddingVertical: 0,
  },
  clearBtn: {
    paddingHorizontal: 6, paddingVertical: 2,
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, marginLeft: 4,
  },
  clearBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // ══ زر أضف إعلان ══
  postBtnFull: {
    width: "100%", paddingVertical: 15,
    borderRadius: 14, alignItems: "center",
    backgroundColor: "rgba(201,160,34,0.12)",
    borderWidth: 2, borderColor: C.error,
  },
  postBtnFullText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },

  // ══ التابات ══
  tabsRow: { flexDirection: "row", paddingHorizontal: 14, paddingBottom: 10, gap: 8 },
  tab:     { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: "center" },
  tabActive:     { backgroundColor: C.gold, borderColor: C.gold },
  tabText:       { color: C.textMuted, fontSize: 13 },
  tabTextActive: { color: C.bgDark, fontWeight: "700" },
  tabBadge:      { position: "absolute", top: -4, right: -6, width: 8, height: 8, borderRadius: 4, backgroundColor: "#E53E3E" },

  refreshBanner:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 6, backgroundColor: C.bgDark },
  refreshBannerText: { color: C.goldLight, fontSize: 12 },
  center:    { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: C.textMuted, fontSize: 16 },
  resetBtn:  { backgroundColor: C.bgLight, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: C.border, marginTop: 6 },
  resetBtnText: { color: C.gold, fontSize: 13 },
});
