import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from "react-native";
import AppHeader from "@/components/AppHeader";
import ConfirmModal from "@/components/ConfirmModal";
import C from "@/constants/colors";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

type DupListing = {
  id: number;
  cardNumber: number;
  ownerPhone: string;
  ownerName: string;
  propertyType: string;
  region: string;
  price: string;
  area: string;
  status: string;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  approved: "✅ معتمد",
  pending:  "⏳ معلق",
  rejected: "❌ مرفوض",
};

const STATUS_COLOR: Record<string, string> = {
  approved: "#2B7A4B",
  pending:  C.gold,
  rejected: C.error,
};

export default function DuplicatesScreen() {
  const [groups, setGroups]       = useState<DupListing[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [confirmTarget, setConfirmTarget] = useState<{ keepId: number; deleteIds: number[] } | null>(null);
  const [isProcessing, setIsProcessing]   = useState(false);

  const fetchDuplicates = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/listings/duplicates`);
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch {}
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => { fetchDuplicates(); }, [fetchDuplicates]);

  const handleKeep = useCallback((group: DupListing[], keepId: number) => {
    const deleteIds = group.filter(l => l.id !== keepId).map(l => l.id);
    setConfirmTarget({ keepId, deleteIds });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!confirmTarget) return;
    const { keepId, deleteIds } = confirmTarget;
    setConfirmTarget(null);
    setIsProcessing(true);
    try {
      await Promise.all(
        deleteIds.map(id =>
          fetch(`${BASE_URL}/api/listings/${id}/hard-delete`, { method: "POST" })
        )
      );
      await fetch(`${BASE_URL}/api/listings/${keepId}/approve`, { method: "POST" });
    } catch {}
    setIsProcessing(false);
    fetchDuplicates();
  }, [confirmTarget, fetchDuplicates]);

  const renderGroup = useCallback(({ item: group, index }: { item: DupListing[]; index: number }) => (
    <View style={S.groupCard}>
      <View style={S.groupHeader}>
        <Text style={S.groupNum}>مجموعة {index + 1}</Text>
        <Text style={S.groupCount}>{group.length} إعلانات مكررة</Text>
      </View>
      <View style={S.groupMeta}>
        <Text style={S.groupMetaText}>
          👤 {group[0].ownerName || "—"}  ·  📱 {group[0].ownerPhone}
        </Text>
        <Text style={S.groupMetaText}>
          🏠 {group[0].propertyType || "—"}  ·  📍 {group[0].region || "—"}
        </Text>
      </View>

      {group.map((listing) => (
        <View key={listing.id} style={S.listingRow}>
          <View style={S.listingInfo}>
            <View style={S.listingTopRow}>
              <Text style={S.cardNum}>#{listing.cardNumber || listing.id}</Text>
              <View style={[S.statusBadge, { backgroundColor: STATUS_COLOR[listing.status] + "33", borderColor: STATUS_COLOR[listing.status] }]}>
                <Text style={[S.statusText, { color: STATUS_COLOR[listing.status] }]}>
                  {STATUS_LABEL[listing.status] || listing.status}
                </Text>
              </View>
            </View>
            {listing.price ? <Text style={S.listingDetail}>💰 {listing.price} د</Text> : null}
            {listing.area  ? <Text style={S.listingDetail}>📐 {listing.area} م²</Text> : null}
          </View>
          <TouchableOpacity
            style={[S.keepBtn, isProcessing && S.keepBtnDisabled]}
            onPress={() => handleKeep(group, listing.id)}
            disabled={isProcessing}
          >
            <Text style={S.keepBtnText}>احتفظ بهذا{"\n"}وامسح الباقي</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  ), [handleKeep, isProcessing]);

  return (
    <View style={S.container}>
      <AppHeader title="🔁 الإعلانات المكررة" showBack />

      <ConfirmModal
        visible={!!confirmTarget}
        title="تأكيد الاحتفاظ بإعلان واحد"
        message={`سيتم اعتماد الإعلان المختار وحذف ${(confirmTarget?.deleteIds.length ?? 0)} إعلان نهائياً. هل أنت متأكد؟`}
        confirmText="تأكيد 🗑"
        destructive
        onConfirm={handleConfirm}
        onCancel={() => setConfirmTarget(null)}
      />

      {isLoading ? (
        <View style={S.center}>
          <ActivityIndicator size="large" color={C.gold} />
          <Text style={S.loadingText}>جار فحص المكررات...</Text>
        </View>
      ) : groups.length === 0 ? (
        <View style={S.center}>
          <Text style={S.emptyIcon}>✅</Text>
          <Text style={S.emptyText}>لا توجد إعلانات مكررة</Text>
          <Text style={S.emptySubText}>جميع الإعلانات فريدة</Text>
        </View>
      ) : (
        <>
          <View style={S.summaryBar}>
            <Text style={S.summaryText}>
              {groups.length} مجموعة مكررة · {groups.reduce((s, g) => s + g.length, 0)} إعلان
            </Text>
          </View>
          <FlatList
            data={groups}
            keyExtractor={(_, i) => String(i)}
            renderItem={renderGroup}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => fetchDuplicates(true)} tintColor={C.gold} />
            }
            contentContainerStyle={S.list}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          />
        </>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { color: C.textMuted, fontSize: 14 },
  emptyIcon: { fontSize: 56 },
  emptyText: { color: C.white, fontSize: 17, fontWeight: "700" },
  emptySubText: { color: C.textMuted, fontSize: 13 },

  summaryBar: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: "rgba(201,160,34,0.08)",
  },
  summaryText: { color: C.gold, fontSize: 13, fontWeight: "700", textAlign: "right" },

  list: { padding: 12, paddingBottom: 32 },

  groupCard: {
    backgroundColor: C.card, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.border, overflow: "hidden",
  },
  groupHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "rgba(201,160,34,0.12)", paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  groupNum: { color: C.gold, fontSize: 14, fontWeight: "800" },
  groupCount: { color: C.error, fontSize: 12, fontWeight: "700" },

  groupMeta: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: C.border, gap: 3,
  },
  groupMetaText: { color: C.textMuted, fontSize: 12, textAlign: "right" },

  listingRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
  },
  listingInfo: { flex: 1, gap: 4 },
  listingTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 },
  cardNum: { color: C.textMuted, fontSize: 12 },
  statusBadge: {
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: "700" },
  listingDetail: { color: C.goldLight, fontSize: 12, textAlign: "right" },

  keepBtn: {
    backgroundColor: "#1D6A3A", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    alignItems: "center", marginRight: 0, marginLeft: 10,
    borderWidth: 1, borderColor: "#2B7A4B",
  },
  keepBtnDisabled: { opacity: 0.5 },
  keepBtnText: { color: C.white, fontSize: 11, fontWeight: "700", textAlign: "center", lineHeight: 16 },
});
