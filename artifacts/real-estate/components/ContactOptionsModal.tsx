import React, { useRef, useEffect } from "react";
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  Linking, Animated,
} from "react-native";
import C from "@/constants/colors";

interface Props {
  visible: boolean;
  phone: string;
  onClose: () => void;
  onLog?: (type: "whatsapp" | "call") => void;
}

const CARD_GREEN = "#1A5C2E";

function formatWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("962")) return digits;
  if (digits.startsWith("0")) return "962" + digits.slice(1);
  return "962" + digits;
}

export default function ContactOptionsModal({ visible, phone, onClose, onLog }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    } else {
      opacity.setValue(0);
    }
  }, [visible]);

  const handleCall = () => {
    onClose();
    onLog?.("call");
    setTimeout(() => Linking.openURL(`tel:${phone}`), 100);
  };

  const handleWhatsApp = () => {
    onClose();
    onLog?.("whatsapp");
    const waNum = formatWhatsApp(phone);
    setTimeout(() => Linking.openURL(`https://wa.me/${waNum}`), 100);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View style={[styles.overlayBg, { opacity }]} />
      </TouchableOpacity>

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <Text style={styles.title}>اختر طريقة التواصل</Text>
        <Text style={styles.phoneDisplay}>{phone}</Text>

        <TouchableOpacity style={[styles.optionBtn, styles.callBtn]} onPress={handleCall} activeOpacity={0.85}>
          <Text style={styles.optionIcon}>📞</Text>
          <Text style={styles.optionText}>اتصال مباشر</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.optionBtn, styles.waBtn]} onPress={handleWhatsApp} activeOpacity={0.85}>
          <Text style={styles.optionIcon}>💬</Text>
          <Text style={styles.optionText}>واتساب</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
          <Text style={styles.cancelText}>إلغاء</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    backgroundColor: CARD_GREEN,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderTopWidth: 2,
    borderColor: C.gold,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.gold, alignSelf: "center", marginBottom: 20,
  },
  title: {
    color: C.gold, fontSize: 18, fontWeight: "800",
    textAlign: "center", marginBottom: 6,
  },
  phoneDisplay: {
    color: "#fff", fontSize: 20, fontWeight: "700",
    textAlign: "center", marginBottom: 24,
    letterSpacing: 1,
  },
  optionBtn: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, paddingVertical: 16, paddingHorizontal: 20,
    marginBottom: 12, gap: 14,
  },
  callBtn: {
    backgroundColor: C.gold,
  },
  waBtn: {
    backgroundColor: "#25D366",
  },
  optionIcon: { fontSize: 24 },
  optionText: {
    fontSize: 17, fontWeight: "800",
    color: CARD_GREEN, flex: 1, textAlign: "right",
  },
  cancelBtn: {
    marginTop: 4,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  cancelText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
