import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, Platform, Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useGetListings, getGetListingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import AppHeader from "@/components/AppHeader";
import ConfirmModal from "@/components/ConfirmModal";
import ListingCard from "@/components/ListingCard";
import C from "@/constants/colors";
import { setListingsForViewer } from "@/utils/listingsStore";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export default function DataScreen() {
  const {
    data: listings = [],
    isLoading,
    refetch,
    isRefetching,
  } = useGetListings({ status: "approved" });

  const [search, setSearch]           = useState("");
  const [selectMode, setSelectMode]   = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<number[] | null>(null);
  const isExportingRef = useRef(false);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = listings as any[];
    if (!q) return all;
    return all.filter(l =>
      (l.region       || "").toLowerCase().includes(q) ||
      (l.floor        || "").toLowerCase().includes(q) ||
      (l.price        || "").toLowerCase().includes(q) ||
      (l.area         || "").toLowerCase().includes(q) ||
      (l.projectName  || "").toLowerCase().includes(q) ||
      (l.propertyType || "").toLowerCase().includes(q)
    );
  }, [listings, search]);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filtered.map((l: any) => l.id)));
  }, [filtered]);

  const exitSelect = useCallback(() => {
    setSelectedIds(new Set());
    setSelectMode(false);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget?.length) return;
    const idsToDelete = [...deleteTarget];

    // تحديث فوري للكاش وإغلاق النافذة قبل انتظار السيرفر
    const queryKey = getGetListingsQueryKey({ status: "approved" });
    const previousData = queryClient.getQueryData<any[]>(queryKey);
    queryClient.setQueryData(queryKey, (old: any[] | undefined) =>
      (old || []).filter(l => !idsToDelete.includes(l.id))
    );
    setDeleteTarget(null);
    exitSelect();

    // إرسال الطلب في الخلفية
    try {
      await Promise.all(
        idsToDelete.map(id =>
          fetch(`${BASE_URL}/api/listings/${id}/delete`, { method: "POST" })
        )
      );
    } catch {
      // استعادة البيانات القديمة عند الفشل
      queryClient.setQueryData(queryKey, previousData);
    }
  }, [deleteTarget, exitSelect, queryClient]);

  const handleShare = useCallback(async (ids: number[]) => {
    if (!ids.length || isExportingRef.current) return;
    isExportingRef.current = true;
    setIsExporting(true);
    try {
      if (Platform.OS === "web") {
        const files = await Promise.all(
          ids.map(async (id) => {
            const res = await fetch(`${BASE_URL}/api/listings/${id}/card-image`);
            if (!res.ok) throw new Error(`server error ${res.status}`);
            const blob = await res.blob();
            return new File([blob], `card_${id}.png`, { type: "image/png" });
          })
        );
        const navAny = navigator as any;
        const canShare = !!(navAny.share && typeof navAny.canShare === "function" && navAny.canShare({ files }));
        if (canShare) {
          await navAny.share({ files, title: "بطاقة عقارية" });
        } else {
          for (const file of files) {
            const url = URL.createObjectURL(file);
            const a = document.createElement("a");
            a.href = url; a.download = file.name;
            a.click();
            URL.revokeObjectURL(url);
            await new Promise(r => setTimeout(r, 300));
          }
        }
        return;
      }

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("تنبيه", "المشاركة غير متاحة على هذا الجهاز");
        return;
      }
      // تحميل كل بطاقة بشكل منفصل ومشاركتها بالتسلسل
      for (const id of ids) {
        const fileUri = `${FileSystem.cacheDirectory}card_${id}_${Date.now()}.png`;
        const dl = await FileSystem.downloadAsync(`${BASE_URL}/api/listings/${id}/card-image`, fileUri);
        if (dl.status !== 200) continue;
        await Sharing.shareAsync(dl.uri, {
          mimeType: "image/png",
          dialogTitle: "مشاركة البطاقة العقارية",
          UTI: "public.png",
        });
      }
    } catch (err) {
      const msg = String(err instanceof Error ? err.message : err).toLowerCase();
      if (!msg.includes("cancel") && !msg.includes("dismiss") && !msg.includes("user did not")) {
        Alert.alert("خطأ", "تعذّر التصدير");
      }
    } finally {
      isExportingRef.current = false;
      setIsExporting(false);
    }
  }, []);

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const isSelected = selectedIds.has(item.id);
    return (
      <View>
        {selectMode && (
          <TouchableOpacity
            style={[S.selectOverlay, isSelected && S.selectOverlayActive]}
            onPress={() => toggleSelect(item.id)}
            activeOpacity={0.85}
          >
            <View style={[S.cardCheckbox, isSelected && S.cardCheckboxChecked]}>
              {isSelected && <Text style={S.cardCheckmark}>✓</Text>}
            </View>
          </TouchableOpacity>
        )}
        <ListingCard
          listing={item as any}
          onOpen={selectMode ? () => {} : () => {
            setListingsForViewer([...filtered] as any[], index, false);
            router.push("/(admin)/cards");
          }}
          showActions={false}
        />
      </View>
    );
  }, [selectedIds, selectMode, toggleSelect, filtered]);

  const selectedArr = [...selectedIds];

  return (
    <View style={S.container}>
      <ConfirmModal
        visible={!!deleteTarget?.length}
        title={`حذف ${deleteTarget?.length ?? 0} إعلان`}
        message="سيُنقل الإعلان إلى قسم المحذوفات. هل أنت متأكد؟"
        confirmText="حذف 🗑"
        cancelText="إلغاء"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <AppHeader title="📊 البيانات" showBack />

      {/* شريط البحث */}
      <View style={S.searchWrap}>
        <TextInput
          style={S.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="ابحث بالمنطقة · الطابق · السعر · المساحة"
          placeholderTextColor={C.textMuted}
          textAlign="right"
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} style={S.clearBtn}>
            <Text style={S.clearTxt}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* شريط الإجراءات العلوي */}
      <View style={S.topBar}>
        <Text style={S.countTxt}>{filtered.length} إعلان</Text>
        {selectMode ? (
          <View style={S.topBtnRow}>
            <TouchableOpacity onPress={selectAll} style={S.topBtn}>
              <Text style={S.topBtnTxt}>تحديد الكل</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={exitSelect} style={S.topBtnCancel}>
              <Text style={S.topBtnCancelTxt}>✕ إلغاء</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setSelectMode(true)} style={S.topBtn}>
            <Text style={S.topBtnTxt}>☑ تحديد</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* القائمة */}
      {isLoading ? (
        <View style={S.center}>
          <ActivityIndicator size="large" color={C.gold} />
          <Text style={S.loadingTxt}>جار تحميل البطاقات...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={S.center}>
          <Text style={S.emptyIcon}>📭</Text>
          <Text style={S.emptyText}>
            {search.trim() ? "لا توجد نتائج للبحث" : "لا توجد إعلانات معتمدة"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => String(it.id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.gold} />
          }
          contentContainerStyle={S.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}

      {/* شريط الإجراءات السفلي (يظهر عند التحديد) */}
      {selectMode && selectedArr.length > 0 && (
        <SafeAreaView edges={["bottom"]} style={{ backgroundColor: C.bgDark }}>
          <View style={S.actionBar}>
            <Text style={S.selectedCount}>محدد: {selectedArr.length}</Text>
            <TouchableOpacity
              onPress={() => handleShare(selectedArr)}
              disabled={isExporting}
              style={[S.actionBtn, S.shareBtn, isExporting && S.btnDisabled]}
            >
              <Text style={S.actionBtnTxt}>
                {isExporting ? "جار التصدير..." : "📤 مشاركة"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setDeleteTarget(selectedArr)}
              style={[S.actionBtn, S.deleteBtn]}
            >
              <Text style={S.actionBtnTxt}>🗑 حذف</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  searchWrap: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 12, marginTop: 10, marginBottom: 6,
    backgroundColor: C.card, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1, color: C.white, fontSize: 14,
    paddingVertical: 11,
  },
  clearBtn: { paddingHorizontal: 6, paddingVertical: 8 },
  clearTxt: { color: C.textMuted, fontSize: 16 },

  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  countTxt: { color: C.textMuted, fontSize: 13, fontWeight: "600" },
  topBtnRow: { flexDirection: "row", gap: 8 },
  topBtn: {
    backgroundColor: "rgba(201,160,34,0.15)", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: "rgba(201,160,34,0.4)",
  },
  topBtnTxt: { color: C.gold, fontSize: 13, fontWeight: "700" },
  topBtnCancel: {
    backgroundColor: "rgba(229,62,62,0.1)", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: "rgba(229,62,62,0.3)",
  },
  topBtnCancelTxt: { color: C.error, fontSize: 13, fontWeight: "700" },

  listContent: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 30 },

  selectOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 10, justifyContent: "flex-start", alignItems: "flex-end",
    padding: 10,
  },
  selectOverlayActive: {},
  cardCheckbox: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: C.gold,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center", alignItems: "center",
  },
  cardCheckboxChecked: {
    backgroundColor: C.gold,
  },
  cardCheckmark: { color: "#13441F", fontWeight: "700", fontSize: 16 },

  actionBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 10,
    gap: 8, borderTopWidth: 1, borderTopColor: C.border,
  },
  selectedCount: {
    color: C.gold, fontSize: 13, fontWeight: "700",
    minWidth: 70,
  },
  actionBtn: {
    flex: 1, borderRadius: 10, paddingVertical: 11,
    alignItems: "center", justifyContent: "center",
  },
  shareBtn: { backgroundColor: "#1D6A3A" },
  deleteBtn: { backgroundColor: "rgba(229,62,62,0.2)", borderWidth: 1, borderColor: C.error },
  actionBtnTxt: { color: C.white, fontSize: 14, fontWeight: "700" },
  btnDisabled: { opacity: 0.5 },

  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingTxt: { color: C.textMuted, fontSize: 14 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: C.textMuted, fontSize: 15 },
});
