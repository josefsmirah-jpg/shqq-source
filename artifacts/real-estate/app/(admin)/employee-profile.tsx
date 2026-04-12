import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import AppHeader from "@/components/AppHeader";
import C from "@/constants/colors";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export default function EmployeeProfileScreen() {
  const params = useLocalSearchParams<{ id: string; name: string }>();
  const empId = Number(params.id);
  const empName = params.name || "الموظف";

  const [data, setData] = useState<{ payments: any[]; totalPaid: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPayments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const res = await fetch(`${BASE_URL}/api/employees/${empId}/payments`, { cache: "no-store" });
      const json = await res.json();
      setData(json);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [empId]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString("ar-JO")} ${d.toLocaleTimeString("ar-JO", { hour: "2-digit", minute: "2-digit" })}`;
    } catch { return "—"; }
  };

  return (
    <View style={styles.container}>
      <AppHeader title={`📁 ملف ${empName}`} showBack />

      {/* بطاقة الملخص */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>إجمالي ما استلمه الموظف</Text>
        <Text style={styles.summaryAmount}>
          {data ? data.totalPaid.toFixed(3) : "—"} د.أ
        </Text>
        <Text style={styles.summaryCount}>
          {data ? `${data.payments.length} دفعة` : "جاري التحميل..."}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.gold} /></View>
      ) : !data || data.payments.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>لم يستلم هذا الموظف أي دفعات بعد</Text>
        </View>
      ) : (
        <FlatList
          data={data.payments}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPayments(true)} tintColor={C.gold} />}
          contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 14 }}
          renderItem={({ item, index }) => (
            <View style={styles.payRow}>
              <View style={styles.payIndex}>
                <Text style={styles.payIndexText}>{data.payments.length - index}</Text>
              </View>
              <View style={styles.payInfo}>
                <Text style={styles.payDate}>{formatDate(item.paidAt)}</Text>
              </View>
              <Text style={styles.payAmount}>{parseFloat(item.amount).toFixed(3)} د.أ</Text>
            </View>
          )}
          ListHeaderComponent={
            <View style={styles.tableHeader}>
              <Text style={styles.thNum}>#</Text>
              <Text style={styles.thDate}>تاريخ الدفع</Text>
              <Text style={styles.thAmount}>المبلغ</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  summaryCard: {
    margin: 14, backgroundColor: "rgba(201,160,34,0.1)",
    borderRadius: 16, padding: 20, alignItems: "center", gap: 6,
    borderWidth: 2, borderColor: C.gold,
  },
  summaryLabel: { color: C.textMuted, fontSize: 13 },
  summaryAmount: { color: C.gold, fontSize: 32, fontWeight: "800" },
  summaryCount: { color: C.textMuted, fontSize: 12 },

  tableHeader: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.bgDark, borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 12,
    marginBottom: 6, borderWidth: 1, borderColor: C.border,
  },
  thNum: { color: C.gold, fontSize: 12, fontWeight: "700", width: 30, textAlign: "center" },
  thDate: { flex: 1, color: C.gold, fontSize: 12, fontWeight: "700", textAlign: "right" },
  thAmount: { color: C.gold, fontSize: 12, fontWeight: "700", width: 90, textAlign: "center" },

  payRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.card, borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 12,
    marginBottom: 6, borderWidth: 1, borderColor: C.border,
  },
  payIndex: { width: 30, alignItems: "center" },
  payIndexText: { color: C.textMuted, fontSize: 13, fontWeight: "700" },
  payInfo: { flex: 1, alignItems: "flex-end" },
  payDate: { color: C.white, fontSize: 13 },
  payAmount: {
    width: 90, textAlign: "center",
    color: "#4CAF50", fontSize: 14, fontWeight: "800",
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  emptyIcon: { fontSize: 44 },
  emptyText: { color: C.textMuted, fontSize: 14 },
});
