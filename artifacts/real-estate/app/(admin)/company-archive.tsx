import React, { useState, useMemo, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, Linking,
} from "react-native";
import { useGetListings, getGetListingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import AppHeader from "@/components/AppHeader";
import ConfirmModal from "@/components/ConfirmModal";
import C from "@/constants/colors";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

type Entry = {
  ownerName: string;
  ownerPhone: string;
  enteredBy: string;
  region: string;
  listingIds: number[];
};

export default function CompanyArchiveScreen() {
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const QUERY_PARAMS = { includeDeleted: "true" } as any;
  const { data: raw = [], isLoading, isRefetching, refetch } = useGetListings(
    QUERY_PARAMS,
    {
      query: {
        queryKey: getGetListingsQueryKey(QUERY_PARAMS),
        staleTime: 60_000,
        gcTime: 5 * 60 * 1000,
        refetchOnMount: true,
      }
    }
  );

  const entries = useMemo(() => {
    const listings: any[] = Array.isArray(raw) ? raw : [];
    const map = new Map<string, Entry>();

    for (const l of listings) {
      if (l.createdByRole === "visitor") continue;

      const phone = l.ownerPhone?.trim() || "";
      const name  = l.ownerName?.trim()  || "";

      if (!phone && !name) continue;

      const key = phone || name;

      if (map.has(key)) {
        map.get(key)!.listingIds.push(l.id);
      } else {
        map.set(key, {
          ownerName:  name  || "—",
          ownerPhone: phone || "—",
          enteredBy:  l.createdByName?.trim() || l.createdByRole || "—",
          region:     l.region?.trim() || "—",
          listingIds: [l.id],
        });
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      a.ownerName.localeCompare(b.ownerName, "ar")
    );
  }, [raw]);

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return entries;
    return entries.filter(e =>
      e.ownerName.includes(q) ||
      e.ownerPhone.includes(q) ||
      e.enteredBy.includes(q) ||
      e.region.includes(q)
    );
  }, [entries, search]);

  const callOwner = useCallback((phone: string) => {
    Linking.openURL(`tel:${phone}`);
  }, []);

  const whatsappOwner = useCallback((phone: string) => {
    const clean = phone.replace(/[^0-9+]/g, "");
    Linking.openURL(`https://wa.me/${clean}`);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      await Promise.all(
        deleteTarget.listingIds.map(id =>
          fetch(`${BASE_URL}/api/listings/${id}/hard-delete`, { method: "POST" })
        )
      );
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
    } catch {}
    setIsDeleting(false);
    setDeleteTarget(null);
  }, [deleteTarget, isDeleting, refetch, queryClient]);

  return (
    <View style={styles.container}>
      <AppHeader title="🏢 ارشيف الشركات" showBack />

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="ابحث بالشركة أو الهاتف أو الاسم..."
          placeholderTextColor={C.textMuted}
          textAlign="right"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} style={styles.clearBtn}>
            <Text style={styles.clearTxt}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.countRow}>
        <Text style={styles.countTxt}>{filtered.length} مالك عقار مسجّل</Text>
      </View>

      {/* رأس الجدول */}
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, styles.headerCellRight]}>رقم هاتف المالك</Text>
        <View style={styles.colDivider} />
        <Text style={[styles.headerCell, styles.headerCellMid]}>اسم صاحب العقار</Text>
        <View style={styles.colDivider} />
        <Text style={[styles.headerCell, styles.headerCellLeft]}>المنطقة</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.gold} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🏢</Text>
          <Text style={styles.emptyText}>
            {entries.length === 0
              ? "لا توجد بيانات بعد"
              : "لا توجد نتائج للبحث"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.ownerPhone}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshing={isRefetching}
          onRefresh={refetch}
          renderItem={({ item, index }) => (
            <View style={[styles.row, index % 2 === 1 && styles.rowAlt]}>
              {/* العمود الأيمن: هاتف المالك */}
              <View style={styles.phoneCol}>
                <Text style={styles.phoneNum}>{item.ownerPhone}</Text>
                <View style={styles.actionBtns}>
                  {/* زر الحذف — أول في الكود = أقصى اليمين في RTL */}
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => setDeleteTarget(item)}
                  >
                    <Text style={styles.deleteTxt}>🗑️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => callOwner(item.ownerPhone)}
                  >
                    <Text style={styles.callTxt}>📞</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.waBtn}
                    onPress={() => whatsappOwner(item.ownerPhone)}
                  >
                    <Text style={styles.waTxt}>💬</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.colDivider} />

              {/* العمود الأوسط: اسم صاحب العقار */}
              <View style={styles.companyCol}>
                <Text style={styles.companyName}>{item.ownerName}</Text>
                {item.enteredBy !== "—" && (
                  <Text style={styles.enteredByTxt}>مدخِل: {item.enteredBy}</Text>
                )}
              </View>

              <View style={styles.colDivider} />

              {/* العمود الأيسر: المنطقة */}
              <View style={styles.regionCol}>
                <Text style={styles.regionTxt}>{item.region}</Text>
              </View>
            </View>
          )}
        />
      )}

      <ConfirmModal
        visible={!!deleteTarget}
        title="حذف الشركة"
        message={`هل أنت متأكد من حذف "${deleteTarget?.ownerName}"؟\nسيتم حذف ${deleteTarget?.listingIds.length ?? 0} إعلان مرتبط بها نهائياً.`}
        confirmText={isDeleting ? "جارٍ الحذف..." : "حذف نهائي"}
        cancelText="إلغاء"
        destructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => { if (!isDeleting) setDeleteTarget(null); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  searchRow: {
    flexDirection: "row", paddingHorizontal: 14, paddingVertical: 8,
    gap: 8, alignItems: "center",
  },
  searchInput: {
    flex: 1, backgroundColor: C.card, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    color: C.white, fontSize: 14, borderWidth: 1, borderColor: C.border,
  },
  clearBtn: {
    backgroundColor: C.card, borderRadius: 8, padding: 8,
    borderWidth: 1, borderColor: C.border,
  },
  clearTxt: { color: C.textMuted, fontSize: 14 },
  countRow: {
    paddingHorizontal: 16, paddingVertical: 6,
    backgroundColor: C.bgDark, borderBottomWidth: 1, borderColor: C.border,
  },
  countTxt: { color: C.textMuted, fontSize: 12, textAlign: "right" },

  tableHeader: {
    flexDirection: "row", backgroundColor: C.bgDark,
    borderBottomWidth: 2, borderBottomColor: C.gold,
    paddingVertical: 10,
  },
  headerCell: {
    flex: 1, color: C.gold, fontSize: 13,
    fontWeight: "800", paddingHorizontal: 12,
  },
  headerCellRight: { textAlign: "right" },
  headerCellMid:   { textAlign: "center" },
  headerCellLeft:  { textAlign: "left" },
  colDivider: { width: 1, backgroundColor: C.border },

  row: {
    flexDirection: "row", borderBottomWidth: 1,
    borderBottomColor: C.border, backgroundColor: C.card,
    minHeight: 64,
  },
  rowAlt: { backgroundColor: C.bgDark },

  phoneCol: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 10,
    justifyContent: "center", alignItems: "flex-end", gap: 4,
  },
  phoneNum: {
    color: C.gold, fontSize: 15, fontWeight: "800", textAlign: "right",
  },
  actionBtns: { flexDirection: "row", gap: 6, marginTop: 4 },
  deleteBtn: {
    backgroundColor: "rgba(200,40,40,0.18)", borderRadius: 8,
    paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: "rgba(200,40,40,0.45)",
  },
  deleteTxt: { fontSize: 13 },
  callBtn: {
    backgroundColor: "rgba(43,122,75,0.3)", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: "#2B7A4B",
  },
  callTxt: { fontSize: 14 },
  waBtn: {
    backgroundColor: "rgba(37,211,102,0.15)", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: "rgba(37,211,102,0.4)",
  },
  waTxt: { fontSize: 14 },

  companyCol: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 10,
    justifyContent: "center", alignItems: "flex-start", gap: 4,
  },
  companyName: {
    color: C.white, fontSize: 14, fontWeight: "700", textAlign: "left",
  },
  enteredByTxt: {
    color: C.textMuted, fontSize: 11, textAlign: "left", marginTop: 2,
  },
  regionCol: {
    flex: 1, paddingHorizontal: 10, paddingVertical: 10,
    justifyContent: "center", alignItems: "flex-start",
  },
  regionTxt: {
    color: C.goldLight, fontSize: 13, fontWeight: "600", textAlign: "left",
  },

  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: C.textMuted, fontSize: 15 },
});
