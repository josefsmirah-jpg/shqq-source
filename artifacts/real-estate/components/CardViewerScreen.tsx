import React, {
  useRef, useState, useCallback, useMemo, useEffect,
} from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, Dimensions, ScrollView, ActivityIndicator, Platform,
  Alert, ViewToken, Modal, Pressable, Share, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { captureRef } from "react-native-view-shot";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ContactOptionsModal from "@/components/ContactOptionsModal";
import C from "@/constants/colors";
import { FIXED_PHONE, CARD_NOTE } from "@/utils/arabic";
import { getImageUri } from "@/utils/imageUrl";
import LOGO_BASE64 from "@/constants/logoBase64";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

function PhotoImage({ uri, height }: { uri: string; height: number }) {
  const [error, setError] = useState(false);
  return (
    <View style={{ width: SCREEN_W, height, justifyContent: "center", alignItems: "center" }}>
      {error ? (
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: "#C9A022", fontSize: 40 }}>🖼️</Text>
          <Text style={{ color: "#aaa", fontSize: 13, marginTop: 6 }}>تعذّر تحميل الصورة</Text>
        </View>
      ) : (
        <Image
          source={{ uri }}
          style={{ width: SCREEN_W, height }}
          resizeMode="contain"
          onError={() => setError(true)}
        />
      )}
    </View>
  );
}

const CARD_W = SCREEN_W - 24;
const ACTION_ROW_H = 54;
const NAV_ROW_H = 46;

const TABLE_BORDER = "rgba(201,160,34,0.4)";
const CARD_GREEN = "#1A5C2E";
const CARD_GREEN_LIGHT = "#236B3A";
const CARD_GREEN_ALT = "#1E6832";

interface Floor { name: string; area?: string; price?: string; }
interface Listing {
  id: number; cardNumber: number; propertyType?: string; region: string;
  price?: string; floor?: string; area?: string; description?: string;
  images?: string[]; floors?: Floor[]; createdByRole: string; createdByName?: string;
  ownerName?: string; ownerPhone?: string; mapsLink?: string; projectName?: string;
  createdAt: string; isFeatured?: boolean; commitment?: boolean;
}

interface Props {
  listings: Listing[];
  startIndex?: number;
  onClose: () => void;
  isAdmin?: boolean;
  autoExport?: boolean;
  visitorShare?: boolean;
}

const APP_STORE_LINK = "https://apps.apple.com/app/id6761640135";

function formatListingShareText(item: Listing): string {
  const lines: string[] = [];
  const typeRegion = [item.propertyType, item.region].filter(Boolean).join(" - ");
  if (typeRegion) lines.push(`🏠 ${typeRegion}`);
  if (item.price) lines.push(`💰 السعر: ${item.price}`);
  if (item.area) lines.push(`📐 المساحة: ${item.area} م²`);
  if (item.floor) lines.push(`🏢 الطابق: ${item.floor}`);
  if (item.description) lines.push(`\n${item.description}`);
  lines.push(`\n📲 شاهد البطاقة كاملاً على تطبيق شقق وأراضي المستقبل:`);
  lines.push(APP_STORE_LINK);
  return lines.join("\n");
}

