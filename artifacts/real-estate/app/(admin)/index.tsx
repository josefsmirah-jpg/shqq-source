import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, Modal, FlatList, Alert, Platform,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGetStats, useResetVisitorCount } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import ConfirmModal from "@/components/ConfirmModal";
import C from "@/constants/colors";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export default function AdminHomeScreen() {
  const { user, logout } = useAuth();
  const { data: stats, isLoading: statsLoading, refetch, isRefetching } = useGetStats(
    { query: { refetchInterval: 30_000 } as any }
  );
  const resetCount = useResetVisitorCount();

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showCardResetConfirm, setShowCardResetConfirm] = useState(false);
  const [showVisitorList, setShowVisitorList] = useState(false);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [dupCount, setDupCount] = useState<number | null>(null);
  const [installCount, setInstallCount] = useState<number | null>(null);

  // استطلاع عدد المتواجدين الآن كل 15 ثانية
  const fetchOnline = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/online/count`, { cache: "no-store" });
      const json = await res.json();
      setOnlineCount(json.count ?? 0);
    } catch {}
  }, []);

  useEffect(() => {
    fetchOnline();
    const t = setInterval(fetchOnline, 15_000);
    return () => clearInterval(t);
  }, [fetchOnline]);

  // عدد التحميلات الفريدة
  const fetchInstallCount = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/installs/count`, { cache: "no-store" });
      const json = await res.json();
      setInstallCount(json.count ?? 0);
    } catch {}
  }, []);

  useEffect(() => {
    fetchInstallCount();
    const t = setInterval(fetchInstallCount, 60_000);
    return () => clearInterval(t);
  }, [fetchInstallCount]);

  useEffect(() => {
    fetch(`${BASE_URL}/api/listings/duplicates`)
      .then(r => r.json())
      .then((data: any[][]) => setDupCount(Array.isArray(data) ? data.length : 0))
      .catch(() => {});
  }, []);

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/listings/export`);
      if (!res.ok) throw new Error("فشل التصدير");
      const csv = await res.text();
      const date = new Date().toISOString().slice(0, 10);
      const path = FileSystem.documentDirectory + `backup-${date}.csv`;
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, { mimeType: "text/csv", dialogTitle: "حفظ النسخة الاحتياطية" });
      } else {
        Alert.alert("تم", `تم حفظ الملف في: ${path}`);
      }
    } catch (e) {
      Alert.alert("خطأ", "تعذّر تصدير البيانات، حاول مرة أخرى");
    } finally {
      setExporting(false);
    }
  };

  const [savedBackups, setSavedBackups] = useState<{ filename: string; createdAt: string; size: any }[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [triggeringBackup, setTriggeringBackup] = useState(false);
  const [showBackupList, setShowBackupList] = useState(false);
  const [deletingBackup, setDeletingBackup] = useState<string | null>(null);
  const [confirmDeleteBackup, setConfirmDeleteBackup] = useState<string | null>(null);

  const fetchSavedBackups = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/listings/backups`, { cache: "no-store" });
      const data = await res.json();
      setSavedBackups(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  useEffect(() => { fetchSavedBackups(); }, [fetchSavedBackups]);

  const handleTriggerBackup = async () => {
    setTriggeringBackup(true);
    try {
      const res = await fetch(`${BASE_URL}/api/listings/backups/run`, { method: "POST" });
      if (!res.ok) throw new Error();
      await fetchSavedBackups();
      Alert.alert("تم", "تم حفظ نسخة احتياطية جديدة في السحابة");
    } catch {
      Alert.alert("خطأ", "فشل إنشاء النسخة الاحتياطية");
    } finally {
      setTriggeringBackup(false);
    }
  };

  const handleDownloadBackup = async (filename: string) => {
    setLoadingBackups(true);
    try {
      const res = await fetch(`${BASE_URL}/api/listings/backups/${encodeURIComponent(filename)}`);
      if (!res.ok) throw new Error();
      const csv = await res.text();
      const path = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, { mimeType: "text/csv", dialogTitle: "تنزيل النسخة الاحتياطية" });
      }
    } catch {
      Alert.alert("خطأ", "فشل تنزيل النسخة الاحتياطية");
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    setDeletingBackup(filename);
    try {
      const res = await fetch(`${BASE_URL}/api/listings/backups/${encodeURIComponent(filename)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setSavedBackups(prev => prev.filter(b => b.filename !== filename));
    } catch {
      Alert.alert("خطأ", "فشل حذف النسخة الاحتياطية");
    } finally {
      setDeletingBackup(null);
      setConfirmDeleteBackup(null);
    }
  };

  if (!user) return null;

  const confirmReset = () => {
    setShowResetConfirm(false);
    resetCount.mutate(undefined, { onSuccess: () => refetch() });
  };

  const confirmCardReset = async () => {
    setShowCardResetConfirm(false);
    try {
      await fetch(`${BASE_URL}/api/stats/cards/reset`, { method: "POST" });
      refetch();
    } catch {}
  };

  const goToArchive = (opts: {
    initialStatus?: string; initialRole?: string;
    initialPkg?: string; screenTitle?: string; initialName?: string;
  }) => router.push({ pathname: "/(admin)/archive" as any, params: opts });

  const s = stats as any;
  const visitorData: { name: string; phone: string }[] = s?.visitorData || [];

  return (
    <View style={styles.container}>
      {/* مودال تأكيد إعادة تعيين الزوار */}
      <ConfirmModal
        visible={showResetConfirm}
        title="إعادة تعيين العداد"
        message="هل تريد إعادة تعيين عداد الزوار إلى صفر؟"
        confirmText="تأكيد"
        onConfirm={confirmReset}
        onCancel={() => setShowResetConfirm(false)}
      />

      {/* مودال تأكيد حذف نسخة احتياطية */}
      <ConfirmModal
        visible={!!confirmDeleteBackup}
        title="حذف النسخة الاحتياطية"
        message={`هل تريد حذف هذه النسخة نهائياً؟\n${confirmDeleteBackup?.replace("listings-backup-", "").replace(".csv", "") ?? ""}`}
        confirmText="حذف"
        onConfirm={() => confirmDeleteBackup && handleDeleteBackup(confirmDeleteBackup)}
        onCancel={() => setConfirmDeleteBackup(null)}
      />

      {/* مودال تأكيد تصفير عداد البطاقات */}
      <ConfirmModal
        visible={showCardResetConfirm}
        title="تصفير عداد البطاقات"
        message="هل تريد تصفير عداد البطاقات إلى صفر؟ سيبدأ الترقيم من جديد عند تنزيل بطاقات جديدة."
        confirmText="تصفير"
        onConfirm={confirmCardReset}
        onCancel={() => setShowCardResetConfirm(false)}
      />

      {/* مودال قائمة الزوار */}
      <Modal visible={showVisitorList} transparent animationType="slide" onRequestClose={() => setShowVisitorList(false)}>
        <View style={vl.overlay}>
          <View style={vl.sheet}>
            <View style={vl.handle} />
            <Text style={vl.title}>👤 قائمة المستخدمين ({s?.totalVisitors ?? 0})</Text>

            {visitorData.length === 0 ? (
              <View style={vl.empty}><Text style={vl.emptyText}>لا توجد بيانات مسجلة بعد</Text></View>
            ) : (
              <FlatList
                data={visitorData}
                keyExtractor={(_, i) => String(i)}
                contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
                renderItem={({ item, index }) => (
                  <View style={vl.row}>
                    <Text style={vl.rowNum}>{index + 1}</Text>
                    <View style={vl.rowInfo}>
                      <Text style={vl.rowName}>{item.name || "—"}</Text>
                      <Text style={vl.rowPhone}>{item.phone || "—"}</Text>
                    </View>
                  </View>
                )}
              />
            )}

            <TouchableOpacity style={vl.resetBtn} onPress={() => { setShowVisitorList(false); setShowResetConfirm(true); }}>
              <Text style={vl.resetBtnText}>🔄 إعادة تعيين العداد</Text>
            </TouchableOpacity>
            <TouchableOpacity style={vl.closeBtn} onPress={() => setShowVisitorList(false)}>
              <Text style={vl.closeBtnText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SafeAreaView edges={["top"]} style={{ backgroundColor: C.bgDark }}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS === "web") {
                if (window.confirm("هل تريد تسجيل الخروج؟")) logout().then(() => window.location.reload());
              } else {
                Alert.alert("تسجيل الخروج", "هل تريد الخروج؟", [
                  { text: "إلغاء", style: "cancel" },
                  { text: "خروج", style: "destructive", onPress: logout },
                ]);
              }
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.logoutText}>خروج</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>لوحة الإدارة</Text>
          <Text style={styles.roleTag}>👑 مدير</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.gold} />}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* ── إحصائيات سريعة ── */}
        <View style={styles.statsRow}>
          <StatPill icon="👁️" label="الزوار" value={s?.totalVisitors ?? "—"} onPress={() => setShowVisitorList(true)} />
          <StatPill icon="🟢" label="متواجدون" value={onlineCount ?? "—"} green />
          <StatPill icon="✅" label="معتمد" value={s?.approvedListings ?? "—"} accent />
          <StatPill icon="⏳" label="معلق" value={s?.pendingListings ?? "—"} highlight />
        </View>
        <View style={styles.statsRow}>
          <StatPill icon="📥" label="تحميلات التطبيق" value={installCount ?? "—"} />
        </View>

        {/* ── الطلبات المعلقة ── */}
        <SectionHeader title="📬 الطلبات المعلقة" />
        <View style={styles.grid2}>
          <PendingTile
            icon="👤" label="زائرين"
            count={s?.pendingVisitor ?? 0}
            onPress={() => goToArchive({ initialStatus: "pending", initialRole: "visitor", screenTitle: "إعلانات الزائرين" })}
          />
          <PendingTile
            icon="👷" label="موظفين"
            count={s?.pendingEmployee ?? 0}
            onPress={() => goToArchive({ initialStatus: "pending", initialRole: "employee", screenTitle: "إعلانات الموظفين" })}
          />
          <PendingTile
            icon="🏢" label="شركات مجانية"
            count={s?.pendingCompanyFree ?? 0}
            onPress={() => goToArchive({ initialStatus: "pending", initialRole: "company", initialPkg: "free", screenTitle: "شركات مجانية" })}
          />
          <PendingTile
            icon="⭐" label="شركات مميزة"
            count={s?.pendingCompanyPaid ?? 0}
            gold
            onPress={() => goToArchive({ initialStatus: "pending", initialRole: "company", initialPkg: "paid", screenTitle: "شركات مميزة" })}
          />
          <PendingTile
            icon="🚶" label="ضيوف"
            count={s?.pendingGuest ?? 0}
            onPress={() => goToArchive({ initialStatus: "pending", initialRole: "visitor", initialName: "ضيف", screenTitle: "إعلانات الضيوف" })}
          />
        </View>

        {/* ── الأرشيف (بارز) ── */}
        <SectionHeader title="🗂️ الأرشيف" />
        <TouchableOpacity style={styles.archiveBtn} onPress={() => router.push("/(admin)/archive" as any)} activeOpacity={0.85}>
          <Text style={styles.archiveIcon}>🗂️</Text>
          <View style={styles.archiveTextCol}>
            <Text style={styles.archiveBtnLabel}>الأرشيف الكامل</Text>
            <Text style={styles.archiveBtnSub}>مركز الإعلانات • الاعتماد والرفض والمراجعة</Text>
          </View>
          <Text style={styles.archiveArrow}>←</Text>
        </TouchableOpacity>

        {/* ── إدارة الإعلانات ── */}
        <SectionHeader title="📂 إدارة الإعلانات" />
        <View style={styles.grid3}>
          <NavTile icon="✅" label="معتمدة" sub={s?.approvedListings} onPress={() => goToArchive({ initialStatus: "approved", screenTitle: "الإعلانات المعتمدة" })} />
          <NavTile icon="❌" label="مرفوضة" sub={s?.rejectedListings} onPress={() => goToArchive({ initialStatus: "rejected", screenTitle: "الإعلانات المرفوضة" })} />
          <NavTile icon="🗑️" label="محذوفة" sub={s?.deletedListings} onPress={() => goToArchive({ initialStatus: "deleted", screenTitle: "الإعلانات المحذوفة" })} />
          <NavTile icon="⭐" label="مدفوعة" onPress={() => router.push("/(admin)/paid-ads" as any)} />
          <NavTile icon="➕" label="إضافة يدوي" gold onPress={() => router.push("/(admin)/add-listing" as any)} />
          <NavTile icon="🔁" label="مكررات" sub={dupCount ?? "..."} red={!!dupCount && dupCount > 0} onPress={() => router.push("/(admin)/duplicates" as any)} />
        </View>

        {/* ── إدارة المنصة ── */}
        <SectionHeader title="⚙️ إدارة المنصة" />
        <View style={styles.grid3}>
          <NavTile icon="👥" label="الشركات"      onPress={() => router.push("/(admin)/companies" as any)} />
          <NavTile icon="👷" label="الموظفون"     onPress={() => router.push("/(admin)/employees" as any)} />
          <NavTile icon="📋" label="سجل التواصل"  onPress={() => router.push("/(admin)/contact-log" as any)} />
          <NavTile icon="🔧" label="الإعدادات"    onPress={() => router.push("/(admin)/settings" as any)} />
          <NavTile icon="🔢" label="تصفير البطاقات" sub={s?.cardCounter ?? 0} onPress={() => setShowCardResetConfirm(true)} />
          <NavTile icon="🏢" label="ارشيف الشركات" gold onPress={() => router.push("/(admin)/company-archive" as any)} />
          <NavTile icon="📊" label="البيانات" gold onPress={() => router.push("/(admin)/data" as any)} />
        </View>

        {/* ── نسخة احتياطية ── */}
        <SectionHeader title="🔒 النسخة الاحتياطية" />
        <TouchableOpacity
          style={[styles.exportBtn, exporting && styles.exportBtnDim]}
          onPress={handleExport}
          disabled={exporting}
        >
          <Text style={styles.exportIcon}>💾</Text>
          <View>
            <Text style={styles.exportLabel}>{exporting ? "جارٍ التصدير..." : "تصدير كل الإعلانات"}</Text>
            <Text style={styles.exportSub}>ملف Excel يُحفظ على هاتفك</Text>
          </View>
        </TouchableOpacity>

        {/* ── النسخ التلقائية ── */}
        <SectionHeader title="☁️ النسخ التلقائية (كل 24 ساعة)" />
        <TouchableOpacity
          style={[styles.exportBtn, { marginBottom: 8 }, triggeringBackup && styles.exportBtnDim]}
          onPress={handleTriggerBackup}
          disabled={triggeringBackup}
        >
          <Text style={styles.exportIcon}>🔄</Text>
          <View>
            <Text style={styles.exportLabel}>{triggeringBackup ? "جارٍ الحفظ..." : "حفظ نسخة الآن"}</Text>
            <Text style={styles.exportSub}>احفظ نسخة فورية في السحابة</Text>
          </View>
        </TouchableOpacity>

        {/* زر السجلات المحفوظة */}
        <TouchableOpacity
          style={bk.toggleBtn}
          onPress={() => setShowBackupList(v => !v)}
          activeOpacity={0.8}
        >
          <Text style={bk.toggleIcon}>🗂️</Text>
          <Text style={bk.toggleLabel}>السجلات المحفوظة ({savedBackups.length})</Text>
          <Text style={bk.toggleArrow}>{showBackupList ? "▲" : "▼"}</Text>
        </TouchableOpacity>

        {showBackupList && (
          savedBackups.length === 0 ? (
            <View style={bk.empty}>
              <Text style={bk.emptyText}>لا توجد نسخ محفوظة بعد</Text>
            </View>
          ) : (
            savedBackups.map((b) => (
              <View key={b.filename} style={bk.row}>
                <Text style={bk.icon}>📄</Text>
                <View style={{ flex: 1 }}>
                  <Text style={bk.name} numberOfLines={1}>
                    {b.filename.replace("listings-backup-", "").replace(".csv", "")}
                  </Text>
                  <Text style={bk.sub}>{b.createdAt ? new Date(b.createdAt).toLocaleDateString("ar-JO") : ""}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDownloadBackup(b.filename)}
                  disabled={loadingBackups}
                  style={bk.actionBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={bk.dl}>⬇️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setConfirmDeleteBackup(b.filename)}
                  disabled={deletingBackup === b.filename}
                  style={bk.actionBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={bk.delIcon}>{deletingBackup === b.filename ? "⏳" : "🗑️"}</Text>
                </TouchableOpacity>
              </View>
            ))
          )
        )}
      </ScrollView>
    </View>
  );
}

/* ── مكونات مساعدة ── */
function SectionHeader({ title }: { title: string }) {
  return <Text style={sh.title}>{title}</Text>;
}

function StatPill({ icon, label, value, onPress, accent, highlight, green }: any) {
  return (
    <TouchableOpacity
      style={[sp.pill, accent && sp.accent, highlight && sp.highlight, green && sp.green]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={sp.icon}>{icon}</Text>
      <Text style={[sp.value, highlight && { color: C.gold }, green && { color: "#4CAF50" }]}>{value}</Text>
      <Text style={sp.label}>{label}</Text>
    </TouchableOpacity>
  );
}

function PendingTile({ icon, label, count, onPress, gold }: any) {
  const hasNew = count > 0;
  return (
    <TouchableOpacity style={[pt.card, hasNew && (gold ? pt.cardGold : pt.cardActive)]} onPress={onPress}>
      <Text style={pt.icon}>{icon}</Text>
      <Text style={pt.label}>{label}</Text>
      <View style={[pt.badge, hasNew ? (gold ? pt.badgeGold : pt.badgeGreen) : pt.badgeEmpty]}>
        <Text style={[pt.badgeText, !hasNew && pt.badgeTextEmpty]}>{hasNew ? count : "٠"}</Text>
      </View>
    </TouchableOpacity>
  );
}

function NavTile({ icon, label, sub, onPress, gold, red }: any) {
  return (
    <TouchableOpacity style={[nt.card, gold && nt.cardGold, red && nt.cardRed]} onPress={onPress}>
      <Text style={nt.icon}>{icon}</Text>
      <Text style={[nt.label, gold && nt.labelGold, red && nt.labelRed]}>{label}</Text>
      {sub !== undefined && <Text style={[nt.sub, red && nt.subRed]}>{sub}</Text>}
    </TouchableOpacity>
  );
}

/* ── أنماط ── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  exportBtn: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: C.card, borderRadius: 14, padding: 16,
    marginHorizontal: 16, marginBottom: 24,
    borderWidth: 1, borderColor: "#2D7A4F",
  },
  exportBtnDim: { opacity: 0.5 },
  exportIcon: { fontSize: 30 },
  exportLabel: { color: C.white, fontSize: 15, fontWeight: "700" },
  exportSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { flex: 1, textAlign: "center", color: C.gold, fontSize: 16, fontWeight: "800" },
  roleTag: { color: C.goldLight, fontSize: 13 },
  logoutText: { color: C.error, fontSize: 14, fontWeight: "700", minWidth: 50, paddingVertical: 4 },
  statsRow: { flexDirection: "row", paddingHorizontal: 14, paddingTop: 16, paddingBottom: 4, gap: 8 },
  grid2: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 10 },
  grid3: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 10 },
  archiveBtn: {
    marginHorizontal: 12, borderRadius: 16, backgroundColor: "#13441F",
    borderWidth: 2, borderColor: C.gold, flexDirection: "row", alignItems: "center",
    paddingVertical: 18, paddingHorizontal: 18, gap: 14,
  },
  archiveIcon: { fontSize: 32 },
  archiveTextCol: { flex: 1, gap: 3 },
  archiveBtnLabel: { color: C.gold, fontSize: 17, fontWeight: "800", textAlign: "right" },
  archiveBtnSub: { color: C.textMuted, fontSize: 12, textAlign: "right" },
  archiveArrow: { color: C.gold, fontSize: 22, fontWeight: "700" },
});

const sh = StyleSheet.create({
  title: {
    color: C.gold, fontSize: 14, fontWeight: "800",
    textAlign: "right", paddingHorizontal: 16,
    marginTop: 22, marginBottom: 10,
    borderRightWidth: 3, borderRightColor: C.gold, paddingRight: 10,
  },
});

const sp = StyleSheet.create({
  pill: { flex: 1, backgroundColor: C.card, borderRadius: 12, paddingVertical: 12, alignItems: "center", gap: 3, borderWidth: 1, borderColor: C.border },
  accent: { borderColor: "#2B7A4B" },
  highlight: { borderColor: C.gold },
  green: { borderColor: "#4CAF50" },
  icon: { fontSize: 16 },
  value: { color: C.white, fontSize: 16, fontWeight: "800" },
  label: { color: C.textMuted, fontSize: 10 },
});

const pt = StyleSheet.create({
  card: { width: "47%", flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 14, alignItems: "center", gap: 8, borderWidth: 1.5, borderColor: C.border },
  cardActive: { borderColor: "#2B7A4B", backgroundColor: "rgba(43,122,75,0.08)" },
  cardGold: { borderColor: C.gold, backgroundColor: "rgba(201,160,34,0.08)" },
  icon: { fontSize: 28 },
  label: { color: C.white, fontSize: 12, fontWeight: "700", textAlign: "center" },
  badge: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 4, minWidth: 36, alignItems: "center" },
  badgeGreen: { backgroundColor: "#2B7A4B" },
  badgeGold: { backgroundColor: C.gold },
  badgeEmpty: { backgroundColor: "rgba(255,255,255,0.08)" },
  badgeText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  badgeTextEmpty: { color: C.textMuted },
});

const nt = StyleSheet.create({
  card: { width: "30%", flex: 1, minWidth: "28%", backgroundColor: C.card, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 8, alignItems: "center", gap: 5, borderWidth: 1, borderColor: C.border },
  cardGold: { borderColor: C.gold, backgroundColor: "rgba(201,160,34,0.1)" },
  cardRed: { borderColor: "#E53E3E", backgroundColor: "rgba(229,62,62,0.1)" },
  icon: { fontSize: 24 },
  label: { color: C.white, fontSize: 11, fontWeight: "700", textAlign: "center" },
  labelGold: { color: C.gold },
  labelRed: { color: "#E53E3E" },
  sub: { color: C.textMuted, fontSize: 11, fontWeight: "600" },
  subRed: { color: "#E53E3E", fontWeight: "800" },
});

/* ── أنماط النسخ الاحتياطية المحفوظة ── */
const bk = StyleSheet.create({
  toggleBtn: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 12, padding: 14, marginHorizontal: 16, marginBottom: 8, gap: 10, borderWidth: 1, borderColor: C.border },
  toggleIcon: { fontSize: 18 },
  toggleLabel: { flex: 1, color: C.white, fontSize: 14, fontWeight: "700", textAlign: "right" },
  toggleArrow: { color: C.gold, fontSize: 13, fontWeight: "700" },
  empty: { alignItems: "center", paddingVertical: 16, marginHorizontal: 16, backgroundColor: C.card, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  emptyText: { color: C.textMuted, fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 12, padding: 12, marginHorizontal: 16, marginBottom: 6, gap: 8, borderWidth: 1, borderColor: C.border },
  icon: { fontSize: 18 },
  name: { color: C.white, fontSize: 12, fontWeight: "700", textAlign: "right" },
  sub: { color: C.textMuted, fontSize: 10, textAlign: "right" },
  actionBtn: { padding: 4 },
  dl: { fontSize: 18 },
  delIcon: { fontSize: 18 },
});

/* ── أنماط مودال قائمة الزوار ── */
const vl = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.bgDark, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "80%", borderTopWidth: 2, borderColor: C.gold },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.gold, alignSelf: "center", marginBottom: 16 },
  title: { color: C.gold, fontSize: 16, fontWeight: "800", textAlign: "center", marginBottom: 14 },
  empty: { alignItems: "center", paddingVertical: 30 },
  emptyText: { color: C.textMuted, fontSize: 14 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 10, padding: 10, gap: 10, borderWidth: 1, borderColor: C.border },
  rowNum: { color: C.textMuted, fontSize: 13, width: 24, textAlign: "center" },
  rowInfo: { flex: 1, alignItems: "flex-end", gap: 2 },
  rowName: { color: C.white, fontSize: 14, fontWeight: "700" },
  rowPhone: { color: C.textMuted, fontSize: 12 },
  resetBtn: { marginTop: 14, backgroundColor: "rgba(229,62,62,0.15)", borderRadius: 10, paddingVertical: 11, alignItems: "center", borderWidth: 1, borderColor: C.error },
  resetBtnText: { color: C.error, fontSize: 13, fontWeight: "700" },
  closeBtn: { marginTop: 8, backgroundColor: C.bgLight, borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  closeBtnText: { color: C.textMuted, fontSize: 14 },
});
