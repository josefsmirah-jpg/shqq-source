import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import C from "@/constants/colors";

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  visible, title, message, confirmText = "تأكيد", cancelText = "إلغاء",
  destructive = false, onConfirm, onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.btns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, destructive && styles.destructiveBtn]}
              onPress={onConfirm}
            >
              <Text style={[styles.confirmText, destructive && styles.destructiveText]}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center", alignItems: "center", padding: 30,
  },
  box: {
    backgroundColor: C.bgDark, borderRadius: 16, padding: 24,
    width: "100%", maxWidth: 320, borderWidth: 1, borderColor: C.border,
  },
  title: { color: C.gold, fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 10 },
  message: { color: C.white, fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 20 },
  btns: { flexDirection: "row", gap: 12 },
  cancelBtn: {
    flex: 1, backgroundColor: C.bgLight, borderRadius: 10,
    paddingVertical: 13, alignItems: "center",
  },
  cancelText: { color: C.textMuted, fontSize: 15, fontWeight: "600" },
  confirmBtn: {
    flex: 1, backgroundColor: C.gold, borderRadius: 10,
    paddingVertical: 13, alignItems: "center",
  },
  confirmText: { color: C.bgDark, fontSize: 15, fontWeight: "700" },
  destructiveBtn: { backgroundColor: "rgba(229,62,62,0.2)", borderWidth: 1, borderColor: C.error },
  destructiveText: { color: C.error },
});
