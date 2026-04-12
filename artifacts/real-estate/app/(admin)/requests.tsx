import React, { useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, Linking
} from "react-native";
import { router } from "expo-router";
import { useGetListings, getGetListingsQueryKey } from "@workspace/api-client-react";
import { useAdminListingActions } from "@/utils/adminActions";
import ListingCard from "@/components/ListingCard";
import AppHeader from "@/components/AppHeader";
import ConfirmModal from "@/components/ConfirmModal";
import C from "@/constants/colors";
import { setListingsForViewer } from "@/utils/listingsStore";

type DialogType = "approve" | "reject" | "delete" | null;

export default function AdminRequestsScreen() {
  const { data: listings = [], isLoading, refetch, isRefetching } = useGetListings(
    { status: "pending" },
    { query: { queryKey: getGetListingsQueryKey({ status: "pending" }), staleTime: 0, gcTime: 0, refetchInterval: 3_000, refetchOnMount: true, refetchIntervalInBackground: false } }
  );
  const { processingId, approve, reject, deleteListing } = useAdminListingActions();
  const [dialog, setDialog] = useState<{ type: DialogType; id: number } | null>(null);

  const closeDialog = useCallback(() => setDialog(null), []);

  const handleConfirm = useCallback(() => {
    if (!dialog) return;
    const { type, id } = dialog;
    closeDialog();
    if (type === "approve") {
      approve(id);
    } else if (type === "reject") {
      reject(id);
    } else if (type === "delete") {
      deleteListing(id).catch(() => {});
    }
  }, [dialog, approve, reject, deleteListing, closeDialog]);

  const handleShareWhatsApp = useCallback((item: any) => {
    const lines = [`🏠 *إعلان عقاري #${item.cardNumber || item.id}*`];
    if (item.propertyType) lines.push(`النوع: ${item.propertyType}`);
    if (item.region) lines.push(`المنطقة: ${item.region}`);
    if (item.price) lines.push(`💰 السعر: ${item.price}`);
    if (item.ownerPhone) lines.push(`📞 الهاتف: ${item.ownerPhone}`);
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`);
  }, []);

  const openCard = (index: number) => {
    if (!listings.length || index < 0 || index >= listings.length) return;
    setListingsForViewer([...listings] as any[], index, true);
    router.push("/(admin)/cards");
  };

  const dialogConfig = dialog ? {
    approve: { title: "قبول الإعلان", message: "سيتم نشر الإعلان ويظهر للزوار", confirmText: "قبول ✓", destructive: false },
    reject:  { title: "رفض الإعلان",  message: "سيتم رفض الإعلان وإخفاؤه",    confirmText: "رفض ✗", destructive: false },
    delete:  { title: "حذف الإعلان",  message: "سيُحذف الإعلان نهائياً ولا يمكن التراجع", confirmText: "حذف 🗑", destructive: true },
  }[dialog.type!] : null;

  return (
    <View style={styles.container}>
      <AppHeader title={`الطلبات المعلقة (${listings.length})`} showBack />

      <ConfirmModal
        visible={!!dialog && !!dialogConfig}
        title={dialogConfig?.title ?? ""}
        message={dialogConfig?.message ?? ""}
        confirmText={dialogConfig?.confirmText}
        destructive={dialogConfig?.destructive}
        onConfirm={handleConfirm}
        onCancel={closeDialog}
      />

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.gold} /></View>
      ) : listings.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyText}>لا توجد طلبات معلقة</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => String(item.id)}
          extraData={processingId}
          renderItem={({ item, index }) => {
            const busy = processingId === item.id;
            return (
              <ListingCard
                listing={item as any}
                onOpen={() => openCard(index)}
                onApprove={!busy ? () => setDialog({ type: "approve", id: item.id }) : undefined}
                onReject={!busy ? () => setDialog({ type: "reject", id: item.id }) : undefined}
                onDelete={!busy ? () => setDialog({ type: "delete", id: item.id }) : undefined}
                onShareWhatsApp={() => handleShareWhatsApp(item)}
                showActions
              />
            );
          }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.gold} />}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: C.textMuted, fontSize: 16 },
});
