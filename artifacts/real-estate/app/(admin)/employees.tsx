import React, { useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, Alert, ActivityIndicator,
  TouchableOpacity, TextInput, Modal, RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useGetEmployees, useCreateEmployee, useDeleteEmployee, useUpdateEmployee } from "@workspace/api-client-react";
import AppHeader from "@/components/AppHeader";
import ConfirmModal from "@/components/ConfirmModal";
import C from "@/constants/colors";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
const MIN_PAYOUT = 10.0;

export default function AdminEmployeesScreen() {
  const { data: employees = [], isLoading, refetch, isRefetching } = useGetEmployees();

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const createMutation = useCreateEmployee();
  const deleteMutation = useDeleteEmployee();
  const updateMutation = useUpdateEmployee();

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const [payTarget, setPayTarget] = useState<{ id: number; name: string; balance: number } | null>(null);
  const [payLoading, setPayLoading] = useState(false);

  const openCreate = () => {
    setEditId(null); setName(""); setUsername(""); setPassword(""); setPhone(""); setShowModal(true);
  };

  const openEdit = (emp: any) => {
    setEditId(emp.id); setName(emp.name || ""); setUsername(emp.username || ""); setPassword(""); setPhone(emp.phone || ""); setShowModal(true);
  };

  const handleSave = () => {
    if (!name.trim() || !username.trim()) { Alert.alert("تنبيه", "يرجى إدخال الاسم واسم المستخدم"); return; }
    if (!editId && !password.trim()) { Alert.alert("تنبيه", "يرجى إدخال كلمة المرور"); return; }

    const normalizedPhone = phone.trim().replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[^0-9]/g, "");

    if (editId) {
      updateMutation.mutate({ id: editId, data: { name, username, password: password || undefined, phone: normalizedPhone || undefined } as any }, {
        onSuccess: () => { setShowModal(false); refetch(); },
        onError: (err: any) => {
          const msg = err?.response?.data?.error || err?.message || "تعذر التحديث";
          Alert.alert("خطأ", msg);
        },
      });
    } else {
      createMutation.mutate({ data: { name, username, password, phone: normalizedPhone || undefined } as any }, {
        onSuccess: () => { setShowModal(false); refetch(); },
        onError: (err: any) => {
          const msg = err?.response?.data?.error || err?.message || "تعذر الإنشاء";
          Alert.alert("خطأ", msg);
        },
      });
    }
  };

  const openPay = (emp: any) => {
    const bal = emp.wallet?.balance ?? 0;
    setPayTarget({ id: emp.id, name: emp.name || "", balance: bal });
  };

  const handlePay = async () => {
    if (!payTarget) return;
    setPayLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/employees/${payTarget.id}/wallet/deduct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        const archivedCount = data.archivedCount ?? 0;
        setPayTarget(null);
        refetch();
        Alert.alert("تم ✅", `تم دفع أجور ${payTarget.name}\nتم أرشفة ${archivedCount} إعلان معتمد\nتم تصفير المحفظة`);
      } else {
        Alert.alert("خطأ", data.error || "تعذر الدفع");
      }
    } catch {
      Alert.alert("خطأ", "تعذر الاتصال بالسيرفر");
    } finally {
      setPayLoading(false);
    }
  };

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    setDeleteTarget(null);
    deleteMutation.mutate({ id }, { onSuccess: () => refetch() });
  }, [deleteTarget, deleteMutation, refetch]);

  return (
    <View style={styles.container}>
      <AppHeader title="الموظفون" showBack />

      <ConfirmModal
        visible={!!deleteTarget}
        title="حذف الموظف"
        message={`هل تريد حذف ${deleteTarget?.name ?? ""}؟`}
        confirmText="حذف"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
        <Text style={styles.addBtnText}>➕ إضافة موظف جديد</Text>
      </TouchableOpacity>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.gold} /></View>
      ) : employees.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>👷</Text>
          <Text style={styles.emptyText}>لا يوجد موظفون بعد</Text>
        </View>
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => {
            const wallet = (item as any).wallet;
            const bal = wallet?.balance ?? 0;
            const canPay = bal > 0;
            const isReady = wallet?.canWithdraw;
            return (
              <View style={[styles.empCard, isReady && styles.empCardReady]}>
                {/* معلومات الموظف */}
                <View style={styles.empInfo}>
                  <Text style={styles.empName}>{item.name}</Text>
                  <Text style={styles.empUsername}>@{item.username}</Text>
                  {(item as any).phone
                    ? <Text style={styles.empPhone}>📞 {(item as any).phone}</Text>
                    : <Text style={styles.empPhoneMissing}>⚠️ لا يوجد رقم هاتف</Text>
                  }
                </View>

                {/* محفظة الموظف */}
                {wallet && !wallet.error ? (
                  <View style={[styles.walletBox, isReady && styles.walletBoxReady]}>
                    <Text style={[styles.walletBalance, isReady && styles.walletBalanceReady]}>
                      💰 {bal.toFixed(3)} د.أ
                    </Text>
                    <View style={styles.walletStats}>
                      <Text style={styles.walletStat}>🏞️ {wallet.landCount}</Text>
                      <Text style={styles.walletStat}>🏠 {wallet.singleAptCount}</Text>
                      <Text style={styles.walletStat}>🏢 {wallet.multiAptCount}</Text>
                    </View>
                    {isReady && <Text style={styles.readyLabel}>✅ جاهز للصرف</Text>}
                    {canPay && (
                      <TouchableOpacity style={[styles.payBtn, isReady && styles.payBtnReady]} onPress={() => openPay(item)}>
                        <Text style={styles.payBtnText}>💳 دفع</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <View style={styles.walletBox}>
                    <Text style={styles.noWalletText}>لا هاتف</Text>
                  </View>
                )}

                {/* أزرار تعديل/حذف/ملف مالي */}
                <View style={styles.empActions}>
                  <TouchableOpacity
                    style={styles.profileBtn}
                    onPress={() => router.push({ pathname: "/(admin)/employee-profile" as any, params: { id: item.id, name: item.name } })}
                  >
                    <Text style={styles.profileBtnText}>📁 ملف مالي</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                    <Text style={styles.editBtnText}>تعديل</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => setDeleteTarget({ id: item.id, name: item.name || "" })}>
                    <Text style={styles.deleteBtnText}>حذف</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.gold} />}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      {/* ── مودال إضافة/تعديل موظف ── */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editId ? "تعديل موظف" : "إضافة موظف جديد"}</Text>
            <TextInput style={styles.modalInput} value={name} onChangeText={setName} placeholder="الاسم الكامل *" placeholderTextColor={C.textMuted} textAlign="right" />
            <TextInput style={styles.modalInput} value={username} onChangeText={setUsername} placeholder="اسم المستخدم *" placeholderTextColor={C.textMuted} autoCapitalize="none" />
            <TextInput style={styles.modalInput} value={phone} onChangeText={setPhone} placeholder="رقم الهاتف * (مطلوب للمحفظة)" placeholderTextColor={C.textMuted} keyboardType="phone-pad" textAlign="right" />
            <TextInput style={styles.modalInput} value={password} onChangeText={setPassword} placeholder={editId ? "كلمة مرور جديدة (اتركها فارغة)" : "كلمة المرور *"} placeholderTextColor={C.textMuted} secureTextEntry />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (createMutation.isPending || updateMutation.isPending) && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <Text style={styles.saveBtnText}>{editId ? "تحديث" : "إضافة"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── مودال دفع المحفظة ── */}
      <Modal visible={!!payTarget} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>💳 دفع أجور {payTarget?.name}</Text>
            <View style={styles.payInfoBox}>
              <Text style={styles.payInfoLabel}>المبلغ المستحق:</Text>
              <Text style={styles.payInfoAmount}>{(payTarget?.balance ?? 0).toFixed(3)} د.أ</Text>
            </View>
            <Text style={styles.payNote}>
              ⚠️ عند التأكيد سيتم أرشفة جميع الإعلانات المعتمدة لهذا الموظف وتصفير المحفظة
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setPayTarget(null); }}>
                <Text style={styles.cancelBtnText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, payLoading && { opacity: 0.7 }]} onPress={handlePay} disabled={payLoading}>
                {payLoading ? <ActivityIndicator color={C.bgDark} /> : <Text style={styles.saveBtnText}>تأكيد الدفع ✅</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  addBtn: { margin: 14, backgroundColor: C.bgLight, borderRadius: 10, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: C.gold },
  addBtnText: { color: C.gold, fontWeight: "600", fontSize: 14 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: C.textMuted, fontSize: 16 },

  empCard: {
    backgroundColor: C.card, margin: 10, marginVertical: 5,
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border, gap: 10,
  },
  empCardReady: { borderColor: "#4CAF50", backgroundColor: "#0d1f10" },
  empInfo: { gap: 3 },
  empName: { color: C.white, fontSize: 15, fontWeight: "700", textAlign: "right" },
  empUsername: { color: C.gold, fontSize: 13, textAlign: "right" },
  empPhone: { color: C.success, fontSize: 12, textAlign: "right" },
  empPhoneMissing: { color: C.error, fontSize: 12, textAlign: "right" },

  walletBox: {
    backgroundColor: C.bgLight, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: C.border, gap: 6,
  },
  walletBoxReady: { borderColor: "#4CAF50", backgroundColor: "#0d2e12" },
  walletBalance: { color: C.white, fontSize: 16, fontWeight: "700", textAlign: "right" },
  walletBalanceReady: { color: "#4CAF50" },
  walletStats: { flexDirection: "row", gap: 12, justifyContent: "flex-end" },
  walletStat: { color: C.textMuted, fontSize: 13 },
  readyLabel: { color: "#4CAF50", fontSize: 12, textAlign: "center", fontWeight: "700" },
  noWalletText: { color: C.textMuted, fontSize: 12, textAlign: "center" },
  payBtn: {
    backgroundColor: C.gold, borderRadius: 8,
    paddingVertical: 8, alignItems: "center",
  },
  payBtnReady: { backgroundColor: "#4CAF50" },
  payBtnText: { color: C.bgDark, fontWeight: "700", fontSize: 13 },

  empActions: { flexDirection: "row", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" },
  profileBtn: { backgroundColor: "rgba(201,160,34,0.15)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.gold },
  profileBtnText: { color: C.gold, fontSize: 13, fontWeight: "700" },
  editBtn: { backgroundColor: C.bgLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editBtnText: { color: C.gold, fontSize: 13 },
  deleteBtn: { backgroundColor: "rgba(229,62,62,0.2)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  deleteBtnText: { color: C.error, fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 20 },
  modal: { backgroundColor: C.bgDark, borderRadius: 16, padding: 20, gap: 12, borderWidth: 1, borderColor: C.border },
  modalTitle: { color: C.gold, fontSize: 16, fontWeight: "700", textAlign: "center" },
  modalInput: {
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.inputBorder,
    borderRadius: 10, padding: 14, color: C.white, fontSize: 15, textAlign: "right",
  },
  modalBtns: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, backgroundColor: C.bgLight, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  cancelBtnText: { color: C.textMuted, fontSize: 14 },
  saveBtn: { flex: 1, backgroundColor: C.gold, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  saveBtnText: { color: C.bgDark, fontWeight: "700", fontSize: 14 },

  payInfoBox: {
    backgroundColor: C.bgLight, borderRadius: 10, padding: 14,
    alignItems: "center", borderWidth: 1, borderColor: C.gold,
  },
  payInfoLabel: { color: C.textMuted, fontSize: 13, marginBottom: 4 },
  payInfoAmount: { color: C.gold, fontSize: 24, fontWeight: "800" },
  payNote: {
    color: "#E97316", fontSize: 12, textAlign: "center",
    backgroundColor: "rgba(233,115,22,0.1)", borderRadius: 8, padding: 10,
  },
});
