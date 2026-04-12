import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Linking, Animated,
} from "react-native";
import C from "@/constants/colors";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
const ADMIN_PHONE = "962798561011"; // 07985610113 بدون الصفر الأول مع رمز الأردن

const LAND_RATE = 0.10;
const SINGLE_APT_RATE = 0.10;
const MULTI_APT_RATE = 0.15;
const MIN_PAYOUT = 10.0;

interface WalletData {
  landCount: number;
  singleAptCount: number;
  multiAptCount: number;
  totalEarned: number;
  paid: number;
  balance: number;
  canWithdraw: boolean;
  error?: string;
}

interface Props {
  employeeId: number;
  employeeName?: string;
  refreshKey?: number;
}

export default function WalletBar({ employeeId, employeeName, refreshKey }: Props) {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  const fetchWallet = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/api/employees/${employeeId}/wallet`, {
        headers: { "Cache-Control": "no-store" },
      });
      const data = await res.json();
      setWallet(data);
    } catch {
      setWallet(null);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { fetchWallet(); }, [fetchWallet, refreshKey]);

  useEffect(() => {
    if (wallet?.canWithdraw) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [wallet?.canWithdraw]);

  const openWhatsApp = () => {
    const balance = wallet?.balance?.toFixed(3) ?? "0";
    const total = wallet?.totalEarned?.toFixed(3) ?? "0";
    const msg = encodeURIComponent(
      `السلام عليكم،\nأنا الموظف ${employeeName ?? ""} 👷\nرصيد محفظتي الحالي: ${balance} دينار\nإجمالي المكتسب: ${total} دينار\nأطلب صرف المستحقات ✅`
    );
    Linking.openURL(`https://wa.me/${ADMIN_PHONE}?text=${msg}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={C.gold} />
        <Text style={styles.loadingText}>تحميل المحفظة...</Text>
      </View>
    );
  }

  if (!wallet || wallet.error === "no_phone") {
    return (
      <View style={styles.noPhoneBox}>
        <Text style={styles.noPhoneText}>⚠️ أضف رقم هاتفك من الإعدادات لتفعيل المحفظة</Text>
      </View>
    );
  }

  const bal = wallet.balance ?? 0;
  const canWithdraw = wallet.canWithdraw;
  const progress = Math.min((bal / MIN_PAYOUT) * 100, 100);

  return (
    <View style={styles.wrapper}>
      {/* ─── صف أيقونات الفئات ─── */}
      <View style={styles.iconsRow}>
        <StatCard icon="🏞️" label="أراضي" count={wallet.landCount} rate={LAND_RATE} color="#a0c080" />
        <StatCard icon="🏠" label="شقة واحدة" count={wallet.singleAptCount} rate={SINGLE_APT_RATE} color="#80c0e0" />
        <StatCard icon="🏢" label="شقق متعددة" count={wallet.multiAptCount} rate={MULTI_APT_RATE} color="#c0a0e0" />
      </View>

      {/* ─── المحفظة الإجمالية ─── */}
      <Animated.View style={[styles.walletCard, canWithdraw && styles.walletCardActive, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.walletTop}>
          <Text style={styles.walletIcon}>💰</Text>
          <View style={styles.walletInfo}>
            <Text style={[styles.walletBalance, canWithdraw && styles.walletBalanceActive]}>
              {bal.toFixed(3)} د.أ
            </Text>
            <Text style={styles.walletSub}>
              مكتسب: {wallet.totalEarned.toFixed(3)} | مدفوع: {wallet.paid.toFixed(3)}
            </Text>
          </View>
          {canWithdraw && (
            <View style={styles.readyBadge}>
              <Text style={styles.readyBadgeText}>جاهز ✅</Text>
            </View>
          )}
        </View>

        {/* شريط التقدم نحو ١٠ دنانير */}
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progress}%` as any }, canWithdraw && styles.progressFillActive]} />
        </View>
        <Text style={styles.progressLabel}>
          {canWithdraw ? "✅ رصيدك يساوي ١٠ دنانير أو أكثر" : `${bal.toFixed(3)} / ${MIN_PAYOUT} د.أ للوصول للحد الأدنى`}
        </Text>

        {/* زر واتساب */}
        {canWithdraw && (
          <TouchableOpacity style={styles.whatsappBtn} onPress={openWhatsApp} activeOpacity={0.85}>
            <Text style={styles.whatsappBtnText}>📲 تواصل مع المدير عبر واتساب</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

function StatCard({ icon, label, count, rate, color }: { icon: string; label: string; count: number; rate: number; color: string }) {
  const earned = (count * rate).toFixed(3);
  return (
    <View style={[styles.statCard, { borderColor: color + "60" }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statCount, { color }]}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statEarned}>{earned} د.أ</Text>
      <Text style={styles.statRate}>{(rate * 1000).toFixed(0)} ق/إعلان</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: 14, marginTop: 10, gap: 8 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, margin: 14, justifyContent: "center" },
  loadingText: { color: C.textMuted, fontSize: 13 },
  noPhoneBox: {
    marginHorizontal: 14, marginTop: 8,
    backgroundColor: "#3a3000", borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: C.gold,
  },
  noPhoneText: { color: C.gold, fontSize: 13, textAlign: "center" },

  iconsRow: { flexDirection: "row", gap: 8 },
  statCard: {
    flex: 1, backgroundColor: C.card, borderRadius: 10, padding: 10,
    alignItems: "center", gap: 2, borderWidth: 1,
  },
  statIcon: { fontSize: 22 },
  statCount: { fontSize: 18, fontWeight: "800" },
  statLabel: { color: C.textMuted, fontSize: 10, textAlign: "center" },
  statEarned: { color: C.white, fontSize: 12, fontWeight: "700" },
  statRate: { color: C.textMuted, fontSize: 9 },

  walletCard: {
    backgroundColor: C.card, borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: C.border, gap: 8,
  },
  walletCardActive: { borderColor: "#4CAF50", backgroundColor: "#0d2e12" },
  walletTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  walletIcon: { fontSize: 30 },
  walletInfo: { flex: 1 },
  walletBalance: { color: C.white, fontSize: 22, fontWeight: "800", textAlign: "right" },
  walletBalanceActive: { color: "#4CAF50" },
  walletSub: { color: C.textMuted, fontSize: 11, textAlign: "right" },
  readyBadge: { backgroundColor: "#4CAF50", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  readyBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  progressBg: { height: 6, backgroundColor: "#333", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: C.gold, borderRadius: 3 },
  progressFillActive: { backgroundColor: "#4CAF50" },
  progressLabel: { color: C.textMuted, fontSize: 11, textAlign: "center" },

  whatsappBtn: {
    backgroundColor: "#25D366", borderRadius: 10,
    paddingVertical: 12, alignItems: "center",
  },
  whatsappBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
