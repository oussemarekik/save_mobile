import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: IoniconName;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  icon,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const iconName: IoniconName = icon ?? (destructive ? "trash-outline" : "help-circle-outline");

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconCircle, destructive && styles.iconCircleDestructive]}>
            <Ionicons
              name={iconName}
              size={28}
              color={destructive ? theme.destructive : theme.primary}
            />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                destructive ? styles.destructiveButton : styles.confirmButton,
                loading && styles.buttonDisabled,
              ]}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.primaryBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconCircleDestructive: {
    backgroundColor: theme.destructiveBg,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.foreground,
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: theme.muted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: theme.primaryBg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  confirmButton: {
    backgroundColor: theme.primary,
  },
  destructiveButton: {
    backgroundColor: theme.destructive,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelText: {
    fontWeight: "600",
    color: theme.foreground,
    fontSize: 15,
  },
  confirmText: {
    fontWeight: "700",
    color: "#fff",
    fontSize: 15,
  },
});
