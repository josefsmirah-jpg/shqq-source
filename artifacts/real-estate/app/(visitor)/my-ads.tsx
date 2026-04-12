import React, { useState, useEffect } from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useGetListings, useDeleteListing } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import ListingCard from "@/components/ListingCard";
import AppHeader from "@/components/AppHeader";
import ConfirmModal from "@/components/ConfirmModal";
import C from "@/constants/colors";
import { setListingsForViewer, setListingToEdit } from "@/utils/listingsStore";

export default function MyAdsScreen() {
  const { user } = useAuth();
  const queryParams = user?.visitorId
    ? { visitorId: user.visitorId, createdByPhone: user?.phone || "" }
    : { createdByPhone: user?.phone || "" };
  const queryEnabled = !!(user?.visitorId || user?.phone);
  const { data: listings = [], isLoading, refetch, isRefetching } = useGetListings(
    queryParams as any,
    { query: { enabled: queryEnabled } as any }
  );

  // تعليم الإعلانات المعتمدة كمقروءة عند فتح الصفحة
  useEffect(() => {
    if (!user?.phone || !listings.length) return;
    const approved = listings.filter((l: any) => l.status === "approved").length;
    AsyncStorage.setItem(`approved_seen_${user.phone}`, String(approved)).catch(() => {});
  }, [listings, user?.phone]);

  const deleteMutation = useDeleteListing();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = () => {
    if (!deleteId) return;
    setDeleting(true);
    deleteMutation.mutate({ id: deleteId }, {
      onSuccess: () => {
        setDeleteId(null);
        setDeleting(false);
        refetch();
      },
      onError: () => {
        setDeleteId(null);
        setDeleting(false);
      },
    });
  };

  const handleEdit = (item: any) => {
    setListingToEdit(item);
    router.push("/(visitor)/edit-ad" as any);
  };

  const openCard = (index: number) => {
    setListingsForViewer(listings as any[], index);
    router.push("/(visitor)/cards");
  };

  return (
    <View style={styles.container}>
      <AppHeader title="إعلاناتي" showBack />
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.gold} />
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>لم تقم بنشر أي إعلان بعد</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item, index }) => (
            <ListingCard
              listing={item as any}
              onOpen={() => openCard(index)}
              onDelete={() => setDeleteId(item.id)}
              onEdit={() => handleEdit(item)}
              showActions
            />
          )}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.gold} />}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      <ConfirmModal
        visible={deleteId !== null}
        title="حذف الإعلان"
        message="هل أنت متأكد من حذف هذا الإعلان؟ لا يمكن التراجع عن هذه العملية."
        confirmText={deleting ? "جارِ الحذف..." : "حذف"}
        cancelText="إلغاء"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: C.textMuted, fontSize: 16 },
});