function AutoPhotoSlider({ photos }: { photos: string[] }) {
  const [current, setCurrent] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goNext = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_W,
      duration: 900,
      useNativeDriver: true,
    }).start(() => {
      slideAnim.setValue(-SCREEN_W);
      setCurrent(prev => (prev + 1) % photos.length);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 900,
        useNativeDriver: true,
      }).start();
    });
  }, [photos.length, slideAnim]);

  useEffect(() => {
    if (photos.length <= 1) return;
    intervalRef.current = setInterval(goNext, 3500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [goNext, photos.length]);

  if (!photos.length) return null;

  return (
    <View style={{ paddingTop: 10 }}>
      {/* تلميح السحب */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginBottom: 8, paddingHorizontal: 4 }}>
        <Text style={{ color: C.gold, fontSize: 13, fontWeight: "700", textAlign: "right" }}>
          اسحب يميناً لمشاهدة الصورة كاملة
        </Text>
        <Text style={{ color: C.gold, fontSize: 22, fontWeight: "800", marginRight: 8 }}>←</Text>
      </View>

      {/* الصورة — pointerEvents="none" تمنع التفاعل ولكن تسمح بالسحب عبرها */}
      <View
        style={{ height: 160, borderRadius: 12, overflow: "hidden", marginHorizontal: 4 }}
        pointerEvents="none"
      >
        <Animated.View style={{ width: "100%", height: "100%", transform: [{ translateX: slideAnim }] }}>
          <Image
            source={{ uri: getImageUri(photos[current]) }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </Animated.View>
        {/* نقاط المؤشر */}
        <View style={{ position: "absolute", bottom: 8, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 }}>
          {photos.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === current ? 18 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === current ? C.gold : "rgba(255,255,255,0.5)",
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

export default function CardViewerScreen({ listings, startIndex = 0, onClose, isAdmin, autoExport, visitorShare }: Props) {
  const [localListings, setLocalListings] = useState<Listing[]>(() => listings);
  const hasMultiple = localListings.length > 1;
  const displayListings = localListings;

  const [currentCard, setCurrentCard] = useState(startIndex);
  const [horzPageMap, setHorzPageMap] = useState<Record<number, number>>({});
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSharingMode, setIsSharingMode] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [flatListScrollEnabled, setFlatListScrollEnabled] = useState(true);
  const [pageH, setPageH] = useState(
    SCREEN_H - 110 - ACTION_ROW_H - (hasMultiple ? NAV_ROW_H : 0)
  );

  // ── وضع التحديد ───────────────────────────────────────────────────────────
  const [selectMode, setSelectMode]         = useState(false);
  const [selectedIds, setSelectedIds]       = useState<Set<number>>(new Set());
  const [exportingIndex, setExportingIndex] = useState<number | null>(null);


  // refs لضمان أحدث قيمة داخل الـ callbacks (يحلّ مشكلة stale closure)
  const selectedIdsRef   = useRef(selectedIds);
  const localListingsRef = useRef(localListings);
  const currentCardRef2  = useRef(currentCard);
  const isCapturingRef   = useRef(isCapturing);
  selectedIdsRef.current   = selectedIds;
  localListingsRef.current = localListings;
  currentCardRef2.current  = currentCard;
  isCapturingRef.current   = isCapturing;

  const vertListRef      = useRef<FlatList>(null);
  const horzScrollRefs   = useRef<Map<number, ScrollView | null>>(new Map());
  const cardViewRefs     = useRef<Map<number, View | null>>(new Map());
  const exportCardRefs   = useRef<Map<number, View | null>>(new Map());
  const currentCardRef   = useRef(currentCard);
  currentCardRef.current = currentCard;
  const initializedRef   = useRef<Set<number>>(new Set());
  const horzPageMapRef   = useRef<Record<number, number>>({});
  horzPageMapRef.current = horzPageMap;

  const getCardX = useCallback((photos: string[]) =>
    photos.length > 0 ? photos.length * SCREEN_W : 0, []);

  const resetToCard = useCallback((cardIndex: number) => {
    const item = localListingsRef.current[cardIndex];
    const photos = item?.images ?? [];
    horzScrollRefs.current.get(cardIndex)?.scrollTo({
      x: getCardX(photos),
      animated: false,
    });
  }, [getCardX]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (!viewableItems.length) return;
      const idx = viewableItems[0].index ?? 0;
      if (idx === currentCardRef.current) return;
      resetToCard(currentCardRef.current);
      resetToCard(idx);
      setCurrentCard(idx);
    },
    [resetToCard]
  );

  const viewabilityConfig = useMemo(
    () => ({ itemVisiblePercentThreshold: 60 }),
    []
  );

  const onFlatListLayout = useCallback((e: { nativeEvent: { layout: { height: number } } }) => {
    const h = e.nativeEvent.layout.height;
    if (h <= 0) return;
    setPageH((prev) => {
      if (Math.abs(h - prev) < 4) return prev;
      return h;
    });
  }, []);

  // ── تحميل مسبق لصور البطاقات المجاورة (±2) ──────────────────────────────
  useEffect(() => {
    if (Platform.OS === "web") return;
    const start = Math.max(0, currentCard - 2);
    const end   = Math.min(localListings.length - 1, currentCard + 2);
    for (let i = start; i <= end; i++) {
      const imgs = localListings[i]?.images;
      if (imgs?.length) imgs.forEach((uri: string) => Image.prefetch(getImageUri(uri)).catch(() => {}));
    }
  }, [currentCard, localListings]);

  // ── وضع التصدير التلقائي (يُفعَّل من الأرشيف) ───────────────────────────
  useEffect(() => {
    if (!autoExport || Platform.OS === "web" || localListings.length === 0) return;
    let cancelled = false;
    setIsCapturing(true);
    const timer = setTimeout(async () => {
      const uris: string[] = [];
      try {
        for (let i = 0; i < localListings.length; i++) {
          if (cancelled) break;
          vertListRef.current?.scrollToIndex({ index: i, animated: false });
          await new Promise(r => setTimeout(r, 350));
          const ref = exportCardRefs.current.get(i);
          if (!ref) continue;
          setIsSharingMode(true);
          setExportingIndex(i);
          await new Promise(r => setTimeout(r, 150));
          const uri = await captureRef(ref, { format: "png", quality: 1 });
          setExportingIndex(null);
          setIsSharingMode(false);
          uris.push(uri);
        }
        if (cancelled || !uris.length) return;
        // مشاركة كل بطاقة على حدة بالتسلسل — المستخدم يُشارك كل واحدة ثم تنتقل للتالية
        if (await Sharing.isAvailableAsync()) {
          for (const uri of uris) {
            if (cancelled) break;
            await Sharing.shareAsync(uri, {
              mimeType: "image/png",
              dialogTitle: "مشاركة البطاقة العقارية",
              UTI: "public.png",
            });
          }
        }
      } catch (err) {
        const msg = String(err instanceof Error ? err.message : err).toLowerCase();
        if (!msg.includes("cancel") && !msg.includes("dismiss") && !msg.includes("user did not")) {
          Alert.alert("خطأ", "تعذّر التصدير");
        }
      } finally {
        if (!cancelled) {
          setIsCapturing(false);
          onClose();
        }
      }
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const listing        = localListings[currentCard];
  const displayPhone   = (listing?.isFeatured && listing?.ownerPhone)
    ? listing.ownerPhone
    : FIXED_PHONE;

  // تسجيل التواصل مع الشركات المميزة فقط
  const handleContactLog = useCallback(async (type: "whatsapp" | "call") => {
    if (!listing?.isFeatured) return;
    try {
      const raw = await AsyncStorage.getItem("auth_user");
      const auth = raw ? JSON.parse(raw) : null;
      await fetch(`${BASE_URL}/api/contact-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          visitorName: auth?.name || null,
          visitorPhone: auth?.phone || null,
          companyName: listing.createdByName || listing.ownerName || null,
          companyPhone: listing.ownerPhone || null,
          contactType: type,
        }),
      });
    } catch {}
  }, [listing]);

  // ── معالجات وضع التحديد ───────────────────────────────────────────────────
  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelectCurrent = useCallback(() => {
    // نقرأ من الـ ref لضمان أحدث قيمة
    const id = localListingsRef.current[currentCardRef2.current]?.id;
    if (!id) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const shareCardAsImage = useCallback(async (item: Listing) => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      if (visitorShare) {
        await Share.share({
          message: formatListingShareText(item),
          title: "شقق وأراضي المستقبل",
        });
        return;
      }

      if (Platform.OS === "web") {
        // ── الويب: جلب الصورة من السيرفر مباشرةً (تجنباً لمشاكل canvas مع العربية) ──
        const imageUrl = `${BASE_URL}/api/listings/${item.id}/card-image`;
        const res  = await fetch(imageUrl);
        if (!res.ok) throw new Error(`server error ${res.status}`);
        const blob = await res.blob();
        const file = new File([blob], `card_${item.id}.png`, { type: "image/png" });

        const navAny = navigator as any;
        const canShare = !!(navAny.share && typeof navAny.canShare === "function" && navAny.canShare({ files: [file] }));
        if (canShare) {
          await navAny.share({ files: [file], title: "بطاقة عقارية" });
        } else {
          const url = URL.createObjectURL(file);
          const a = document.createElement("a");
          a.href = url; a.download = file.name;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else {
        // ── iOS / Android: جلب الصورة من السيرفر مثل الويب تماماً ──
        const imageUrl = `${BASE_URL}/api/listings/${item.id}/card-image`;
        const res = await fetch(imageUrl);
        if (!res.ok) throw new Error(`server error ${res.status}`);
        const blob = await res.blob();

        const fileUri = `${FileSystem.cacheDirectory}card_${item.id}.png`;
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (!(await Sharing.isAvailableAsync())) return;
        await Sharing.shareAsync(fileUri, {
          mimeType: "image/png",
          dialogTitle: "مشاركة البطاقة العقارية",
          UTI: "public.png",
        });
      }
    } catch (err) {
      const msg = String(err instanceof Error ? err.message : err).toLowerCase();
      if (!msg.includes("cancel") && !msg.includes("dismiss") && !msg.includes("user did not")) {
        Alert.alert("خطأ", "تعذرت مشاركة البطاقة");
      }
    } finally {
      setIsCapturing(false);
      setIsSharingMode(false);
    }
  }, [isCapturing, listings]);

  // ── نشر جميع البطاقات المحددة ────────────────────────────────────────────
  const shareSelectedCards = useCallback(async () => {
    const ids = [...selectedIdsRef.current];
    if (!ids.length || isCapturingRef.current) return;
    setIsCapturing(true);
    try {
      if (visitorShare) {
        const selectedItems = localListings.filter((l) => ids.includes(l.id));
        const messages = selectedItems.map((item) => formatListingShareText(item));
        await Share.share({
          message: messages.join("\n\n────────────────\n\n"),
          title: "شقق وأراضي المستقبل",
        });
        setSelectMode(false);
        selectedIdsRef.current = new Set();
        return;
      }

      if (Platform.OS !== "web") {
        // native: جلب كل بطاقة من السيرفر وحفظها مؤقتاً
        if (!(await Sharing.isAvailableAsync())) return;
        const uris: string[] = [];
        for (const id of ids) {
          const fileUri = `${FileSystem.cacheDirectory}card_${id}.png`;
          const res = await fetch(`${BASE_URL}/api/listings/${id}/card-image`);
          if (!res.ok) throw new Error(`server error ${res.status}`);
          const blob = await res.blob();
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve((reader.result as string).split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          uris.push(fileUri);
        }
        for (const uri of uris) {
          await Sharing.shareAsync(uri, {
            mimeType: "image/png",
            dialogTitle: "مشاركة البطاقة العقارية",
            UTI: "public.png",
          });
        }
      } else {
        // web: جلب من السيرفر
        const serverBase = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
        for (const id of ids) {
          const res = await fetch(`${serverBase}/api/listings/${id}/card-image`);
          if (!res.ok) throw new Error(`server error ${res.status}`);
          const blob = await res.blob();
          const file = new File([blob], `card_${id}.png`, { type: "image/png" });
          const navAny = navigator as any;
          const canShare = !!(navAny.share && typeof navAny.canShare === "function" && navAny.canShare({ files: [file] }));
          if (canShare) {
            await navAny.share({ files: [file], title: "بطاقة عقارية" });
          } else {
            const url = URL.createObjectURL(file);
            const a = document.createElement("a");
            a.href = url; a.download = file.name;
            a.click();
            URL.revokeObjectURL(url);
          }
        }
      }
    } catch (err) {
      const msg = String(err instanceof Error ? err.message : err).toLowerCase();
      if (!msg.includes("cancel") && !msg.includes("dismiss") && !msg.includes("user did not")) {
        Alert.alert("خطأ", "تعذرت المشاركة");
      }
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const goTo = useCallback((idx: number) => {
    resetToCard(currentCardRef.current);
    setCurrentCard(idx);
    vertListRef.current?.scrollToIndex({ index: idx, animated: true });
  }, [resetToCard]);

  const renderCardContent = (item: Listing) => {
    const filledFloors = (item.floors ?? []).filter(
      (f) => (f.price ?? "").trim() || (f.area ?? "").trim()
    );
    const showFloorTable = filledFloors.length > 0;
    const locationTitle  = (item.projectName && item.projectName.trim() !== item.region.trim())
      ? `${item.region} - ${item.projectName}`
      : item.region;
    const phone = (item.isFeatured && item.ownerPhone) ? item.ownerPhone : FIXED_PHONE;

    return (
      <>
        {/* رأس البطاقة */}
        <View style={styles.cardHeader}>
          <View style={styles.headerTextBox}>
            <Text style={styles.headerTitle}>شقق وأراضي المستقبل</Text>
            <Text style={styles.headerSub}>للاستثمار العقاري المتميز</Text>
          </View>
          <View style={styles.headerLogoBox}>
            <Image
              source={{ uri: LOGO_BASE64 }}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          </View>
        </View>
        <View style={styles.goldDivider} />

        {item.isFeatured && (
          <View style={styles.featuredRow}>
            <Text style={styles.featuredText}>🚀 إعلان مميز</Text>
          </View>
        )}

        <View style={styles.locationBanner}>
          <Text style={styles.locationText}>◆  {locationTitle}  ◆</Text>
        </View>

        {/* جدول المواصفات */}
        {showFloorTable ? (
          <View style={styles.tableSection}>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableHeaderCell}>السعر</Text>
              <View style={styles.tableDividerV} />
              <Text style={styles.tableHeaderCell}>المساحة</Text>
              <View style={styles.tableDividerV} />
              <Text style={styles.tableHeaderCell}>الطابق</Text>
            </View>
            {filledFloors.map((f, fi) => (
              <View key={fi} style={[styles.tableRow, fi % 2 === 1 && styles.tableRowAlt]}>
                <Text style={styles.tableCell}>{f.price || "—"}</Text>
                <View style={styles.tableDividerV} />
                <Text style={styles.tableCell}>{f.area ? `${f.area} م²` : "—"}</Text>
                <View style={styles.tableDividerV} />
                <Text style={styles.tableCell}>{f.name}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.tableSection}>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableHeaderCell}>السعر</Text>
              <View style={styles.tableDividerV} />
              <Text style={styles.tableHeaderCell}>المساحة</Text>
              <View style={styles.tableDividerV} />
              <Text style={styles.tableHeaderCell}>مواصفات</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>{item.price || "—"}</Text>
              <View style={styles.tableDividerV} />
              <Text style={styles.tableCell}>{item.area ? `${item.area} م²` : "—"}</Text>
              <View style={styles.tableDividerV} />
              <Text style={styles.tableCell}>{item.propertyType || "—"}</Text>
            </View>
            {item.floor ? (
              <View style={[styles.tableRow, styles.tableRowAlt]}>
                <Text style={[styles.tableCell, { flex: 3, textAlign: "right", paddingRight: 14 }]}>
                  الطابق: {item.floor}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* الوصف */}
        {item.description ? (
          <View style={styles.descRow}>
            <Text style={styles.descText}>{item.description}</Text>
          </View>
        ) : null}

        <View style={styles.goldDivider} />

        {/* صف التواصل */}
        <View style={styles.contactRow}>
          <View style={styles.contactNote}>
            <Text style={styles.contactNoteText}>{CARD_NOTE}</Text>
          </View>
          <View style={styles.contactDivider} />
          <View style={styles.contactPhone}>
            <Text style={styles.phoneIcon}>📞</Text>
            <Text style={styles.phoneNum} numberOfLines={2}>{phone}</Text>
            <Text style={styles.phoneLabel}>للتواصل</Text>
          </View>
        </View>

        {item.mapsLink ? (
          <View style={styles.mapsRow}>
            <Text style={styles.mapsText}>📍 عرض الموقع على الخريطة</Text>
          </View>
        ) : null}

        {isAdmin && !isSharingMode && (
          <View style={styles.secretSection}>
            <Text style={styles.secretTitle}>🔒 معلومات سرية — للمدير فقط</Text>
            {item.ownerName  ? <Text style={styles.secretText}>صاحب العقار: {item.ownerName}</Text>  : null}
            {item.ownerPhone ? <Text style={styles.secretText}>هاتف المالك: {item.ownerPhone}</Text> : null}
            <Text style={styles.secretText}>المدخِل: {item.createdByName ?? item.createdByRole}</Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.footerCard}>بطاقة #{item.cardNumber}</Text>
          <Text style={styles.footerBrand}>شقق وأراضي المستقبل</Text>
        </View>
      </>
    );
  };

  const renderListingPage = ({ item, index }: { item: Listing; index: number }) => {
    const photos = item.images ?? [];
    const cardX  = getCardX(photos);
    const reversedPhotos = [...photos].reverse();

    return (
      <View style={{ width: SCREEN_W, height: pageH, backgroundColor: C.bgDark }}>
        <ScrollView
          ref={(r) => {
            if (r) {
              horzScrollRefs.current.set(index, r);
              if (!initializedRef.current.has(index)) {
                initializedRef.current.add(index);
                requestAnimationFrame(() => {
                  r.scrollTo({ x: cardX, animated: false });
                });
              }
            } else {
              horzScrollRefs.current.delete(index);
            }
          }}
          horizontal
          pagingEnabled
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScrollBeginDrag={() => {
            setFlatListScrollEnabled(false);
          }}
          onScrollEndDrag={() => {
            setFlatListScrollEnabled(true);
          }}
          onMomentumScrollEnd={() => {
            setFlatListScrollEnabled(true);
          }}
          onScroll={(e) => {
            const x = e.nativeEvent.contentOffset.x;
            const page = Math.round(x / SCREEN_W);
            setHorzPageMap(prev => prev[index] === page ? prev : { ...prev, [index]: page });
          }}
        >
          {/* الصور — معكوسة حتى صورة 1 تظهر أول سحبة يميناً */}
          {reversedPhotos.map((uri: string, ri: number) => {
            const realIdx = photos.length - 1 - ri;
            return (
              <View key={ri} style={[styles.photoPage, { height: pageH }]}>
                <PhotoImage uri={getImageUri(uri)} height={pageH} />
                <View style={styles.photoOverlay}>
                  <Text style={styles.photoCounter}>
                    صورة {realIdx + 1} من {photos.length}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* البطاقة — في أقصى اليمين */}
          <View style={{ width: SCREEN_W, height: pageH }}>
            <View style={styles.cardScrollContent}>
              <View
                ref={(r) => { cardViewRefs.current.set(index, r as View | null); }}
                collapsable={false}
                style={[styles.card, { width: CARD_W }]}
              >
                {renderCardContent(item)}
              </View>
              {/* عرض الصور التلقائي في الفراغ أسفل البطاقة */}
              {photos.length > 0 && !isSharingMode && (
                <AutoPhotoSlider photos={photos} />
              )}
            </View>
          </View>
        </ScrollView>

      </View>
    );
  };

  return (
    <View style={styles.container}>

      {/* الشريط العلوي */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: C.bgDark }}>
        <View style={styles.topBar}>
          {/* نقاط المؤشر — مرتبة من اليمين للشاشة: البطاقة أولاً، ثم الصور */}
          {selectMode ? (
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <TouchableOpacity
                onPress={exitSelectMode}
                style={styles.closeBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.closeBtnText}>✕ إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSelectedIds(new Set(localListingsRef.current.map(l => l.id)))}
                style={styles.selectModeBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.selectModeBtnText}>تحديد الكل</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.dotsWrap} />
          )}

          <View style={{ flex: 1, alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              {(() => {
                const cPhotos = localListings[currentCard]?.images ?? [];
                if (cPhotos.length === 0) return null;
                const total = cPhotos.length + 1;
                const hPage = horzPageMap[currentCard] ?? cPhotos.length;
                const pos   = Math.min(total, Math.max(1, cPhotos.length + 1 - hPage));
                return (
                  <View style={styles.pagePosBadge}>
                    <Text style={styles.pagePosText}>🖼 {total} / {pos}</Text>
                  </View>
                );
              })()}
              <Text style={styles.topBarTitle}>
                {selectMode
                  ? selectedIds.size > 0
                    ? `محدد: ${selectedIds.size}`
                    : "اضغط ✓ لتحديد البطاقة"
                  : localListings.length > 1
                    ? `بطاقة ${currentCard + 1} / ${localListings.length}`
                    : "بطاقة العقار"
                }
              </Text>
            </View>
          </View>

          {selectMode ? (
            <TouchableOpacity
              onPress={toggleSelectCurrent}
              style={styles.selectCheckBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={[
                styles.selectCheckText,
                selectedIds.has(listing?.id) && styles.selectCheckActive,
              ]}>
                {selectedIds.has(listing?.id) ? "☑" : "☐"}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              {isAdmin && (
                <TouchableOpacity
                  onPress={() => setSelectMode(true)}
                  style={styles.selectModeBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={styles.selectModeBtnText}>☑ تحديد</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setShowMenu(true)}
                style={styles.menuBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="قائمة الخيارات"
              >
                <Text style={styles.menuBtnText}>⋯</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="إغلاق"
              >
                <Text style={styles.closeBtnText}>✕ إغلاق</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* قائمة البطاقات */}
      <FlatList
        ref={vertListRef}
        data={displayListings}
        renderItem={renderListingPage}
        keyExtractor={(it, i) => `${it.id}-${i}`}
        extraData={[isCapturing, pageH, selectMode, selectedIds]}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, i) => ({ length: pageH, offset: pageH * i, index: i })}
        initialScrollIndex={startIndex > 0 ? startIndex : undefined}
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        scrollEnabled={flatListScrollEnabled}
        onScrollBeginDrag={() => {
          resetToCard(currentCardRef.current);
          setFlatListScrollEnabled(true);
        }}
        onLayout={onFlatListLayout}
        style={{ flex: 1 }}
      />

      {/* ── بطاقات مخفية للتصوير — تُنشأ فقط عند الحاجة الفعلية للتصدير ── */}
      {(autoExport || selectMode) && (
        <View style={{ position: "absolute", left: 0, top: 0, zIndex: -1 }}>
          {localListings.map((item, index) => (
            <View
              key={item.id}
              ref={(r) => { exportCardRefs.current.set(index, r as View | null); }}
              collapsable={false}
              style={[
                styles.card,
                { width: CARD_W },
                exportingIndex !== index && { opacity: 0, position: "absolute", left: -9999 },
              ]}
            >
              {renderCardContent(item)}
            </View>
          ))}
        </View>
      )}

      {/* ━━━ شريط الأزرار الثابت في الأسفل ━━━ */}
      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: C.bgDark }}>
        {/* ── شريط العادي: اتصال + مشاركة ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.callBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowContact(true); }}
            accessibilityRole="button"
            accessibilityLabel="اتصل بصاحب العقار"
          >
            <Text style={styles.callBtnText}>📞  اتصال</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.shareBtn, (isCapturing || (selectMode && selectedIds.size === 0)) && styles.btnDisabled]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (selectMode) {
                shareSelectedCards();
              } else {
                listing && shareCardAsImage(listing);
              }
            }}
            disabled={isCapturing || (selectMode && selectedIds.size === 0)}
            accessibilityRole="button"
            accessibilityLabel={selectMode && selectedIds.size > 0 ? `مشاركة ${selectedIds.size} بطاقات محددة` : "مشاركة بطاقة العقار"}
            accessibilityState={{ disabled: isCapturing || (selectMode && selectedIds.size === 0) }}
          >
            {isCapturing
              ? <ActivityIndicator color={C.bgDark} size="small" />
              : <Text style={styles.shareBtnText}>
                  {selectMode && selectedIds.size > 0
                    ? `📤  مشاركة المحددة (${selectedIds.size})`
                    : "📤  مشاركة البطاقة"}
                </Text>}
          </TouchableOpacity>
        </View>

        {/* الصف السفلي: التنقل بين البطاقات */}
        {hasMultiple && (
          <View style={styles.navRow}>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => !selectMode && goTo(currentCard + 1)}
              disabled={selectMode}
              accessibilityRole="button"
              accessibilityLabel="البطاقة التالية"
            >
              <Text style={styles.navBtnText}>التالي ↓</Text>
            </TouchableOpacity>
            <Text style={styles.navCounter}>{currentCard + 1} / {localListings.length}</Text>
            <TouchableOpacity
              style={[styles.navBtn, currentCard <= 0 && styles.navBtnDisabled]}
              onPress={() => !selectMode && currentCard > 0 && goTo(currentCard - 1)}
              disabled={currentCard <= 0 || selectMode}
              accessibilityRole="button"
              accessibilityLabel="البطاقة السابقة"
              accessibilityState={{ disabled: currentCard <= 0 }}
            >
              <Text style={styles.navBtnText}>↑ السابق</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      {/* Modal قائمة الخيارات ⋯ */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setShowMenu(false)}>
          <View style={styles.menuPanel}>
            <Text style={styles.menuTitle}>خيارات</Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                setTimeout(() => {
                  Alert.alert("إبلاغ عن محتوى", "هل تريد الإبلاغ عن هذا الإعلان؟", [
                    { text: "إلغاء", style: "cancel" },
                    {
                      text: "إبلاغ", style: "destructive",
                      onPress: async () => {
                        try {
                          const raw = await AsyncStorage.getItem("auth_user");
                          const auth = raw ? JSON.parse(raw) : null;
                          await fetch(`${BASE_URL}/api/reports`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              listingId: listing?.id,
                              listingRegion: listing?.region || null,
                              reporterName: auth?.name || null,
                              reporterPhone: auth?.phone || null,
                            }),
                          });
                        } catch {}
                        Alert.alert("شكراً", "تم استلام بلاغك وسيتم مراجعته من قِبل فريقنا");
                      },
                    },
                  ]);
                }, 300);
              }}
            >
              <Text style={styles.menuItemReport}>🚩  إبلاغ عن هذا الإعلان</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuCancel} onPress={() => setShowMenu(false)}>
              <Text style={styles.menuCancelText}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Modal التواصل */}
      <ContactOptionsModal
        visible={showContact}
        phone={displayPhone}
        onClose={() => setShowContact(false)}
        onLog={listing?.isFeatured ? handleContactLog : undefined}
      />


    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgDark },

  topBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10,
    gap: 8,
  },
  topBarTitle: {
    textAlign: "center",
    color: C.gold, fontSize: 14, fontWeight: "700",
  },
  pagePosBadge: {
    marginTop: 2,
    backgroundColor: "rgba(201,168,76,0.15)",
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 1,
    borderWidth: 1, borderColor: C.gold,
  },
  pagePosText: {
    color: C.gold, fontSize: 11, fontWeight: "600",
  },
  dotsWrap: {
    flexDirection: "row", gap: 5, minWidth: 56,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: C.border,
  },
  dotActive: { backgroundColor: C.gold, width: 16 },
  closeBtn: { minWidth: 58, alignItems: "flex-end" },
  closeBtnText: { color: C.error, fontWeight: "700", fontSize: 14 },

  selectModeBtn: {
    backgroundColor: "rgba(201,160,34,0.2)", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: C.gold,
  },
  selectModeBtnText: { color: C.gold, fontSize: 13, fontWeight: "700" },

  selectCheckBtn: { minWidth: 42, alignItems: "flex-end" },
  selectCheckText: { fontSize: 26, color: C.border },
  selectCheckActive: { color: C.gold },

  // ──── كارد ────
  card: {
    alignSelf: "center",
    backgroundColor: CARD_GREEN,
    borderRadius: 14, overflow: "hidden",
    borderWidth: 2, borderColor: C.gold,
  },
  cardScrollContent: {
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: 16,
  },

  cardHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 12,
  },
  headerTextBox: { flex: 1, alignItems: "flex-end" },
  headerTitle: { color: C.gold, fontSize: 17, fontWeight: "800", textAlign: "right" },
  headerSub: { color: C.goldLight, fontSize: 11, textAlign: "right", marginTop: 2 },
  headerLogoBox: {
    width: 62, height: 62, backgroundColor: "#fff",
    borderRadius: 10, overflow: "hidden", marginLeft: 12,
    justifyContent: "center", alignItems: "center",
  },
  headerLogo: { width: 58, height: 58 },

  goldDivider: { height: 2, backgroundColor: C.gold },
  featuredRow: { backgroundColor: C.gold, paddingVertical: 5, alignItems: "center" },
  featuredText: { color: CARD_GREEN, fontWeight: "800", fontSize: 13 },

  locationBanner: {
    backgroundColor: C.gold, paddingVertical: 12,
    paddingHorizontal: 16, alignItems: "center",
  },
  locationText: { color: CARD_GREEN, fontSize: 16, fontWeight: "800", textAlign: "center" },

  tableSection: { borderTopWidth: 1, borderTopColor: TABLE_BORDER },
  tableHeaderRow: {
    flexDirection: "row", backgroundColor: CARD_GREEN_LIGHT,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: TABLE_BORDER,
  },
  tableHeaderCell: {
    flex: 1, color: C.gold, fontSize: 13, fontWeight: "700",
    textAlign: "center", textDecorationLine: "underline",
  },
  tableDividerV: { width: 1, backgroundColor: TABLE_BORDER },
  tableRow: {
    flexDirection: "row", paddingVertical: 12,
    backgroundColor: CARD_GREEN, borderBottomWidth: 1, borderBottomColor: TABLE_BORDER,
  },
  tableRowAlt: { backgroundColor: CARD_GREEN_ALT },
  tableCell: { flex: 1, color: "#fff", fontSize: 13, fontWeight: "600", textAlign: "center" },

  descRow: {
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: CARD_GREEN_ALT, borderTopWidth: 1, borderTopColor: TABLE_BORDER,
  },
  descText: { color: C.textMuted, fontSize: 13, textAlign: "right", lineHeight: 20 },

  contactRow: {
    flexDirection: "row", minHeight: 88,
    borderTopWidth: 1, borderTopColor: TABLE_BORDER,
  },
  contactNote: { flex: 3, padding: 12, justifyContent: "center" },
  contactNoteText: { color: C.textMuted, fontSize: 11, textAlign: "right", lineHeight: 17 },
  contactDivider: { width: 1, backgroundColor: TABLE_BORDER },
  contactPhone: {
    flex: 2, alignItems: "center", justifyContent: "center",
    paddingVertical: 10, paddingHorizontal: 8,
    backgroundColor: CARD_GREEN_LIGHT, minWidth: 110,
  },
  phoneIcon: { fontSize: 20, marginBottom: 3 },
  phoneNum: {
    color: C.gold, fontWeight: "800", textAlign: "center",
    fontSize: 13, flexShrink: 0,
  },
  phoneLabel: { color: C.textMuted, fontSize: 10, marginTop: 2 },

  mapsRow: {
    backgroundColor: CARD_GREEN_ALT, paddingVertical: 8, alignItems: "center",
    borderTopWidth: 1, borderTopColor: TABLE_BORDER,
  },
  mapsText: { color: C.goldLight, fontSize: 13, fontWeight: "600" },

  secretSection: {
    marginHorizontal: 12, marginVertical: 8,
    backgroundColor: "rgba(229,62,62,0.1)", borderRadius: 8,
    padding: 10, borderWidth: 1, borderColor: C.error,
  },
  secretTitle: { color: C.error, fontWeight: "700", marginBottom: 4, textAlign: "right", fontSize: 12 },
  secretText:  { color: "#fff", fontSize: 12, textAlign: "right", marginBottom: 2 },

  cardFooter: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: C.gold,
  },
  footerBrand: { color: CARD_GREEN, fontWeight: "800", fontSize: 13 },
  footerCard:  { color: CARD_GREEN, fontWeight: "800", fontSize: 13 },

  // ──── صور بجانب البطاقة ────
  photoPage: {
    width: SCREEN_W, backgroundColor: "#000",
    justifyContent: "center", alignItems: "center",
  },
  photoOverlay: {
    position: "absolute", bottom: 20, left: 0, right: 0, alignItems: "center",
  },
  photoCounter: {
    backgroundColor: "rgba(0,0,0,0.65)", color: "#fff",
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, fontSize: 13,
  },

  // ──── شريط الصور المصغرة ────
  thumbStrip: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingTop: 5, paddingBottom: 8,
  },
  swipeHint: {
    alignItems: "flex-start", paddingHorizontal: 12, marginBottom: 4,
  },
  swipeHintText: {
    color: "#C9A84C", fontSize: 11, fontWeight: "600",
  },
  thumbStripContent: {
    paddingHorizontal: 12, gap: 8,
    flexDirection: "row", alignItems: "center",
  },
  thumbBtn: {
    width: 68, height: 68, borderRadius: 8,
    overflow: "hidden", borderWidth: 2, borderColor: "#C9A84C",
  },
  thumbImg: {
    width: "100%", height: "100%",
  },
  thumbNumBadge: {
    position: "absolute", bottom: 2, right: 2,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1,
  },
  thumbNumText: { color: "#fff", fontSize: 10, fontWeight: "700" },

  // ──── شريط الأزرار السفلي ────
  actionRow: {
    flexDirection: "row", gap: 10,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: C.bgDark,
    borderTopWidth: 1, borderTopColor: C.border,
    height: ACTION_ROW_H,
  },
  menuBtn: {
    paddingHorizontal: 6, paddingVertical: 2,
    alignItems: "center", justifyContent: "center",
  },
  menuBtnText: { color: C.textMuted, fontSize: 22, fontWeight: "700", letterSpacing: 1 },

  menuOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  menuPanel: {
    backgroundColor: C.bgLight, borderTopLeftRadius: 18, borderTopRightRadius: 18,
    paddingTop: 12, paddingBottom: 32, paddingHorizontal: 16,
    borderTopWidth: 1, borderColor: C.border,
  },
  menuTitle: {
    color: C.textMuted, fontSize: 13, textAlign: "center",
    marginBottom: 10, fontWeight: "600",
  },
  menuItem: {
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  menuItemReport: { color: C.error, fontSize: 16, fontWeight: "700", textAlign: "right" },
  menuCancel: {
    marginTop: 8, paddingVertical: 14, alignItems: "center",
    backgroundColor: C.bgDark, borderRadius: 12,
  },
  menuCancelText: { color: C.textMuted, fontSize: 15, fontWeight: "700" },
  callBtn: {
    flex: 1, backgroundColor: C.gold, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  callBtnText: { color: CARD_GREEN, fontWeight: "800", fontSize: 16 },

  shareBtn: {
    flex: 2, backgroundColor: C.bgLight, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: C.border,
  },
  shareBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  btnDisabled: { opacity: 0.4 },

  navRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: C.bgDark,
    borderTopWidth: 1, borderTopColor: C.border,
    height: NAV_ROW_H,
    gap: 8,
  },
  navBtn: {
    flex: 1, backgroundColor: "rgba(201,160,34,0.15)", borderRadius: 10,
    paddingVertical: 8, alignItems: "center",
    borderWidth: 1, borderColor: "rgba(201,160,34,0.3)",
  },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { color: C.gold, fontWeight: "700", fontSize: 13 },
  navCounter: {
    color: C.textMuted, fontSize: 13, textAlign: "center",
    minWidth: 50,
  },
});
