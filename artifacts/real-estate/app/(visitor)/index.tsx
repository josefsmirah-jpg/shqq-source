import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, RefreshControl, Animated,
  Image, ScrollView, Modal, KeyboardAvoidingView, Platform,
  Share,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGetListings, getGetListingsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginModal } from "@/app/_layout";
import ListingCard from "@/components/ListingCard";
import C from "@/constants/colors";
import { setListingsForViewer } from "@/utils/listingsStore";
import { arabicToEnglish } from "@/utils/arabic";

const CACHE_KEY = "visitor_listings_cache_v1";

// استخراج أرقام من نص (يدعم الأرقام العربية)
function extractNumber(text: string | null | undefined): number | null {
  if (!text) return null;
  const arabic = text.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const match = arabic.match(/[\d.]+/);
  if (!match) return null;
  return parseFloat(match[0]);
}

// تطبيع النص العربي: توحيد الألفات والهمزات + تحويل الأرقام العربية للإنجليزية
function normalizeArabic(text: string): string {
  return text
    .replace(/[٠١٢٣٤٥٦٧٨٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))) // أرقام عربية → إنجليزية
    .replace(/[أإآٱ]/g, "ا")   // توحيد أشكال الألف
    .replace(/ة/g, "ه")         // تاء مربوطة → هاء
    .replace(/ى/g, "ي")         // ألف مقصورة → ياء
    .replace(/[\u064B-\u065F]/g, "") // إزالة التشكيل
    .toLowerCase();
}

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

interface Filters {
  region: string;
  priceMin: string;
  priceMax: string;
  areaMin: string;
  areaMax: string;
  floor: string;
  type: string; // "الكل" | "أرض" | "شقة"
}

const EMPTY_FILTERS: Filters = {
  region: "", priceMin: "", priceMax: "",
  areaMin: "", areaMax: "", floor: "", type: "الكل",
};

const PROPERTY_TYPES = ["الكل", "أرض", "شقة"];

function hasActiveFilters(f: Filters) {
  return f.region || f.priceMin || f.priceMax || f.areaMin || f.areaMax || f.floor || f.type !== "الكل";
}

