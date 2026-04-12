import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import C from "@/constants/colors";

interface Props {
  title?: string;
  showBack?: boolean;
  right?: React.ReactNode;
  onBack?: () => void;
}

export default function AppHeader({ title, showBack, right, onBack }: Props) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.row}>
        {right ? <View style={styles.side}>{right}</View> : <View style={styles.side} />}
        <Text style={styles.title}>{title || "شقق وأراضي المستقبل"}</Text>
        {showBack ? (
          <TouchableOpacity style={styles.side} onPress={onBack || (() => router.back())}>
            <Text style={styles.backText}>← رجوع</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.side} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: C.bgDark },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.bgDark },
  title: { flex: 1, textAlign: "center", color: C.gold, fontSize: 16, fontWeight: "700" },
  side: { minWidth: 80 },
  backText: { color: C.gold, fontSize: 13 },
});
