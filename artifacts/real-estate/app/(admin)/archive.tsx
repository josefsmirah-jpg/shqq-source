import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TextInput, TouchableOpacity, Pressable,
  Linking, Alert, Modal, Image, ScrollView, Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useGetListings, getGetListingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminListingActions } from "@/utils/adminActions";
import ListingCard from "@/components/ListingCard";
import AppHeader from "@/components/AppHeader";
import ConfirmModal from "@/components/ConfirmModal";
import C from "@/constants/colors";
import { setListingsForViewer } from "@/utils/listingsStore";

type StatusFilter = "approved" | "rejected" | "deleted";
type DialogType = "approve" | "reject" | "delete" | "hardDelete" | "bulkDelete" | "bulkHardDelete" | null;

const ARCHIVE_TABS: { key: StatusFilter; label: string; color?: string }[] = [
  { key: "approved", label: "✅ معتمد" },
  { key: "rejected", label: "❌ مرفوض" },
  { key: "deleted",  label: "🗑️ محذوف", color: "#E53E3E" },
];

function buildShareText(item: any): string {
  const lines: string[] = [];
  lines.push(`🏠 *إعلان عقاري #${item.cardNumber || item.id}*`);
  if (item.propertyType) lines.push(`النوع: ${item.propertyType}`);
  if (item.region) lines.push(`المنطقة: ${item.region}`);
  if (item.projectName) lines.push(`المشروع: ${item.projectName}`);
  if (item.area) lines.push(`المساحة: ${item.area}`);
  if (item.floor) lines.push(`الطابق: ${item.floor}`);
  if (item.price) lines.push(`💰 السعر: ${item.price}`);
  if (item.description) lines.push(`\n${item.description}`);
  return lines.join("\n");
}

