import React from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl,
} from "react-native";
import AppHeader from "@/components/AppHeader";
import C from "@/constants/colors";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

function useContactLogs() {
  const [logs, setLogs] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const fetchLogs = React.useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const res = await fetch(`${BASE_URL}/api/contact-logs`, { cache: "no-store" });
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch {}
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  React.useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return { logs, isLoading, isRefreshing, refetch: () => fetchLogs(true) };
}

export default function ContactLogScreen() {
  const { logs, isLoading, isRefreshing, refetch } = useContactLogs();

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString("ar-JO")} ${d.toLocaleTimeString("ar-JO", { hour: "2-digit", minute: "2-digit" })}`;
    } catch { return "—"; }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="📋 سجل التواصل" showBack />

      <View style={styles.legend}>
        <Text style={styles.legendText}>📊 عدد التواصلات: {logs.length}</Text>
        <Text style={styles.legendSub}>يُسجَّل عند تواصل زائر مع شركة مميزة</Text>
      </View>

      {/* رأس الجدول */}
      <View style={styles.tableHeader}>
        <View style={styles.colLeft}>
          <Text style={styles.colHeaderText}>🏢 الشركة</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.colRight}>
          <Text style={styles.colHeaderText}>👤 الزائر</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.gold} /></View>
      ) : logs.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>لا توجد سجلات تواصل بعد</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refetch} tintColor={C.gold} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item, index }) => (
            <View style={[styles.row, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
              {/* عمود الشركة */}
              <View style={styles.colLeft}>
                <Text style={styles.nameText}>{item.companyName || "—"}</Text>
                <Text style={styles.phoneText}>{item.companyPhone || "—"}</Text>
              </View>
              <View style={styles.divider} />
              {/* عمود الزائر */}
              <View style={styles.colRight}>
                <Text style={styles.nameText}>{item.visitorName || "—"}</Text>
                <Text style={styles.phoneText}>{item.visitorPhone || "—"}</Text>
                <View style={[styles.badge, item.contactType === "whatsapp" ? styles.badgeWa : styles.badgeCall]}>
                  <Text style={styles.badgeText}>{item.contactType === "whatsapp" ? "💬 واتساب" : "📞 اتصال"}</Text>
                </View>
                <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  legend: { marginHorizontal: 14, marginTop: 12, marginBottom: 6, backgroundColor: "rgba(201,160,34,0.08)", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.gold, gap: 2 },
  legendText: { color: C.gold, fontSize: 14, fontWeight: "700", textAlign: "center" },
  legendSub: { color: C.textMuted, fontSize: 12, textAlign: "center" },
  tableHeader: { flexDirection: "row", backgroundColor: C.bgDark, marginHorizontal: 14, marginBottom: 4, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: C.border },
  colHeaderText: { color: C.gold, fontWeight: "800", fontSize: 13, textAlign: "center", paddingVertical: 10 },
  row: { flexDirection: "row", marginHorizontal: 14, marginBottom: 3, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: C.border },
  rowEven: { backgroundColor: C.card },
  rowOdd: { backgroundColor: "rgba(26,92,46,0.15)" },
  colLeft: { flex: 1, padding: 10, gap: 3 },
  colRight: { flex: 1, padding: 10, gap: 3 },
  divider: { width: 1, backgroundColor: C.border },
  nameText: { color: C.white, fontSize: 13, fontWeight: "700", textAlign: "right" },
  phoneText: { color: C.textMuted, fontSize: 12, textAlign: "right" },
  badge: { alignSelf: "flex-end", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 },
  badgeWa: { backgroundColor: "#25D366" },
  badgeCall: { backgroundColor: C.gold },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  dateText: { color: C.textMuted, fontSize: 10, textAlign: "right" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: C.textMuted, fontSize: 15 },
});