export default function VisitorHomeScreen() {
  const { user, logout, isGuest } = useAuth();
  const { openLoginModal } = useLoginModal();
  const [search, setSearch] = useState("");
  const [filterModal, setFilterModal] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [pendingFilters, setPendingFilters] = useState<Filters>(EMPTY_FILTERS);

  const [cachedListings, setCachedListings] = useState<any[]>([]);
  const [cacheLoaded, setCacheLoaded] = useState(false);
  const savedToCache = useRef(false);
  const [approvedBadge, setApprovedBadge] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (raw) { try { setCachedListings(JSON.parse(raw)); } catch (_e) {} }
      })
      .finally(() => setCacheLoaded(true));
  }, []);

  // إعلانات الزائر الخاصة (لحساب الإشعارات)
  const myListingsParams = user?.visitorId
    ? { visitorId: user.visitorId, createdByPhone: user?.phone || "" }
    : { createdByPhone: user?.phone || "" };
  const { data: myListings = [] } = useGetListings(
    myListingsParams as any,
    { query: { enabled: !!(user?.visitorId || user?.phone), staleTime: 30_000, refetchInterval: 60_000 } as any }
  );

  // حساب badge الإعلانات المعتمدة حديثاً
  useEffect(() => {
    if (!user?.phone || !myListings.length) return;
    const currentApproved = myListings.filter((l: any) => l.status === "approved").length;
    const key = `approved_seen_${user.phone}`;
    AsyncStorage.getItem(key).then((raw) => {
      const seen = raw ? parseInt(raw, 10) : 0;
      setApprovedBadge(Math.max(0, currentApproved - seen));
    });
  }, [myListings, user?.phone]);

  // إعادة حساب الـ badge فور العودة من شاشة "إعلاناتي"
  useFocusEffect(useCallback(() => {
    if (!user?.phone || !myListings.length) return;
    const currentApproved = myListings.filter((l: any) => l.status === "approved").length;
    const key = `approved_seen_${user.phone}`;
    AsyncStorage.getItem(key).then((raw) => {
      const seen = raw ? parseInt(raw, 10) : 0;
      setApprovedBadge(Math.max(0, currentApproved - seen));
    });
  }, [user?.phone, myListings]));

  const { data: freshData = [], isLoading: apiLoading, refetch, isRefetching } = useGetListings(
    { status: "approved" },
    { query: { queryKey: getGetListingsQueryKey({ status: "approved" }), staleTime: 60_000, gcTime: 5 * 60 * 1000, refetchOnMount: true } }
  );

  const lastCachedJson = useRef<string>('');

  useEffect(() => {
    if (!apiLoading && freshData.length > 0) {
      const json = JSON.stringify(freshData);
      if (json !== lastCachedJson.current) {
        lastCachedJson.current = json;
        AsyncStorage.setItem(CACHE_KEY, json).catch(() => {});
        setCachedListings(freshData);
        savedToCache.current = true;
      }
    }
  }, [freshData, apiLoading]);

  const rawToUse = (apiLoading && !savedToCache.current) ? cachedListings : freshData;
  const isLoadingInitially = apiLoading && cachedListings.length === 0 && cacheLoaded;

  const listings = useMemo(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const featured = rawToUse
      .filter((l: any) => l.isFeatured)
      .sort((a: any, b: any) => {
        const aDate = new Date(a.createdAt);
        const bDate = new Date(b.createdAt);
        const aMin = aDate.getHours() * 60 + aDate.getMinutes();
        const bMin = bDate.getHours() * 60 + bDate.getMinutes();
        const aKey = (currentMinutes - aMin + 1440) % 1440;
        const bKey = (currentMinutes - bMin + 1440) % 1440;
        if (aKey !== bKey) return aKey - bKey;
        return (a.cardNumber ?? 0) - (b.cardNumber ?? 0);
      });

    const normal = rawToUse.filter((l: any) => !l.isFeatured);
    return [...featured, ...normal];
  }, [rawToUse]);

  // استخراج المناطق الفريدة للاقتراحات
  const allRegions = useMemo(() =>
    [...new Set(listings.map((l: any) => l.region).filter(Boolean))].sort() as string[],
    [listings]
  );

  const regionSuggestions = useMemo(() => {
    if (!pendingFilters.region.trim()) return [];
    const q = pendingFilters.region.trim().toLowerCase();
    return allRegions.filter(r => r.toLowerCase().includes(q)).slice(0, 5);
  }, [pendingFilters.region, allRegions]);

  // استخراج كل النصوص القابلة للبحث من إعلان — فقط الحقول ذات الصلة بالموقع والنوع
  // (الوصف واسم المالك مُستبعدَان لأنهما يُسببان ظهور نتائج غير مطابقة للمنطقة)
  const getSearchableText = (l: any): string => {
    const directFields = [
      l.region, l.propertyType, l.projectName,
      l.price, l.area, l.floor,
    ].filter(Boolean).join(" ");

    // بيانات الطوابق المنفصلة (للإعلانات متعددة الطوابق)
    const floorsText = Array.isArray(l.floors)
      ? l.floors.map((f: any) => [f.name, f.area, f.price].filter(Boolean).join(" ")).join(" ")
      : "";

    return normalizeArabic(`${directFields} ${floorsText}`);
  };

  // دالة مشتركة لتطبيق مجموعة فلاتر على القائمة
  const applyFilterSet = (base: any[], s: string, f: Filters) => {
    let result = base;

    // البحث العام — كل كلمة تُبحث منفردة، الإعلان يظهر إن طابقت أي كلمة
    if (s.trim()) {
      const words = normalizeArabic(s.trim())
        .split(/\s+/)
        .filter(w => w.length >= 1);
      result = result.filter((l: any) => {
        const text = getSearchableText(l);
        // يكفي مطابقة كلمة واحدة ذات معنى (بحث OR)
        return words.some(w => text.includes(w));
      });
    }

    // فلتر المنطقة (مع تطبيع الهمزات)
    if (f.region.trim()) {
      const q = normalizeArabic(f.region.trim());
      result = result.filter((l: any) => normalizeArabic(l.region ?? "").includes(q));
    }

    // فلتر نوع العقار
    if (f.type !== "الكل") {
      result = result.filter((l: any) => l.propertyType === f.type);
    }

    // فلتر السعر — يبحث في السعر المباشر وأسعار الطوابق
    if (f.priceMin || f.priceMax) {
      result = result.filter((l: any) => {
        const prices: number[] = [];
        const direct = extractNumber(l.price);
        if (direct !== null) prices.push(direct);
        if (Array.isArray(l.floors)) {
          l.floors.forEach((fl: any) => {
            const fp = extractNumber(fl.price);
            if (fp !== null) prices.push(fp);
          });
        }
        if (prices.length === 0) return false;
        return prices.some(p => {
          if (f.priceMin && p < parseFloat(f.priceMin)) return false;
          if (f.priceMax && p > parseFloat(f.priceMax)) return false;
          return true;
        });
      });
    }

    // فلتر المساحة — يبحث في المساحة المباشرة ومساحات الطوابق
    if (f.areaMin || f.areaMax) {
      result = result.filter((l: any) => {
        const areas: number[] = [];
        const direct = extractNumber(l.area);
        if (direct !== null) areas.push(direct);
        if (Array.isArray(l.floors)) {
          l.floors.forEach((fl: any) => {
            const fa = extractNumber(fl.area);
            if (fa !== null) areas.push(fa);
          });
        }
        if (areas.length === 0) return false;
        return areas.some(a => {
          if (f.areaMin && a < parseFloat(f.areaMin)) return false;
          if (f.areaMax && a > parseFloat(f.areaMax)) return false;
          return true;
        });
      });
    }

    // فلتر الطابق (مع تطبيع الهمزات + يبحث في طوابق المشاريع أيضاً)
    if (f.floor.trim()) {
      const q = normalizeArabic(f.floor.trim());
      result = result.filter((l: any) => {
        if (normalizeArabic(l.floor ?? "").includes(q)) return true;
        if (Array.isArray(l.floors)) {
          return l.floors.some((fl: any) => normalizeArabic(fl.name ?? "").includes(q));
        }
        return false;
      });
    }

    return result;
  };

  // النتائج المُطبَّقة (للعرض الفعلي)
  const filtered = useMemo(() => applyFilterSet(listings, search, filters),
    [listings, search, filters]);

  // النتائج المؤقتة (داخل المودال — تتحدث لحظياً أثناء التعديل)
  const pendingFiltered = useMemo(() => applyFilterSet(listings, search, pendingFilters),
    [listings, search, pendingFilters]);

  if (!user) return null;

  const openCard = (itemId: number) => {
    const index = filtered.findIndex((l: any) => l.id === itemId);
    if (index === -1) return;
    const BUFFER = 25;
    const start = Math.max(0, index - BUFFER);
    const end = Math.min(filtered.length - 1, index + BUFFER);
    const slice = filtered.slice(start, end + 1);
    const adjustedIndex = index - start;
    setListingsForViewer(slice, adjustedIndex);
    router.push("/(visitor)/cards");
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/(visitor)" as any);
  };

  const openFilterModal = () => {
    setPendingFilters(filters);
    setFilterModal(true);
  };

  const applyFilters = () => {
    setFilters(pendingFilters);
    setFilterModal(false);
  };

  const clearFilters = () => {
    setPendingFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
  };

  const shareApp = useCallback(async () => {
    try {
      await Share.share({
        message: "حمل تطبيق شقق وأراضي المستقبل 🏠🔑\nhttps://apps.apple.com/app/id6761640135",
        title: "شقق وأراضي المستقبل",
      });
    } catch {}
  }, []);

  const activeCount = [
    filters.region, filters.priceMin, filters.priceMax,
    filters.areaMin, filters.areaMax, filters.floor,
    filters.type !== "الكل" ? "x" : "",
  ].filter(Boolean).length;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: C.bgDark }}>

        {/* ══ الهيدر: 3 أقسام ══ */}
        <View style={styles.header}>
          {/* يسار: خروج/دخول + ⚙️ */}
          <View style={styles.headerLeft}>
            {isGuest ? (
              <TouchableOpacity onPress={openLoginModal} style={styles.iconBox} accessibilityRole="button" accessibilityLabel="تسجيل الدخول">
                <Text style={styles.logoutText}>خروج</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleLogout} style={styles.iconBox} accessibilityRole="button" accessibilityLabel="تسجيل الخروج">
                <Text style={styles.logoutText}>خروج</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => router.push("/(visitor)/settings")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="الإعدادات" style={styles.iconBox}>
              <Text style={styles.headerIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* مركز: اللوجو + الاسم */}
          <View style={styles.headerCenter}>
            <Image source={require("@/assets/images/logo.jpeg")} style={styles.headerLogo} resizeMode="contain" />
            <Text style={styles.headerTitle}>شقق وأراضي المستقبل</Text>
          </View>

          {/* يمين: مشاركة + إعلاناتي */}
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={shareApp} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="شارك التطبيق" style={styles.iconBox}>
              <Text style={styles.headerIcon}>📤</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/(visitor)/my-ads")} style={[styles.myAdsIconBtn, styles.iconBox]} accessibilityRole="button" accessibilityLabel="إعلاناتي">
              <Text style={styles.headerIcon}>📋</Text>
              {approvedBadge > 0 && (
                <View style={styles.myAdsBadge}><Text style={styles.myAdsBadgeText}>{approvedBadge}</Text></View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ══ شريط البحث + الفلتر ══ */}
        <View style={styles.searchWrap}>
          <View style={styles.searchRow}>
            <TouchableOpacity
              onPress={openFilterModal}
              style={[styles.filterIconBtn, activeCount > 0 && styles.filterIconBtnActive]}
              accessibilityRole="button"
              accessibilityLabel={activeCount > 0 ? `تصفية النتائج - ${activeCount} فلتر نشط` : "تصفية النتائج"}
            >
              <Text style={styles.filterIconText}>{activeCount > 0 ? `⚡ ${activeCount}` : "فلتر"}</Text>
            </TouchableOpacity>
            <View style={styles.searchCapsule}>
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="ابحث عن عقار..."
                placeholderTextColor="rgba(255,255,255,0.35)"
                textAlign="right"
                selectionColor={C.gold}
                accessibilityLabel="حقل البحث"
                accessibilityHint="اكتب للبحث في العقارات"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")} style={styles.clearBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="مسح البحث">
                  <Text style={styles.clearBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ══ زر اعرض عقارك — تحت البحث مباشرة ══ */}
          <TouchableOpacity
            style={styles.postBtnFull}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); if (isGuest) { openLoginModal(); } else { router.push("/(visitor)/post"); } }}
            accessibilityRole="button"
            accessibilityLabel="اعرض عقارك - أضف إعلاناً جديداً"
          >
            <Text style={styles.postBtnFullText}>➕ اعرض عقارك</Text>
          </TouchableOpacity>
        </View>

        {/* شريط الفلتر النشط */}
        {hasActiveFilters(filters) && (
          <View style={styles.activeFilterBar}>
            <TouchableOpacity style={styles.resetToHomeBtn} onPress={() => { clearFilters(); setSearch(""); }}>
              <Text style={styles.resetToHomeBtnText}>✕ مسح الفلاتر</Text>
            </TouchableOpacity>
            <Text style={styles.activeFilterCount}>{filtered.length} نتيجة</Text>
          </View>
        )}

        {/* شريط التحديث */}
        {apiLoading && cachedListings.length > 0 && (
          <View style={styles.refreshBanner}>
            <ActivityIndicator size="small" color={C.gold} />
            <Text style={styles.refreshBannerText}>جاري تحديث البيانات...</Text>
          </View>
        )}
      </SafeAreaView>

      {/* ══════════════ مودال الفلاتر ══════════════ */}
      <Modal
        visible={filterModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFilterModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* هيدر المودال */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setPendingFilters(EMPTY_FILTERS); setFilters(EMPTY_FILTERS); setFilterModal(false); }}>
              <Text style={styles.modalClearAll}>مسح الكل</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>🔍 تصفية النتائج</Text>
            <TouchableOpacity onPress={() => setFilterModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* نوع العقار */}
            <FilterLabel>🏷️ نوع العقار</FilterLabel>
            <View style={styles.typeRow}>
              {PROPERTY_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, pendingFilters.type === t && styles.typeBtnActive]}
                  onPress={() => setPendingFilters(p => ({ ...p, type: t }))}
                >
                  <Text style={[styles.typeBtnText, pendingFilters.type === t && styles.typeBtnTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* المنطقة */}
            <FilterLabel>📍 المنطقة</FilterLabel>
            <TextInput
              style={styles.filterInput}
              value={pendingFilters.region}
              onChangeText={v => setPendingFilters(p => ({ ...p, region: v }))}
              placeholder="اكتب اسم المنطقة..."
              placeholderTextColor={C.textMuted}
              textAlign="right"
            />
            {regionSuggestions.length > 0 && (
              <View style={styles.suggestions}>
                {regionSuggestions.map(r => (
                  <TouchableOpacity
                    key={r}
                    style={styles.suggestionItem}
                    onPress={() => setPendingFilters(p => ({ ...p, region: r }))}
                  >
                    <Text style={styles.suggestionText}>📍 {r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* السعر */}
            <FilterLabel>💰 السعر (ألف دينار)</FilterLabel>
            <View style={styles.rangeRow}>
              <TextInput
                style={[styles.filterInput, styles.rangeInput]}
                value={pendingFilters.priceMax}
                onChangeText={v => setPendingFilters(p => ({ ...p, priceMax: arabicToEnglish(v) }))}
                placeholder="الحد الأعلى"
                placeholderTextColor={C.textMuted}
                keyboardType="decimal-pad"
                textAlign="center"
              />
              <Text style={styles.rangeSep}>—</Text>
              <TextInput
                style={[styles.filterInput, styles.rangeInput]}
                value={pendingFilters.priceMin}
                onChangeText={v => setPendingFilters(p => ({ ...p, priceMin: arabicToEnglish(v) }))}
                placeholder="الحد الأدنى"
                placeholderTextColor={C.textMuted}
                keyboardType="decimal-pad"
                textAlign="center"
              />
            </View>

            {/* المساحة */}
            <FilterLabel>📐 المساحة (م²)</FilterLabel>
            <View style={styles.rangeRow}>
              <TextInput
                style={[styles.filterInput, styles.rangeInput]}
                value={pendingFilters.areaMax}
                onChangeText={v => setPendingFilters(p => ({ ...p, areaMax: arabicToEnglish(v) }))}
                placeholder="الحد الأعلى"
                placeholderTextColor={C.textMuted}
                keyboardType="decimal-pad"
                textAlign="center"
              />
              <Text style={styles.rangeSep}>—</Text>
              <TextInput
                style={[styles.filterInput, styles.rangeInput]}
                value={pendingFilters.areaMin}
                onChangeText={v => setPendingFilters(p => ({ ...p, areaMin: arabicToEnglish(v) }))}
                placeholder="الحد الأدنى"
                placeholderTextColor={C.textMuted}
                keyboardType="decimal-pad"
                textAlign="center"
              />
            </View>

            {/* الطابق */}
            <FilterLabel>🏢 الطابق</FilterLabel>
            <TextInput
              style={styles.filterInput}
              value={pendingFilters.floor}
              onChangeText={v => setPendingFilters(p => ({ ...p, floor: v }))}
              placeholder="مثال: الأول، الأرضي، الروف..."
              placeholderTextColor={C.textMuted}
              textAlign="right"
            />
          </ScrollView>

          {/* زر التطبيق الثابت في الأسفل */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
              <Text style={styles.applyBtnText}>عرض النتائج ({pendingFiltered.length})</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── القائمة ── */}
      {isLoadingInitially ? (
        <View style={{ flex: 1 }}>
          {[1, 2, 3].map((k) => <SkeletonCard key={k} />)}
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyText}>
            {(search || hasActiveFilters(filters)) ? "لا توجد نتائج مطابقة" : "لا توجد عقارات متاحة حالياً"}
          </Text>
          {(search || hasActiveFilters(filters)) && (
            <TouchableOpacity style={styles.resetBtn} onPress={() => { setSearch(""); clearFilters(); }}>
              <Text style={styles.resetBtnText}>إعادة تعيين البحث</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String((item as any).id)}
          renderItem={({ item }) => (
            <ListingCard listing={item as any} onOpen={() => openCard((item as any).id)} compact />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => { savedToCache.current = false; refetch(); }}
              tintColor={C.gold}
            />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

    </View>
  );
}

function FilterLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.filterLabel}>{children}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // ══ هيدر موديرن ══
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 10,
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", gap: 10, alignItems: "center", minWidth: 60 },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  headerRight: { flexDirection: "row", gap: 8, alignItems: "center", minWidth: 60, justifyContent: "flex-end" },
  headerLogo: { width: 24, height: 24, borderRadius: 5 },
  headerTitle: { color: C.gold, fontSize: 13, fontWeight: "700", textAlign: "center" },
  headerIcon: { fontSize: 20 },

  // إطار أحمر للأيقونات
  iconBox: {
    borderWidth: 1.5, borderColor: C.error, borderRadius: 10,
    padding: 5, alignItems: "center", justifyContent: "center",
  },

  // يمين الهيدر
  myAdsIconBtn: { position: "relative" },
  myAdsBadge: {
    position: "absolute", top: -6, right: -6,
    backgroundColor: C.gold, borderRadius: 10,
    minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  myAdsBadgeText: { color: C.bgDark, fontWeight: "900", fontSize: 10 },
  loginPill: {
    backgroundColor: C.gold, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1.5, borderColor: C.error,
  },
  loginPillText: { color: C.bgDark, fontSize: 13, fontWeight: "800" },
  logoutText: { color: C.gold, fontSize: 13, fontWeight: "700" },

  // ══ شريط البحث ══
  searchWrap: { paddingHorizontal: 14, paddingBottom: 10, gap: 8 },
  searchRow: { flexDirection: "row", gap: 8, alignItems: "center" },
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
  filterIconBtn: {
    height: 46, paddingHorizontal: 16, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1.5, borderColor: C.error,
    alignItems: "center", justifyContent: "center",
  },
  filterIconBtnActive: { backgroundColor: "rgba(201,160,34,0.25)", borderColor: C.gold },
  filterIconText: { color: C.gold, fontSize: 14, fontWeight: "800" },

  // ══ زر اعرض عقارك الكامل ══
  postBtnFull: {
    width: "100%", paddingVertical: 15,
    borderRadius: 14, alignItems: "center",
    backgroundColor: "rgba(201,160,34,0.12)",
    borderWidth: 2, borderColor: C.error,
  },
  postBtnFullText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },

  // شريط الفلتر النشط
  activeFilterBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingBottom: 8,
  },
  resetToHomeBtn: {
    backgroundColor: "rgba(201,160,34,0.18)", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: C.gold,
  },
  resetToHomeBtnText: { color: C.gold, fontSize: 13, fontWeight: "700" },
  activeFilterCount: { color: C.textMuted, fontSize: 13 },


  // ── مودال الفلاتر ──
  modalRoot: { flex: 1, backgroundColor: C.bgDark },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 18, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.bgDark,
  },
  modalTitle: { color: C.gold, fontSize: 17, fontWeight: "800" },
  modalClose: { color: C.textMuted, fontSize: 20, fontWeight: "700", paddingHorizontal: 4 },
  modalClearAll: { color: C.error, fontSize: 14 },
  modalScroll: { flex: 1 },
  modalScrollContent: { paddingHorizontal: 18, paddingBottom: 20 },
  modalFooter: {
    padding: 16, borderTopWidth: 1, borderTopColor: C.border,
    backgroundColor: C.bgDark,
  },

  // الفلاتر المشتركة
  filterLabel: {
    color: C.gold, fontSize: 14, fontWeight: "700",
    textAlign: "right", marginBottom: 8, marginTop: 18,
  },
  filterInput: {
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.inputBorder,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    color: C.white, fontSize: 15,
  },
  rangeRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  rangeInput: { flex: 1 },
  rangeSep: { color: C.textMuted, fontSize: 18 },

  // اقتراحات المنطقة
  suggestions: {
    backgroundColor: C.bgLight, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, marginTop: 4,
  },
  suggestionItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  suggestionText: { color: C.white, fontSize: 15, textAlign: "right" },

  // نوع العقار
  typeRow: { flexDirection: "row", gap: 10 },
  typeBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.border, alignItems: "center",
    backgroundColor: C.bgLight,
  },
  typeBtnActive: { backgroundColor: C.gold, borderColor: C.gold },
  typeBtnText: { color: C.textMuted, fontSize: 15 },
  typeBtnTextActive: { color: C.bgDark, fontWeight: "800" },

  // زر التطبيق
  applyBtn: { backgroundColor: C.gold, borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  applyBtnText: { color: C.bgDark, fontWeight: "800", fontSize: 16 },

  // باقي
  refreshBanner: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 5, backgroundColor: "rgba(201,160,34,0.15)",
  },
  refreshBannerText: { color: C.goldLight, fontSize: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: C.textMuted, fontSize: 16, textAlign: "center" },
  resetBtn: {
    backgroundColor: C.bgLight, borderRadius: 10, paddingHorizontal: 20,
    paddingVertical: 10, borderWidth: 1, borderColor: C.border, marginTop: 6,
  },
  resetBtnText: { color: C.gold, fontSize: 13 },
});