export default function AdminArchiveScreen() {
  const params = useLocalSearchParams<{
    initialStatus?: string;
    initialRole?: string;
    initialPkg?: string;
    screenTitle?: string;
    initialName?: string;
  }>();

  const isSourceMode = !!params.initialRole;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter | "pending">(
    isSourceMode ? "pending" : ((params.initialStatus as StatusFilter) || "approved")
  );
  const [dialog, setDialog] = useState<{ type: DialogType; id?: number } | null>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // ── تصدير البطاقات ────────────────────────────────────────────────────────
  const [isGenerating, setIsGenerating]       = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const exportTotalRef = useRef(0);

  // ── شاشة المعاينة ─────────────────────────────────────────────────────────
  const [previewVisible, setPreviewVisible]   = useState(false);
  const [previewUris, setPreviewUris]         = useState<string[]>([]);
  const [isSharingAll, setIsSharingAll]       = useState(false);

  const toggleSelectMode = useCallback(() => {
    setSelectMode(prev => !prev);
    setSelectedIds(new Set());
  }, []);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    if (isSourceMode) {
      setStatusFilter("pending");
    } else if (params.initialStatus) {
      setStatusFilter(params.initialStatus as StatusFilter);
    }
  }, [params.initialStatus, params.initialRole, isSourceMode]);

  useEffect(() => {
    setSelectedIds(new Set());
    setSelectMode(false);
  }, [statusFilter]);

  const QUERY_PARAMS = { includeDeleted: "true" } as any;
  const { data: listings = [], isLoading, refetch, isRefetching } = useGetListings(
    QUERY_PARAMS,
    {
      query: {
        queryKey: getGetListingsQueryKey(QUERY_PARAMS),
        staleTime: 60_000,
        gcTime:    5 * 60 * 1000,
        refetchOnMount: true,
        placeholderData: (prev: any) => prev,
      }
    }
  );

  const [slowLoad, setSlowLoad] = useState(false);
  useEffect(() => {
    if (!isLoading) { setSlowLoad(false); return; }
    const t = setTimeout(() => setSlowLoad(true), 5000);
    return () => clearTimeout(t);
  }, [isLoading]);

  const { processingId, approve, reject, deleteListing, hardDeleteListing } = useAdminListingActions();
  const queryClient = useQueryClient();

  // ── تعديل الإعلان مباشرةً من القائمة ────────────────────────────────────
  const [editListing, setEditListing]   = useState<any | null>(null);
  const [editForm, setEditForm]         = useState<Record<string, string>>({});
  const [editFloors, setEditFloors]     = useState<{name:string;area:string;price:string}[]>([]);
  const editFormRef    = useRef<Record<string, string>>({});
  const editFloorsRef  = useRef<{name:string;area:string;price:string}[]>([]);
  const isSavingRef    = useRef(false);
  editFormRef.current  = editForm;
  editFloorsRef.current = editFloors;

  const openArchiveEdit = useCallback((item: any) => {
    isSavingRef.current = false;
    const hasFloors = Array.isArray(item.floors) && item.floors.length > 0;
    const form = {
      propertyType: item.propertyType || "",
      region:       item.region       || "",
      projectName:  item.projectName  || "",
      price:        hasFloors ? "" : (item.price || ""),
      area:         hasFloors ? "" : (item.area  || ""),
      floor:        hasFloors ? "" : (item.floor || ""),
      description:  item.description  || "",
      ownerName:    item.ownerName    || "",
      ownerPhone:   item.ownerPhone   || "",
      mapsLink:     item.mapsLink     || "",
    };
    const floors = hasFloors
      ? item.floors.map((f: any) => ({ name: f.name || "", area: f.area || "", price: f.price || "" }))
      : [];
    editFormRef.current   = form;
    editFloorsRef.current = floors;
    setEditForm(form);
    setEditFloors(floors);
    setEditListing(item);
  }, []);

  const saveArchiveEdit = useCallback(async () => {
    if (isSavingRef.current || !editListing) return;
    isSavingRef.current = true;

    const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
    const payload: any = { ...editFormRef.current };
    if (editFloorsRef.current.length > 0) {
      payload.floors = editFloorsRef.current;
    }

    // تحديث فوري للكاش المحلي وإغلاق النافذة قبل انتظار السيرفر
    const queryKey = getGetListingsQueryKey(QUERY_PARAMS);
    const previousData = queryClient.getQueryData<any[]>(queryKey);
    queryClient.setQueryData(queryKey, (old: any[] | undefined) =>
      (old || []).map(l => l.id === editListing.id ? { ...l, ...payload } : l)
    );
    const savedId = editListing.id;
    setEditListing(null);
    isSavingRef.current = false;

    // إرسال الطلب في الخلفية
    try {
      const res = await fetch(`${BASE_URL}/api/listings/${savedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
    } catch {
      // استعادة البيانات القديمة عند الفشل
      queryClient.setQueryData(queryKey, previousData);
    }
  }, [editListing, queryClient]);

  const filtered = useMemo(() => {
    let result = listings as any[];
    result = result.filter((l: any) => l.status === statusFilter);
    if (params.initialRole) result = result.filter((l: any) => l.createdByRole === params.initialRole);
    if (params.initialPkg === "free") result = result.filter((l: any) => !l.packageType);
    if (params.initialPkg === "paid") result = result.filter((l: any) => !!l.packageType);
    if (params.initialName) result = result.filter((l: any) => l.createdByName === params.initialName);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((l: any) =>
        [l.region, l.propertyType, l.ownerName, l.ownerPhone, l.description]
          .filter(Boolean).join(" ").toLowerCase().includes(q)
      );
    }
    return result;
  }, [listings, search, statusFilter, params.initialRole, params.initialPkg]);

  const allSelected = filtered.length > 0 && filtered.every(l => selectedIds.has(l.id));

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(l => l.id)));
    }
  }, [allSelected, filtered]);

  const closeDialog = useCallback(() => setDialog(null), []);

  const handleConfirm = useCallback(async () => {
    if (!dialog) return;
    const { type, id } = dialog;
    closeDialog();

    if (type === "approve" && id) approve(id);
    else if (type === "reject" && id) reject(id);
    else if (type === "delete" && id) deleteListing(id).catch(() => {});
    else if (type === "hardDelete" && id) hardDeleteListing(id).catch(() => {});
    else if (type === "bulkDelete") {
      const ids = [...selectedIds];
      setSelectedIds(new Set());
      setSelectMode(false);
      for (const itemId of ids) {
        await deleteListing(itemId).catch(() => {});
      }
      refetch();
    } else if (type === "bulkHardDelete") {
      const ids = [...selectedIds];
      setSelectedIds(new Set());
      setSelectMode(false);
      for (const itemId of ids) {
        await hardDeleteListing(itemId).catch(() => {});
      }
      refetch();
    }
  }, [dialog, approve, reject, deleteListing, hardDeleteListing, closeDialog, selectedIds, refetch]);

  // ── تصدير ومشاركة البطاقات مباشرة (نفس أسلوب CardViewerScreen) ──────────
  const handleExport = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length || isGenerating) return;

    if (ids.length > 50) {
      Alert.alert("تنبيه", "الحد الأقصى 50 إعلان للتصدير دفعة واحدة");
      return;
    }

    if (Platform.OS !== "web") {
      // native: فتح CardViewerScreen بوضع التصدير التلقائي (captureRef)
      const selectedListings = filtered.filter((l: any) => ids.includes(l.id));
      setListingsForViewer(selectedListings, 0, true, true);
      setSelectedIds(new Set());
      setSelectMode(false);
      router.push("/(admin)/cards");
      return;
    }

    // web: جلب الصور من السيرفر
    const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
    exportTotalRef.current = ids.length;
    setGeneratingProgress(0);
    setIsGenerating(true);

    try {
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
    } catch (err) {
      const msg = String(err instanceof Error ? err.message : err);
      const lower = msg.toLowerCase();
      if (!lower.includes("cancel") && !lower.includes("dismiss") && !lower.includes("user did not")) {
        Alert.alert("خطأ في التصدير", msg);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [selectedIds, isGenerating, filtered]);

  // ── مشاركة البطاقات من الـ URIs المحملة مسبقاً ─────────────────────────
  const handleShareAll = useCallback(async () => {
    if (!previewUris.length || isSharingAll) return;
    setIsSharingAll(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("تنبيه", "المشاركة غير متاحة على هذا الجهاز");
        return;
      }
      for (const uri of previewUris) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "بطاقة عقارية",
          UTI: "public.png",
        });
      }
    } catch (err) {
      const msg = String(err instanceof Error ? err.message : err).toLowerCase();
      if (!msg.includes("cancel") && !msg.includes("dismiss") && !msg.includes("user did not share")) {
        Alert.alert("خطأ", "تعذرت المشاركة");
      }
    } finally {
      setIsSharingAll(false);
    }
  }, [previewUris, isSharingAll]);

  const openCard = useCallback((index: number) => {
    if (!filtered.length || index < 0 || index >= filtered.length) return;
    const BUFFER = 25;
    const start = Math.max(0, index - BUFFER);
    const end = Math.min(filtered.length - 1, index + BUFFER);
    const slice = filtered.slice(start, end + 1);
    const adjustedIndex = index - start;
    setListingsForViewer(slice as any[], adjustedIndex, true);
    router.push("/(admin)/cards");
  }, [filtered]);

  const handleShareWhatsApp = useCallback((item: any) => {
    const text = buildShareText(item);
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
  }, []);

  const dialogConfig = dialog ? ({
    approve:       { title: "نشر الإعلان",        message: "سيتم نشر الإعلان ويظهر للزوار",           confirmText: "نشر ✓",          destructive: false },
    reject:        { title: "رفض الإعلان",        message: "سيتم رفض الإعلان وإخفاؤه",               confirmText: "رفض ✗",          destructive: false },
    delete:        { title: "حذف الإعلان",        message: "سيُنقل الإعلان إلى قسم المحذوفات",       confirmText: "حذف 🗑",          destructive: true },
    hardDelete:    { title: "حذف نهائي",           message: "سيُحذف الإعلان نهائياً بلا رجعة",        confirmText: "حذف نهائي 🗑",    destructive: true },
    bulkDelete:    { title: `حذف ${selectedIds.size} إعلان`, message: "ستُنقل الإعلانات المحددة إلى قسم المحذوفات", confirmText: "حذف 🗑", destructive: true },
    bulkHardDelete:{ title: `حذف نهائي ${selectedIds.size} إعلان`, message: "ستُحذف نهائياً بلا رجعة", confirmText: "حذف نهائي 🗑",  destructive: true },
  } as any)[dialog.type!] : null;

  const screenTitle = params.screenTitle || "الأرشيف";
  const isDeletedView = statusFilter === "deleted";
  const pendingCount = isSourceMode ? filtered.length : 0;

  return (
    <View style={styles.container}>
      <AppHeader title={screenTitle} showBack />

      <ConfirmModal
        visible={!!dialog && !!dialogConfig}
        title={dialogConfig?.title ?? ""}
        message={dialogConfig?.message ?? ""}
        confirmText={dialogConfig?.confirmText}
        destructive={dialogConfig?.destructive}
        onConfirm={handleConfirm}
        onCancel={closeDialog}
      />

      {/* ── Modal التقدم ──────────────────────────────────────────────── */}
      <Modal transparent animationType="fade" visible={isGenerating}>
        <View style={styles.progressOverlay}>
          <View style={styles.progressBox}>
            <Text style={styles.progressIcon}>⬇️</Text>
            <Text style={styles.progressTitle}>جاري التصدير...</Text>
            <Text style={styles.progressCount}>
              {generatingProgress} / {exportTotalRef.current}
            </Text>
          </View>
        </View>
      </Modal>

      {/* ── شاشة المعاينة ─────────────────────────────────────────────── */}
      <Modal animationType="slide" visible={previewVisible} onRequestClose={() => setPreviewVisible(false)}>
        <View style={styles.previewContainer}>

          {/* Header */}
          <View style={styles.previewHeader}>
            <Pressable
              style={styles.previewCloseBtn}
              onPress={() => setPreviewVisible(false)}
            >
              <Text style={styles.previewCloseTxt}>✕ إغلاق</Text>
            </Pressable>

            <Text style={styles.previewTitle}>{previewUris.length} بطاقة جاهزة</Text>

            <Pressable
              style={[styles.previewShareBtn, isSharingAll && { opacity: 0.6 }]}
              onPress={handleShareAll}
              disabled={isSharingAll}
            >
              {isSharingAll
                ? <ActivityIndicator size="small" color={C.bgDark} />
                : <Text style={styles.previewShareTxt}>مشاركة الكل ↑</Text>
              }
            </Pressable>
          </View>

          {/* تلميح */}
          <Text style={styles.previewHint}>
            اضغط "مشاركة الكل" لإرسال جميع البطاقات دفعة واحدة | أو تنزيل كل بطاقة على حدة
          </Text>

          {/* البطاقات */}
          <ScrollView contentContainerStyle={styles.previewScroll}>
            {previewUris.map((uri, i) => (
              <View key={i} style={styles.previewCardWrap}>
                <Image
                  source={{ uri }}
                  style={styles.previewCardImg}
                  resizeMode="contain"
                />
                <Pressable
                  style={styles.previewSingleShareBtn}
                  onPress={async () => {
                    try {
                      if (await Sharing.isAvailableAsync()) {
                        await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "بطاقة عقارية", UTI: "public.png" });
                      }
                    } catch {}
                  }}
                >
                  <Text style={styles.previewSingleShareTxt}>↑ مشاركة هذه البطاقة</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>

        </View>
      </Modal>

      {isSourceMode ? (
        <View style={styles.sourceHeader}>
          <Text style={styles.sourceSubtitle}>الطلبات المعلقة بانتظار المراجعة</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{pendingCount} إعلان</Text>
          </View>
        </View>
      ) : (
        <View style={styles.tabsRow}>
          {ARCHIVE_TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, statusFilter === t.key && styles.tabActive,
                statusFilter === t.key && t.color ? { backgroundColor: t.color, borderColor: t.color } : null]}
              onPress={() => setStatusFilter(t.key)}
            >
              <Text style={[styles.tabText, statusFilter === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* شريط البحث + زر التحديد */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="ابحث عن منطقة، مالك، هاتف..."
          placeholderTextColor={C.textMuted}
          textAlign="right"
        />
        <TouchableOpacity
          style={[styles.selectBtn, selectMode && styles.selectBtnActive]}
          onPress={toggleSelectMode}
        >
          <Text style={[styles.selectBtnText, selectMode && styles.selectBtnTextActive]}>
            {selectMode ? "إلغاء" : "تحديد"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* شريط التحديد الكلي */}
      {selectMode && (
        <View>
          <View style={styles.selectBar}>
            <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllBtn}>
              <View style={[styles.checkbox, allSelected && styles.checkboxChecked]}>
                {allSelected && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.selectAllText}>
                {allSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}
              </Text>
            </TouchableOpacity>
            <Text style={styles.selectedCount}>
              {selectedIds.size > 0 ? `${selectedIds.size} محدد` : ""}
            </Text>
          </View>

          {/* شريط الإجراءات الجماعية — أفقي */}
          {selectedIds.size > 0 && (
            <View style={styles.bulkBar}>
              {/* ✕ إلغاء */}
              <TouchableOpacity
                style={styles.bulkCancel}
                onPress={toggleSelectMode}
              >
                <Text style={styles.bulkCancelText}>✕</Text>
              </TouchableOpacity>

              {/* 🗑 حذف */}
              <TouchableOpacity
                style={styles.bulkDelete}
                disabled={isGenerating}
                onPress={() => setDialog({ type: isDeletedView ? "bulkHardDelete" : "bulkDelete" })}
              >
                <Text style={styles.bulkDeleteText}>🗑</Text>
              </TouchableOpacity>

              {/* 📤 تصدير */}
              <Pressable
                style={[styles.bulkExport, isGenerating && { opacity: 0.5 }]}
                onPress={handleExport}
                disabled={isGenerating}
              >
                <Text style={styles.bulkExportText}>
                  📤 تصدير ({selectedIds.size})
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.gold} />
          {slowLoad && (
            <>
              <Text style={styles.slowText}>جارٍ تحميل البيانات…</Text>
              <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
                <Text style={styles.retryText}>إعادة المحاولة</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>{isSourceMode ? "🎉" : "🗂️"}</Text>
          <Text style={styles.emptyText}>
            {isSourceMode ? "لا توجد طلبات معلقة" : "لا توجد إعلانات"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          extraData={[processingId, selectMode, selectedIds]}
          renderItem={({ item, index }) => {
            const busy = processingId === item.id;
            const isSelected = selectedIds.has(item.id);

            return (
              <View>
                {selectMode && (
                  <TouchableOpacity
                    style={[styles.selectOverlay, isSelected && styles.selectOverlayActive]}
                    onPress={() => toggleSelect(item.id)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.cardCheckbox, isSelected && styles.cardCheckboxChecked]}>
                      {isSelected && <Text style={styles.cardCheckmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                )}

                {isDeletedView ? (
                  <ListingCard
                    listing={item as any}
                    onOpen={selectMode ? () => {} : () => openCard(index)}
                    onDelete={!selectMode && !busy ? () => setDialog({ type: "hardDelete", id: item.id }) : undefined}
                    onEdit={!selectMode ? () => openArchiveEdit(item) : undefined}
                    onShareWhatsApp={!selectMode ? () => handleShareWhatsApp(item) : undefined}
                    showActions={!selectMode}
                    deleteLabelOverride="حذف نهائي 🗑"
                  />
                ) : (
                  <ListingCard
                    listing={item as any}
                    onOpen={selectMode ? () => {} : () => openCard(index)}
                    onApprove={!selectMode && item.status !== "approved" && !busy ? () => setDialog({ type: "approve", id: item.id }) : undefined}
                    onReject={!selectMode && item.status !== "rejected" && !busy ? () => setDialog({ type: "reject", id: item.id }) : undefined}
                    onDelete={!selectMode && !busy ? () => setDialog({ type: "delete", id: item.id }) : undefined}
                    onEdit={!selectMode ? () => openArchiveEdit(item) : undefined}
                    onShareWhatsApp={!selectMode ? () => handleShareWhatsApp(item) : undefined}
                    approveLabelOverride={isSourceMode ? "نشر ✓" : undefined}
                    showActions={!selectMode}
                  />
                )}
              </View>
            );
          }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.gold} />}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      {/* ── موديل تعديل الإعلان ──────────────────────────────────────────── */}
      <Modal visible={!!editListing} animationType="slide" onRequestClose={() => setEditListing(null)}>
        <View style={styles.editModalContainer}>
          <View style={styles.editModalHeader}>
            <TouchableOpacity onPress={() => setEditListing(null)} style={styles.editCancelBtn}>
              <Text style={styles.editCancelTxt}>✕ إلغاء</Text>
            </TouchableOpacity>
            <Text style={styles.editModalTitle}>تعديل الإعلان</Text>
            <TouchableOpacity
              onPress={saveArchiveEdit}
              style={styles.editSaveBtn}
            >
              <Text style={styles.editSaveTxt}>حفظ ✓</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.editScroll} keyboardShouldPersistTaps="handled">
            {([
              ["propertyType", "نوع العقار"],
              ["region",       "المنطقة"],
              ["projectName",  "اسم المشروع"],
              ["ownerName",    "اسم المالك"],
              ["ownerPhone",   "هاتف المالك"],
              ["mapsLink",     "رابط الخريطة"],
              ["description",  "الوصف"],
            ] as [string, string][]).map(([key, label]) => (
              <View key={key} style={styles.editField}>
                <Text style={styles.editLabel}>{label}</Text>
                <TextInput
                  style={[styles.editInput, key === "description" && { height: 90, textAlignVertical: "top" }]}
                  value={editForm[key] ?? ""}
                  onChangeText={v => setEditForm(prev => ({ ...prev, [key]: v }))}
                  multiline={key === "description"}
                  placeholderTextColor={C.textMuted}
                />
              </View>
            ))}

            {/* ── حقول السعر/المساحة/الطابق للإعلانات البسيطة فقط ── */}
            {editFloors.length === 0 && (
              <>
                {([
                  ["price", "السعر"],
                  ["area",  "المساحة"],
                  ["floor", "الطابق"],
                ] as [string, string][]).map(([key, label]) => (
                  <View key={key} style={styles.editField}>
                    <Text style={styles.editLabel}>{label}</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editForm[key] ?? ""}
                      onChangeText={v => setEditForm(prev => ({ ...prev, [key]: v }))}
                      placeholderTextColor={C.textMuted}
                      keyboardType={key !== "floor" ? "numeric" : "default"}
                    />
                  </View>
                ))}
              </>
            )}

            {/* ── محرر الطوابق ── */}
            {editFloors.length > 0 && (
              <View style={styles.floorsSection}>
                <Text style={styles.floorsSectionTitle}>الطوابق</Text>

                {/* رأس الجدول — الترتيب في الكود: حذف | اسم | مساحة | سعر → يظهر RTL: حذف(يمين) | اسم | مساحة | سعر(يسار) */}
                <View style={styles.floorHeaderRow}>
                  <View style={{ width: 36 }} />
                  <Text style={[styles.floorHeaderCell, { flex: 2.5 }]}>الطابق</Text>
                  <Text style={[styles.floorHeaderCell, { flex: 1.5 }]}>المساحة</Text>
                  <Text style={[styles.floorHeaderCell, { flex: 1.5 }]}>السعر</Text>
                </View>

                {editFloors.map((fl, idx) => (
                  <View key={idx} style={styles.floorRow}>
                    <TouchableOpacity
                      style={styles.floorDeleteBtn}
                      onPress={() => setEditFloors(prev => prev.filter((_, i) => i !== idx))}
                    >
                      <Text style={styles.floorDeleteTxt}>✕</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.floorInput, { flex: 2.5 }]}
                      value={fl.name}
                      onChangeText={v => setEditFloors(prev => prev.map((r, i) => i === idx ? { ...r, name: v } : r))}
                      placeholder="اسم الطابق"
                      placeholderTextColor={C.textMuted}
                      textAlign="right"
                    />
                    <TextInput
                      style={[styles.floorInput, { flex: 1.5 }]}
                      value={fl.area}
                      onChangeText={v => setEditFloors(prev => prev.map((r, i) => i === idx ? { ...r, area: v } : r))}
                      placeholder="م²"
                      placeholderTextColor={C.textMuted}
                      textAlign="right"
                    />
                    <TextInput
                      style={[styles.floorInput, { flex: 1.5 }]}
                      value={fl.price}
                      onChangeText={v => setEditFloors(prev => prev.map((r, i) => i === idx ? { ...r, price: v } : r))}
                      placeholder="السعر"
                      placeholderTextColor={C.textMuted}
                      textAlign="right"
                    />
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.addFloorBtn}
                  onPress={() => setEditFloors(prev => [...prev, { name: "", area: "", price: "" }])}
                >
                  <Text style={styles.addFloorTxt}>+ إضافة طابق</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* زر إضافة طوابق لإعلانات الشقق البسيطة */}
            {editFloors.length === 0 && (editForm.propertyType || "").includes("شق") && (
              <TouchableOpacity
                style={styles.addFloorBtn}
                onPress={() => setEditFloors([{ name: "", area: "", price: "" }])}
              >
                <Text style={styles.addFloorTxt}>+ تحويل إلى طوابق</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // ── Progress Modal ────────────────────────────────────────────────────────
  progressOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center", alignItems: "center",
  },
  progressBox: {
    backgroundColor: C.bgDark, borderRadius: 20, padding: 36,
    alignItems: "center", gap: 12,
    borderWidth: 1, borderColor: C.gold,
    minWidth: 200,
  },
  progressIcon:  { fontSize: 40 },
  progressTitle: { color: C.gold, fontSize: 18, fontWeight: "700" },
  progressCount: { color: C.white, fontSize: 22, fontWeight: "900" },

  // ── Preview Modal ─────────────────────────────────────────────────────────
  previewContainer: { flex: 1, backgroundColor: C.bg },
  previewHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 14,
    backgroundColor: C.bgDark, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  previewCloseBtn: {
    backgroundColor: "#5C1A1A", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  previewCloseTxt: { color: "#FFB3B3", fontWeight: "700", fontSize: 13 },
  previewTitle:   { color: C.gold, fontSize: 15, fontWeight: "800" },
  previewShareBtn: {
    backgroundColor: C.gold, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
    minWidth: 90, alignItems: "center",
  },
  previewShareTxt: { color: C.bgDark, fontWeight: "800", fontSize: 13 },
  previewHint: {
    color: C.textMuted, fontSize: 11, textAlign: "center",
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: C.bgDark,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  previewScroll:  { padding: 16, gap: 20, paddingBottom: 40 },
  previewCardWrap: { alignItems: "center", gap: 8 },
  previewCardImg: { width: "100%", height: 460, borderRadius: 12 },
  previewSingleShareBtn: {
    backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 20, paddingVertical: 8,
  },
  previewSingleShareTxt: { color: C.gold, fontSize: 13, fontWeight: "600" },

  // ── Header / Tabs ─────────────────────────────────────────────────────────
  sourceHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: C.bgDark, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  sourceSubtitle: { color: C.textMuted, fontSize: 13 },
  countBadge: { backgroundColor: C.gold, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  countText:  { color: C.bgDark, fontWeight: "800", fontSize: 13 },
  searchRow:  { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 8, gap: 8, alignItems: "center" },
  searchInput: {
    flex: 1,
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.inputBorder,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: C.white, fontSize: 14,
  },
  selectBtn: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
  },
  selectBtnActive:     { backgroundColor: C.gold, borderColor: C.gold },
  selectBtnText:       { color: C.textMuted, fontSize: 13, fontWeight: "600" },
  selectBtnTextActive: { color: C.bgDark, fontWeight: "800" },
  selectBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: C.bgDark, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  selectAllBtn:  { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.gold,
    alignItems: "center", justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: C.gold },
  checkmark:       { color: C.bgDark, fontWeight: "900", fontSize: 13 },
  selectAllText:   { color: C.gold, fontSize: 13, fontWeight: "600" },
  selectedCount:   { color: C.goldLight, fontSize: 13, fontWeight: "700" },
  tabsRow: { flexDirection: "row", paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6, gap: 8 },
  tab:     { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: "center" },
  tabActive:     { backgroundColor: C.gold, borderColor: C.gold },
  tabText:       { color: C.textMuted, fontSize: 12 },
  tabTextActive: { color: C.bgDark, fontWeight: "800" },
  center:    { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  emptyIcon: { fontSize: 52 },
  emptyText: { color: C.textMuted, fontSize: 16 },
  slowText:  { color: C.textMuted, fontSize: 14, marginTop: 8 },
  retryBtn:  { marginTop: 12, backgroundColor: C.gold, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: C.bgDark, fontWeight: "700", fontSize: 15 },

  // ── Bulk Action Bar ───────────────────────────────────────────────────────
  bulkBar: {
    flexDirection: "row", gap: 8, padding: 10,
    backgroundColor: C.bgDark, borderTopWidth: 1, borderTopColor: C.border,
    alignItems: "center",
  },
  bulkCancel: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    alignItems: "center", justifyContent: "center",
  },
  bulkCancelText: { color: C.textMuted, fontSize: 18, fontWeight: "700" },
  bulkDelete: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: "#7B2020",
    alignItems: "center", justifyContent: "center",
  },
  bulkDeleteText: { fontSize: 20 },
  bulkExport: {
    flex: 1, height: 44, borderRadius: 10,
    backgroundColor: C.gold,
    alignItems: "center", justifyContent: "center",
  },
  bulkExportText: { color: C.bgDark, fontWeight: "800", fontSize: 15 },

  // ── Card Selection ────────────────────────────────────────────────────────
  selectOverlay: {
    position: "absolute", top: 8, right: 8, zIndex: 10,
    width: 30, height: 30, borderRadius: 12, borderWidth: 2, borderColor: "transparent",
  },
  selectOverlayActive: { borderColor: C.gold, backgroundColor: "rgba(201,160,34,0.08)" },
  cardCheckbox: {
    position: "absolute", top: 10, right: 10,
    width: 26, height: 26, borderRadius: 8, borderWidth: 2.5, borderColor: C.gold,
    backgroundColor: C.bgDark, alignItems: "center", justifyContent: "center",
  },
  cardCheckboxChecked: { backgroundColor: C.gold },
  cardCheckmark: { color: C.bgDark, fontWeight: "900", fontSize: 15 },

  // ── Edit Modal ────────────────────────────────────────────────────────────
  editModalContainer: { flex: 1, backgroundColor: C.bg },
  editModalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 14,
    backgroundColor: C.bgDark, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  editModalTitle: { color: C.gold, fontSize: 16, fontWeight: "800" },
  editCancelBtn: {
    backgroundColor: "#5C1A1A", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  editCancelTxt: { color: "#FFB3B3", fontWeight: "700", fontSize: 13 },
  editSaveBtn: {
    backgroundColor: C.gold, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8, minWidth: 90, alignItems: "center",
  },
  editSaveTxt: { color: C.bgDark, fontWeight: "800", fontSize: 13 },
  editScroll: { padding: 16, gap: 14, paddingBottom: 50 },
  editField: { gap: 4 },
  editLabel: { color: C.textMuted, fontSize: 12, fontWeight: "600" },
  editInput: {
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.inputBorder,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    color: C.white, fontSize: 14, textAlign: "right",
  },

  // ── Floors Editor ─────────────────────────────────────────────────────────
  floorsSection: {
    borderWidth: 1, borderColor: C.border, borderRadius: 12,
    marginTop: 4,
  },
  floorsSectionTitle: {
    color: C.gold, fontSize: 13, fontWeight: "800",
    backgroundColor: C.bgDark, paddingHorizontal: 14, paddingVertical: 8,
    textAlign: "right",
  },
  floorHeaderRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(201,160,34,0.1)",
    paddingHorizontal: 8, paddingVertical: 6, gap: 4,
  },
  floorHeaderCell: {
    color: C.goldLight, fontSize: 11, fontWeight: "700", textAlign: "center",
  },
  floorRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 8, paddingVertical: 6, gap: 4,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  floorInput: {
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.inputBorder,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7,
    color: C.white, fontSize: 12,
  },
  floorDeleteBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "#5C1A1A",
    alignItems: "center", justifyContent: "center",
  },
  floorDeleteTxt: { color: "#FFB3B3", fontSize: 14, fontWeight: "700" },
  addFloorBtn: {
    marginTop: 8, borderWidth: 1, borderColor: C.gold, borderRadius: 10,
    borderStyle: "dashed", paddingVertical: 10, alignItems: "center",
  },
  addFloorTxt: { color: C.gold, fontSize: 13, fontWeight: "700" },
});
