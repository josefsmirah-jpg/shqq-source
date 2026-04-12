import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import C from "@/constants/colors";
import { formatDate, FIXED_PHONE } from "@/utils/arabic";
import ContactOptionsModal from "@/components/ContactOptionsModal";

interface Floor {
  name: string;
  area?: string;
  price?: string;
}

interface Listing {
  id: number;
  cardNumber: number;
  propertyType?: string;
  region: string;
  price?: string;
  floor?: string;
  area?: string;
  description?: string;
  images?: string[];
  floors?: Floor[];
  status: string;
  createdByRole: string;
  createdByName?: string;
  ownerPhone?: string;
  ownerName?: string;
  isFeatured?: boolean;
  projectName?: string;
  createdAt: string;
}

interface Props {
  listing: Listing;
  onOpen: () => void;
  showOwner?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onShareWhatsApp?: () => void;
  showActions?: boolean;
  deleteLabelOverride?: string;
  approveLabelOverride?: string;
  compact?: boolean;
}

const CARD_GREEN = "#1A5C2E";
const GOLD = "#C9A022";
const TABLE_BORDER = "rgba(201,160,34,0.4)";

export default function ListingCard({ listing, onOpen, showOwner, onDelete, onEdit, onApprove, onReject, onShareWhatsApp, showActions, deleteLabelOverride, approveLabelOverride, compact }: Props) {
  const [showContact, setShowContact] = useState(false);

  const statusColor = listing.status === "approved" ? C.success : listing.status === "rejected" ? C.error : listing.status === "deleted" ? "#888" : C.warning;
  const statusLabel = listing.status === "approved" ? "معتمد" : listing.status === "rejected" ? "مرفوض" : listing.status === "deleted" ? "محذوف" : "قيد المراجعة";
  const hasFloors = listing.floors && listing.floors.length > 0;

  const displayPhone = (listing.isFeatured && listing.ownerPhone) ? listing.ownerPhone : FIXED_PHONE;

  const callOwner = () => setShowContact(true);

  const title = listing.propertyType
    ? `${listing.propertyType} — ${listing.region}`
    : listing.region;

  if (compact) {
    // Calculate price range for floors
    let floorCount = 0;
    let minPrice: number | null = null;
    let maxPrice: number | null = null;
    if (hasFloors) {
      floorCount = listing.floors!.length;
      const prices = listing.floors!
        .map(f => f.price ? parseFloat(f.price.replace(/[^\d.]/g, '')) : NaN)
        .filter(p => !isNaN(p) && p > 0);
      if (prices.length > 0) {
        minPrice = Math.min(...prices);
        maxPrice = Math.max(...prices);
      }
    }

    const priceLabel = hasFloors
      ? (minPrice !== null && maxPrice !== null
          ? (minPrice === maxPrice ? `${minPrice} ألف` : `${minPrice} — ${maxPrice} ألف`)
          : listing.floors!.map(f => f.name).slice(0, 2).join(" · ") + (listing.floors!.length > 2 ? ` +${listing.floors!.length - 2}` : ""))
      : (listing.price ? `${listing.price} ألف` : listing.description || "");

    return (
      <>
      <TouchableOpacity activeOpacity={0.85} onPress={onOpen} style={[cStyles.card, listing.isFeatured && cStyles.cardFeatured]}>
        <View style={cStyles.topRow}>
          <Text style={cStyles.title} numberOfLines={1}>{title}</Text>
          <View style={cStyles.badges}>
            <View style={cStyles.numBadge}>
              <Text style={cStyles.numBadgeText}>#{listing.cardNumber}</Text>
            </View>
            {listing.isFeatured && (
              <View style={cStyles.featuredBadge}>
                <Text style={cStyles.featuredBadgeText}>☆ مميز</Text>
              </View>
            )}
          </View>
        </View>

        <View style={cStyles.locationRow}>
          {listing.createdAt ? (
            <Text style={cStyles.dateText}>
              {(() => { const d = new Date(listing.createdAt); return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`; })()}
            </Text>
          ) : null}
          <Text style={cStyles.locationText} numberOfLines={1}>⊙  {listing.region}</Text>
        </View>

        {/* Mini table — same style for all cards */}
        <View style={cStyles.miniTable}>
          <View style={cStyles.miniTableHeader}>
            <Text style={cStyles.miniTableHCell}>السعر</Text>
            <Text style={cStyles.miniTableHCell}>المساحة</Text>
            <Text style={cStyles.miniTableHCell}>الطابق</Text>
          </View>
          {hasFloors ? (
            <>
              {listing.floors!.slice(0, 3).map((f, i) => (
                <View key={i} style={[cStyles.miniTableRow, i % 2 === 1 && cStyles.miniTableRowAlt]}>
                  <Text style={cStyles.miniTableCell} numberOfLines={1}>{f.price ? `${f.price} ألف` : "—"}</Text>
                  <Text style={cStyles.miniTableCell} numberOfLines={1}>{f.area ? `${f.area}م²` : "—"}</Text>
                  <Text style={cStyles.miniTableCell} numberOfLines={1}>{f.name}</Text>
                </View>
              ))}
              {listing.floors!.length > 3 && (
                <Text style={cStyles.miniTableMore}>+{listing.floors!.length - 3} طوابق أخرى</Text>
              )}
            </>
          ) : (
            <View style={cStyles.miniTableRow}>
              <Text style={cStyles.miniTableCell} numberOfLines={1}>{listing.price ? `${listing.price} ألف` : "—"}</Text>
              <Text style={cStyles.miniTableCell} numberOfLines={1}>{listing.area ? `${listing.area}م²` : "—"}</Text>
              <Text style={cStyles.miniTableCell} numberOfLines={1}>{listing.propertyType || listing.description || "—"}</Text>
            </View>
          )}
        </View>

        <View style={cStyles.actions}>
          <TouchableOpacity style={cStyles.phoneBtn} onPress={callOwner} activeOpacity={0.8}>
            <Text style={cStyles.phoneBtnText}>📞</Text>
          </TouchableOpacity>
          {listing.images && listing.images.length > 0 && (
            <TouchableOpacity style={cStyles.photosBtn} onPress={onOpen} activeOpacity={0.8}>
              <Text style={cStyles.photosBtnText}>📷 الصور</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={cStyles.openBtn} onPress={onOpen} activeOpacity={0.8}>
            <Text style={cStyles.openBtnText}>🗂 فتح الاعلان</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
      <ContactOptionsModal visible={showContact} phone={displayPhone} onClose={() => setShowContact(false)} />
      </>
    );
  }

  return (
    <View style={[styles.card, listing.isFeatured && styles.featured]}>
      {listing.isFeatured && (
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredText}>🔴 إعلان مميز ⭐</Text>
        </View>
      )}

      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
        <Text style={styles.cardNum}>بطاقة #{listing.cardNumber}</Text>
      </View>

      <View style={styles.miniCard}>
        <View style={styles.miniHeader}>
          <View style={styles.miniLogoBox}>
            <Image source={require("@/assets/images/logo.jpeg")} style={styles.miniLogo} resizeMode="contain" />
          </View>
          <View style={styles.miniBrand}>
            <Text style={styles.miniBrandName}>شقق وأراضي المستقبل</Text>
            <Text style={styles.miniBrandSub}>للاستثمار العقاري المتميز</Text>
          </View>
        </View>

        <View style={styles.miniLocation}>
          <Text style={styles.miniLocationText} numberOfLines={1}>◆  {listing.region}  ◆</Text>
        </View>

        {hasFloors ? (
          <View style={styles.miniTable}>
            <View style={styles.miniTableRow}>
              <Text style={styles.miniHeaderCell}>السعر</Text>
              <Text style={styles.miniSep}>|</Text>
              <Text style={styles.miniHeaderCell}>المساحة</Text>
              <Text style={styles.miniSep}>|</Text>
              <Text style={styles.miniHeaderCell}>الطابق</Text>
            </View>
            {listing.floors!.slice(0, 2).map((f, i) => (
              <View key={i} style={[styles.miniTableRow, styles.miniDataRow]}>
                <Text style={styles.miniCell}>{f.price || "—"}</Text>
                <Text style={styles.miniSep}>|</Text>
                <Text style={styles.miniCell}>{f.area ? f.area + "م²" : "—"}</Text>
                <Text style={styles.miniSep}>|</Text>
                <Text style={styles.miniCell}>{f.name}</Text>
              </View>
            ))}
            {listing.floors!.length > 2 && (
              <Text style={styles.moreRows}>+{listing.floors!.length - 2} طوابق أخرى</Text>
            )}
          </View>
        ) : (
          <View style={styles.miniTable}>
            <View style={styles.miniTableRow}>
              <Text style={styles.miniHeaderCell}>السعر</Text>
              <Text style={styles.miniSep}>|</Text>
              <Text style={styles.miniHeaderCell}>المساحة</Text>
              <Text style={styles.miniSep}>|</Text>
              <Text style={styles.miniHeaderCell}>مواصفات</Text>
            </View>
            <View style={[styles.miniTableRow, styles.miniDataRow]}>
              <Text style={styles.miniCell}>{listing.price || "—"}</Text>
              <Text style={styles.miniSep}>|</Text>
              <Text style={styles.miniCell}>{listing.area ? listing.area + "م²" : "—"}</Text>
              <Text style={styles.miniSep}>|</Text>
              <Text style={styles.miniCell}>{listing.propertyType || "—"}</Text>
            </View>
          </View>
        )}

        <View style={styles.miniFooter}>
          <Text style={styles.miniCardNum}>بطاقة #{listing.cardNumber}</Text>
          <Text style={styles.miniCompany}>شقق وأراضي المستقبل</Text>
        </View>
      </View>

      {listing.description ? (
        <Text style={styles.desc} numberOfLines={1}>{listing.description}</Text>
      ) : null}

      <View style={styles.metaRow}>
        <Text style={styles.date}>{formatDate(listing.createdAt)}</Text>
        {listing.images && listing.images.length > 0 && (
          <Text style={styles.photoCount}>📷 {listing.images.length} صورة</Text>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.openBtn} onPress={onOpen}>
          <Text style={styles.openBtnText}>فتح الاعلان 📄</Text>
        </TouchableOpacity>
        {showActions && (
          <View style={styles.mgmtActions}>
            {onApprove && (
              <TouchableOpacity style={styles.approveBtn} onPress={onApprove}>
                <Text style={styles.approveBtnText}>{approveLabelOverride || "قبول ✓"}</Text>
              </TouchableOpacity>
            )}
            {onReject && (
              <TouchableOpacity style={styles.rejectBtn} onPress={onReject}>
                <Text style={styles.rejectBtnText}>رفض ✗</Text>
              </TouchableOpacity>
            )}
            {onShareWhatsApp && (
              <TouchableOpacity style={styles.sharePhotosBtn} onPress={onShareWhatsApp}>
                <Text style={styles.sharePhotosBtnText}>📤 واتساب</Text>
              </TouchableOpacity>
            )}
            {onEdit && (
              <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
                <Text style={styles.editBtnText}>تعديل ✏️</Text>
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity style={[styles.deleteBtn, deleteLabelOverride ? styles.hardDeleteBtn : null]} onPress={onDelete}>
                <Text style={styles.deleteBtnText}>{deleteLabelOverride || "حذف 🗑"}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      <ContactOptionsModal visible={showContact} phone={displayPhone} onClose={() => setShowContact(false)} />
    </View>
  );
}

const cStyles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 14, borderWidth: 1, borderColor: "rgba(201,160,34,0.45)",
    marginHorizontal: 12, marginVertical: 5, padding: 12,
  },
  cardFeatured: { borderColor: "#E53E3E", borderWidth: 1.5 },
  topRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 4,
  },
  title: { flex: 1, color: C.white, fontSize: 17, fontWeight: "800", textAlign: "right" },
  badges: { flexDirection: "row", gap: 5, alignItems: "center", marginLeft: 8 },
  numBadge: {
    backgroundColor: "rgba(201,160,34,0.18)", borderRadius: 7,
    paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: GOLD,
  },
  numBadgeText: { color: GOLD, fontSize: 11, fontWeight: "700" },
  featuredBadge: {
    backgroundColor: "#E53E3E", borderRadius: 7,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  featuredBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  locationRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  locationText: { color: "rgba(255,255,255,0.55)", fontSize: 13, textAlign: "right" },
  dateText: { color: "rgba(255,255,255,0.4)", fontSize: 11, textAlign: "left" },
  priceRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7,
    marginBottom: 10, borderWidth: 1, borderColor: "rgba(201,160,34,0.2)",
  },
  floorCountBadge: {
    backgroundColor: "rgba(201,160,34,0.15)", borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: "rgba(201,160,34,0.35)",
  },
  floorCountText: { color: GOLD, fontSize: 11, fontWeight: "700" },
  priceRangeText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700", textAlign: "left" },
  priceRangeTextMuted: { color: "rgba(255,255,255,0.6)", fontSize: 12, flex: 1, textAlign: "left" },
  miniTable: {
    borderRadius: 8, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(201,160,34,0.3)",
    marginBottom: 10,
  },
  miniTableHeader: {
    flexDirection: "row", backgroundColor: "rgba(201,160,34,0.2)",
    paddingVertical: 5, paddingHorizontal: 4,
  },
  miniTableHCell: {
    flex: 1, color: GOLD, fontSize: 11, fontWeight: "800",
    textAlign: "center",
  },
  miniTableRow: {
    flexDirection: "row", paddingVertical: 5, paddingHorizontal: 4,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  miniTableRowAlt: { backgroundColor: "rgba(255,255,255,0.07)" },
  miniTableCell: {
    flex: 1, color: "#FFFFFF", fontSize: 11, textAlign: "center",
  },
  miniTableMore: {
    color: GOLD, fontSize: 10, textAlign: "center",
    paddingVertical: 4, backgroundColor: "rgba(201,160,34,0.08)",
  },
  actions: { flexDirection: "row", gap: 7, alignItems: "center" },
  phoneBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#27AE60", alignItems: "center", justifyContent: "center",
  },
  phoneBtnText: { fontSize: 18 },
  photosBtn: {
    paddingHorizontal: 12, height: 40, borderRadius: 10,
    borderWidth: 1.5, borderColor: GOLD, alignItems: "center", justifyContent: "center",
  },
  photosBtnText: { color: GOLD, fontSize: 13, fontWeight: "700" },
  openBtn: {
    flex: 1, height: 40, backgroundColor: GOLD,
    borderRadius: 10, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#E53E3E",
  },
  openBtnText: { color: CARD_GREEN, fontSize: 13, fontWeight: "800" },
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card, borderRadius: 14, padding: 14,
    marginHorizontal: 14, marginVertical: 6,
    borderWidth: 1, borderColor: C.border,
  },
  featured: { borderColor: "#E53E3E", borderWidth: 2 },
  featuredBadge: {
    backgroundColor: "#E53E3E", borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: "flex-end", marginBottom: 6,
    flexDirection: "row", alignItems: "center", gap: 4,
  },
  featuredText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  cardNum: { color: C.gold, fontWeight: "700", fontSize: 14 },
  statusText: { fontSize: 12, fontWeight: "600" },
  miniCard: {
    backgroundColor: CARD_GREEN, borderRadius: 10, overflow: "hidden",
    borderWidth: 1.5, borderColor: GOLD, marginBottom: 10,
  },
  miniHeader: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 8, backgroundColor: CARD_GREEN, gap: 8,
  },
  miniLogoBox: {
    width: 36, height: 36, backgroundColor: "#fff",
    borderRadius: 6, overflow: "hidden", justifyContent: "center", alignItems: "center",
  },
  miniLogo: { width: 34, height: 34 },
  miniBrand: { flex: 1, alignItems: "flex-end" },
  miniBrandName: { color: GOLD, fontSize: 12, fontWeight: "800", textAlign: "right" },
  miniBrandSub: { color: "rgba(201,160,34,0.7)", fontSize: 9, textAlign: "right" },
  miniLocation: { backgroundColor: GOLD, paddingVertical: 5, alignItems: "center" },
  miniLocationText: { color: CARD_GREEN, fontSize: 12, fontWeight: "800" },
  miniTable: { paddingVertical: 4 },
  miniTableRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 3 },
  miniHeaderCell: { flex: 1, color: GOLD, fontSize: 10, textAlign: "center", fontWeight: "700" },
  miniDataRow: { backgroundColor: "rgba(255,255,255,0.04)" },
  miniSep: { color: TABLE_BORDER, fontSize: 12, marginHorizontal: 2 },
  miniCell: { flex: 1, color: "#fff", fontSize: 11, textAlign: "center" },
  moreRows: { color: "rgba(255,255,255,0.5)", fontSize: 10, textAlign: "center", paddingBottom: 4 },
  miniFooter: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 5, backgroundColor: GOLD,
  },
  miniCardNum: { color: CARD_GREEN, fontWeight: "700", fontSize: 10 },
  miniCompany: { color: CARD_GREEN, fontWeight: "700", fontSize: 10 },
  desc: { color: C.textMuted, fontSize: 13, textAlign: "right", lineHeight: 18, marginBottom: 6 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4, marginBottom: 6 },
  date: { color: C.textMuted, fontSize: 11 },
  photoCount: { color: C.goldLight, fontSize: 11 },
  actions: { marginTop: 6, gap: 6 },
  openBtn: { backgroundColor: C.gold, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  openBtnText: { color: CARD_GREEN, fontWeight: "700", fontSize: 14 },
  mgmtActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  approveBtn: { flex: 1, backgroundColor: C.success, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  approveBtnText: { color: C.white, fontWeight: "700", fontSize: 13 },
  rejectBtn: { flex: 1, backgroundColor: C.error, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  rejectBtnText: { color: C.white, fontWeight: "700", fontSize: 13 },
  deleteBtn: { backgroundColor: C.bgLight, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, alignItems: "center" },
  hardDeleteBtn: { backgroundColor: "#4A0000", borderWidth: 1, borderColor: C.error },
  deleteBtnText: { color: C.error, fontWeight: "700", fontSize: 13 },
  sharePhotosBtn: { backgroundColor: "#1B4F72", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, alignItems: "center" },
  sharePhotosBtnText: { color: C.white, fontWeight: "700", fontSize: 12 },
  editBtn: { backgroundColor: "rgba(201,160,34,0.15)", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(201,160,34,0.4)" },
  editBtnText: { color: "#C9A022", fontWeight: "700", fontSize: 13 },
});
