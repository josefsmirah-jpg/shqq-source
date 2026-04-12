import React from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { useGetListings } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import ListingCard from "@/components/ListingCard";
import C from "@/constants/colors";
import { setListingsForViewer } from "@/utils/listingsStore";
import { router } from "expo-router";

export default function EmployeeArchiveScreen() {
  const { user } = useAuth();

  const { data: listings = [], isLoading, refetch, isRefetching } = useGetListings(
    { createdByPhone: user?.phone || "", archived: "true" } as any,
    { query: { enabled: !!user?.phone } as any }
  );

  const openCard = (index: number) => {
    setListingsForViewer(listings as any[], index);
    router.push("/(employee)/cards");
  };

  return (
    <View style={styles.container}>
      <AppHeader title="🗄️ أرشيف الإعلانات المدفوعة" showBack />

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>📦 {listings.length} إعلان مؤرشف</Text>
        <Text style={styles.infoSub}>
          هذه الإعلانات المعتمدة التي تم دفع أجورها من قبل المدير
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.gold} />
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🗄️</Text>
          <Text style={styles.emptyText}>لا توجد إعلانات مؤرشفة بعد</Text>
          <Text style={styles.emptySub}>عند دفع المدير لأجورك تنتقل إعلاناتك هنا</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item, index }) => (
            <View style={styles.archivedItem}>
              <View style={styles.archiveBadge}>
                <Text style={styles.archiveBadgeText}>✅ مدفوع الأجر</Text>
              </View>
              <ListingCard
                listing={item as any}
                onOpen={() => openCard(index)}
              />
            </View>
          )}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.gold} />}
          contentContainerStyle={{ paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  infoBox: {
    margin: 14, backgroundColor: C.card, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: "#4a7a60", gap: 4,
  },
  infoTitle: { color: C.gold, fontSize: 15, fontWeight: "700", textAlign: "right" },
  infoSub: { color: C.textMuted, fontSize: 12, textAlign: "right", lineHeight: 18 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, paddingBottom: 60 },
  emptyIcon: { fontSize: 56 },
  emptyText: { color: C.textMuted, fontSize: 16, fontWeight: "600" },
  emptySub: { color: C.textMuted, fontSize: 13, textAlign: "center", paddingHorizontal: 30, lineHeight: 20 },
  archivedItem: { position: "relative" },
  archiveBadge: {
    position: "absolute", top: 12, left: 24, zIndex: 10,
    backgroundColor: "#2d6a4f", borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: "#4CAF50",
  },
  archiveBadgeText: { color: "#4CAF50", fontSize: 11, fontWeight: "700" },
});
