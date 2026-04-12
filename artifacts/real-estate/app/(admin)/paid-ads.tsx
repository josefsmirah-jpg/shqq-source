import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet, Alert, ActivityIndicator,
  TouchableOpacity, TextInput, Modal, RefreshControl, ScrollView
} from "react-native";
import { useGetPaidAds, useCreatePaidAd, useDeletePaidAd, useGetListings } from "@workspace/api-client-react";
import AppHeader from "@/components/AppHeader";
import ConfirmModal from "@/components/ConfirmModal";
import C from "@/constants/colors";
import { PACKAGES } from "@/utils/arabic";

export default function AdminPaidAdsScreen() {
  const { data: paidAds = [], isLoading, refetch, isRefetching } = useGetPaidAds();
  const { data: approvedListings = [] } = useGetListings({ status: "approved" });
  const createMutation = useCreatePaidAd();
  const deleteMutation = useDeletePaidAd();

  const [showModal, setShowModal] = useState(false);
  const [listingId, setListingId] = useState<string>("");
  const [selectedPkg, setSelectedPkg] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [showListings, setShowListings] = useState(false);
  const [showPkgs, setShowPkgs] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const handleCreate = () => {
    if (!listingId || selectedPkg === null || !companyName.trim()) {
      Alert.alert("تنبيه", "يرجى تعبئة جميع الحقول");
      return;
    }
    const pkg = PACKAGES[selectedPkg];
    createMutation.mutate({ data: {
      listingId: Number(listingId),
      packageType: pkg.key,
      amount: pkg.price,
      companyName,
    }}, {
      onSuccess: () => { setShowModal(false); refetch(); },
      onError: () => Alert.alert("خطأ", "تعذر الإضافة"),
    });
  };

  const confirmDelete = () => {
    if (deleteTargetId === null) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);
    deleteMutation.mutate({ id }, { onSuccess: () => refetch() });
  };

  return (
    <View style={styles.container}>
      <AppHeader title="الإعلانات المدفوعة" showBack />

      <ConfirmModal
        visible={deleteTargetId !== null}
        title="حذف الإعلان المدفوع"
        message="هل تريد حذف هذا الإعلان المدفوع؟"
        confirmText="حذف"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />

      {/* إجمالي الإيرادات */}
      {!isLoading && paidAds.length > 0 && (
        <View style={styles.revenueBox}>
          <Text style={styles.revenueLabel}>💰 إجمالي الإيرادات من الإعلانات المميزة</Text>
          <Text style={styles.revenueAmount}>
            {(paidAds as any[]).reduce((sum, ad) => sum + (Number(ad.amount) || 0), 0).toLocaleString("ar-JO")} دينار
          </Text>
          <Text style={styles.revenueCount}>({paidAds.length} إعلان مميز)</Text>
        </View>
      )}

      <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
        <Text style={styles.addBtnText}>➕ إضافة إعلان مدفوع</Text>
      </TouchableOpacity>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.gold} /></View>
      ) : paidAds.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>⭐</Text>
          <Text style={styles.emptyText}>لا توجد إعلانات مدفوعة</Text>
        </View>
      ) : (
        <FlatList
          data={paidAds}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.adCard}>
              <View style={styles.adInfo}>
                <Text style={styles.adCompany}>🏢 {item.companyName || "غير محدد"}</Text>
                <Text style={styles.adPackage}>⭐ {item.packageType}</Text>
                <Text style={styles.adPrice}>💰 {item.amount} دينار</Text>
                <Text style={styles.adListingId}>رقم الإعلان: {item.listingId}</Text>
                {item.createdAt && (
                  <Text style={styles.adDate}>{new Date(item.createdAt).toLocaleDateString("ar-JO")}</Text>
                )}
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => setDeleteTargetId(item.id)}>
                <Text style={styles.deleteBtnText}>حذف</Text>
              </TouchableOpacity>
            </View>
          )}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.gold} />}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>إضافة إعلان مدفوع</Text>

              <Text style={styles.fieldLabel}>اسم الشركة</Text>
              <TextInput style={styles.modalInput} value={companyName} onChangeText={setCompanyName} placeholder="اسم الشركة" placeholderTextColor={C.textMuted} textAlign="right" />

              <Text style={styles.fieldLabel}>الإعلان</Text>
              <TouchableOpacity style={styles.select} onPress={() => setShowListings(!showListings)}>
                <Text style={listingId ? styles.selectValue : styles.selectPlaceholder}>
                  {listingId ? (approvedListings.find(l => l.id === Number(listingId))?.region || `إعلان #${listingId}`) : "اختر الإعلان"}
                </Text>
              </TouchableOpacity>
              {showListings && (
                <View style={styles.dropdown}>
                  {approvedListings.slice(0, 30).map(l => (
                    <TouchableOpacity key={l.id} style={styles.dropdownItem} onPress={() => { setListingId(String(l.id)); setShowListings(false); }}>
                      <Text style={styles.dropdownText}>#{l.cardNumber} - {l.region} - {l.ownerName}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.fieldLabel}>الباقة</Text>
              <TouchableOpacity style={styles.select} onPress={() => setShowPkgs(!showPkgs)}>
                <Text style={selectedPkg !== null ? styles.selectValue : styles.selectPlaceholder}>
                  {selectedPkg !== null ? `${PACKAGES[selectedPkg].label} - ${PACKAGES[selectedPkg].price} دينار` : "اختر الباقة"}
                </Text>
              </TouchableOpacity>
              {showPkgs && (
                <View style={styles.dropdown}>
                  {PACKAGES.map((pkg, idx) => (
                    <TouchableOpacity key={idx} style={styles.dropdownItem} onPress={() => { setSelectedPkg(idx); setShowPkgs(false); }}>
                      <Text style={styles.dropdownText}>{pkg.label} - {pkg.price} دينار ({pkg.duration})</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                  <Text style={styles.cancelBtnText}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, createMutation.isPending && { opacity: 0.7 }]} onPress={handleCreate} disabled={createMutation.isPending}>
                  <Text style={styles.saveBtnText}>إضافة</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  addBtn: { marginHorizontal: 12, marginBottom: 8, backgroundColor: C.bgLight, borderRadius: 10, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: C.gold },
  addBtnText: { color: C.gold, fontWeight: "600", fontSize: 14 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: C.textMuted, fontSize: 16 },
  revenueBox: { marginHorizontal: 12, marginBottom: 8, marginTop: 4, backgroundColor: "rgba(26,92,46,0.25)", borderRadius: 14, padding: 14, borderWidth: 2, borderColor: C.gold, alignItems: "center", gap: 4 },
  revenueLabel: { color: C.textMuted, fontSize: 12, textAlign: "center" },
  revenueAmount: { color: C.gold, fontSize: 28, fontWeight: "800", textAlign: "center" },
  revenueCount: { color: C.textMuted, fontSize: 12, textAlign: "center" },
  adCard: { flexDirection: "row", backgroundColor: C.card, margin: 10, marginVertical: 5, borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: C.gold },
  adInfo: { flex: 1, gap: 3 },
  adCompany: { color: C.white, fontSize: 14, fontWeight: "700", textAlign: "right" },
  adPackage: { color: C.gold, fontSize: 13, textAlign: "right" },
  adPrice: { color: C.goldLight, fontSize: 13, textAlign: "right" },
  adListingId: { color: C.textMuted, fontSize: 12, textAlign: "right" },
  adDate: { color: C.textMuted, fontSize: 11, textAlign: "right" },
  deleteBtn: { backgroundColor: "rgba(229,62,62,0.2)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  deleteBtnText: { color: C.error, fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", padding: 20 },
  modal: { backgroundColor: C.bgDark, borderRadius: 16, padding: 20, gap: 8, borderWidth: 1, borderColor: C.border, marginTop: 60 },
  modalTitle: { color: C.gold, fontSize: 16, fontWeight: "700", textAlign: "center", marginBottom: 4 },
  fieldLabel: { color: C.gold, fontSize: 13, fontWeight: "600", textAlign: "right" },
  modalInput: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.inputBorder, borderRadius: 10, padding: 14, color: C.white, fontSize: 15 },
  select: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.inputBorder, borderRadius: 10, padding: 14 },
  selectValue: { color: C.white, fontSize: 14, textAlign: "right" },
  selectPlaceholder: { color: C.textMuted, fontSize: 14, textAlign: "right" },
  dropdown: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10, maxHeight: 180 },
  dropdownItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  dropdownText: { color: C.white, fontSize: 13, textAlign: "right" },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: C.bgLight, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  cancelBtnText: { color: C.textMuted, fontSize: 14 },
  saveBtn: { flex: 1, backgroundColor: C.gold, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  saveBtnText: { color: C.bgDark, fontWeight: "700", fontSize: 14 },
});
