import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { getImageUri } from "@/utils/imageUrl";

interface Props {
  items: any[];
}

function ShareCardItem({ item }: { item: any }) {
  const firstImg = item.images?.[0];
  const imgUri = firstImg ? getImageUri(firstImg) : null;
  const hasFloors = item.floors && item.floors.length > 0;

  return (
    <View style={s.card}>
      {imgUri ? (
        <Image
          source={{ uri: imgUri }}
          style={s.cardImg}
          resizeMode="cover"
        />
      ) : null}

      <View style={s.cardBody}>
        {/* رقم البطاقة + النوع */}
        <View style={s.cardTop}>
          <Text style={s.cardNum}>#{item.cardNumber}</Text>
          <Text style={s.cardTitle} numberOfLines={1}>
            {[item.propertyType, item.region].filter(Boolean).join(" — ")}
          </Text>
        </View>

        {item.projectName ? (
          <Text style={s.infoRow}>🏗️ {item.projectName}</Text>
        ) : null}

        {/* جدول المعلومات */}
        <View style={s.table}>
          {item.price ? (
            <View style={s.tableRow}>
              <Text style={s.tableVal}>{item.price}</Text>
              <Text style={s.tableKey}>💰 السعر</Text>
            </View>
          ) : null}
          {item.area ? (
            <View style={s.tableRow}>
              <Text style={s.tableVal}>{item.area} م²</Text>
              <Text style={s.tableKey}>📐 المساحة</Text>
            </View>
          ) : null}
          {item.floor ? (
            <View style={s.tableRow}>
              <Text style={s.tableVal}>{item.floor}</Text>
              <Text style={s.tableKey}>🏢 الطابق</Text>
            </View>
          ) : null}
        </View>

        {/* طوابق متعددة */}
        {hasFloors && (
          <View style={s.floors}>
            {item.floors.map((f: any, i: number) => (
              <View key={i} style={s.floorRow}>
                <Text style={s.floorName}>{f.name}</Text>
                {f.area ? <Text style={s.floorVal}>{f.area} م²</Text> : null}
                {f.price ? <Text style={s.floorPrice}>{f.price} ألف</Text> : null}
              </View>
            ))}
          </View>
        )}

        {item.description ? (
          <Text style={s.desc} numberOfLines={3}>{item.description}</Text>
        ) : null}
      </View>
    </View>
  );
}

export default function SharePreviewPanel({ items }: Props) {
  const today = new Date().toLocaleDateString("ar-JO", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <>
      {/* رأس الصفحة */}
      <View style={s.header}>
        <Text style={s.headerTitle}>شقق وأراضي المستقبل</Text>
        <Text style={s.headerSub}>{today} • {items.length} إعلان</Text>
      </View>

      {/* البطاقات */}
      {items.map((item) => (
        <ShareCardItem key={item.id} item={item} />
      ))}

      {/* تذييل */}
      <View style={s.footer}>
        <Text style={s.footerText}>📍 شقق وأراضي المستقبل</Text>
      </View>
    </>
  );
}

const GOLD = "#C9A022";
const GREEN = "#1A5C2E";
const DARK = "#0f3a1e";

const s = StyleSheet.create({
  header: {
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: GOLD,
    marginBottom: 12,
  },
  headerTitle: { color: GOLD, fontSize: 20, fontWeight: "800" },
  headerSub: { color: "#aaa", fontSize: 12, marginTop: 4 },
  card: {
    backgroundColor: GREEN,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: GOLD,
  },
  cardImg: { width: "100%", height: 180 },
  cardBody: { padding: 12 },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  cardNum: { color: GOLD, fontWeight: "900", fontSize: 16 },
  cardTitle: { color: "#fff", fontSize: 14, fontWeight: "600", flex: 1, textAlign: "right", marginRight: 8 },
  infoRow: { color: "#ddd", fontSize: 13, textAlign: "right", marginBottom: 6 },
  table: { borderWidth: 1, borderColor: "rgba(201,160,34,0.3)", borderRadius: 8, overflow: "hidden" },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(201,160,34,0.2)",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  tableKey: { color: GOLD, fontSize: 13, fontWeight: "600" },
  tableVal: { color: "#fff", fontSize: 13 },
  floors: { marginTop: 8, gap: 4 },
  floorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(201,160,34,0.1)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  floorName: { color: GOLD, fontSize: 12, fontWeight: "700" },
  floorVal: { color: "#ccc", fontSize: 12 },
  floorPrice: { color: "#8bff8b", fontSize: 12 },
  desc: { color: "#bbb", fontSize: 12, textAlign: "right", marginTop: 8, lineHeight: 18 },
  footer: {
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(201,160,34,0.3)",
    marginTop: 4,
  },
  footerText: { color: "#aaa", fontSize: 12 },
});
