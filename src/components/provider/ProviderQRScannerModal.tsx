import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "@/context/LanguageContext";
import { theme } from "@/lib/theme";

interface ProviderQRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (token: string) => void;
}

export function ProviderQRScannerModal({ visible, onClose, onScan }: ProviderQRScannerModalProps) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [qrCode, setQrCode] = useState("");
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  useEffect(() => {
    if (visible) scannedRef.current = false;
  }, [visible]);

  useEffect(() => {
    if (visible && mode === "camera" && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [visible, mode, permission, requestPermission]);

  const handleClose = () => {
    setQrCode("");
    setMode("camera");
    onClose();
  };

  const handleManualSubmit = () => {
    if (qrCode.trim()) {
      onScan(qrCode.trim());
      handleClose();
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    onScan(data);
    handleClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="qr-code-outline" size={22} color={theme.foreground} />
              <Text style={styles.title}>{t("qr_scanner.title") || "Scan QR Code"}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Ionicons name="close" size={20} color={theme.foreground} />
            </TouchableOpacity>
          </View>

          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === "camera" && styles.modeBtnActive]}
              onPress={() => setMode("camera")}
            >
              <Ionicons name="camera-outline" size={16} color={mode === "camera" ? "#fff" : theme.muted} />
              <Text style={[styles.modeBtnText, mode === "camera" && styles.modeBtnTextActive]}>
                {t("qr_scanner.use_camera") || "Camera"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === "manual" && styles.modeBtnActive]}
              onPress={() => setMode("manual")}
            >
              <Ionicons name="keypad-outline" size={16} color={mode === "manual" ? "#fff" : theme.muted} />
              <Text style={[styles.modeBtnText, mode === "manual" && styles.modeBtnTextActive]}>
                {t("qr_scanner.enter_manually_button") || "Manual"}
              </Text>
            </TouchableOpacity>
          </View>

          {mode === "camera" && (
            <View style={styles.cameraSection}>
              {!permission?.granted ? (
                <View style={styles.permissionBox}>
                  <Ionicons name="camera-outline" size={40} color={theme.primary} />
                  <Text style={styles.hint}>{t("qr_scanner.camera_failed") || "Camera access is required"}</Text>
                  <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
                    <Text style={styles.primaryBtnText}>Allow Camera</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.cameraBox}>
                  <CameraView
                    style={StyleSheet.absoluteFill}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                    onBarcodeScanned={handleBarcodeScanned}
                  />
                </View>
              )}
              <Text style={styles.hint}>
                {t("qr_scanner.point_camera") || "Point camera at customer's QR code"}
              </Text>
            </View>
          )}

          {mode === "manual" && (
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
              <Text style={styles.label}>{t("qr_scanner.enter_manually") || "Enter QR code manually"}</Text>
              <TextInput
                style={styles.input}
                value={qrCode}
                onChangeText={setQrCode}
                placeholder={t("qr_scanner.paste_placeholder") || "Paste or type QR code"}
                placeholderTextColor={theme.muted}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              <View style={styles.footer}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={handleClose}>
                  <Text style={styles.secondaryBtnText}>{t("common.cancel") || "Cancel"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, { flex: 1 }, !qrCode.trim() && styles.disabled]}
                  onPress={handleManualSubmit}
                  disabled={!qrCode.trim()}
                >
                  <Text style={styles.primaryBtnText}>{t("qr_scanner.validate_code") || "Validate"}</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 16 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 18, fontWeight: "700", color: theme.foreground },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.primaryBg, alignItems: "center", justifyContent: "center" },
  modeToggle: { flexDirection: "row", gap: 8, marginBottom: 16 },
  modeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: theme.primaryBg },
  modeBtnActive: { backgroundColor: theme.primary },
  modeBtnText: { fontSize: 13, fontWeight: "600", color: theme.muted },
  modeBtnTextActive: { color: "#fff" },
  cameraSection: { gap: 10 },
  cameraBox: { height: 240, borderRadius: 12, overflow: "hidden", backgroundColor: "#000" },
  permissionBox: { alignItems: "center", padding: 24, gap: 12 },
  hint: { fontSize: 13, color: theme.muted, textAlign: "center" },
  label: { fontSize: 13, fontWeight: "600", color: theme.foreground, marginBottom: 8 },
  input: {
    backgroundColor: theme.primaryBg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginBottom: 16,
  },
  footer: { flexDirection: "row", gap: 10 },
  primaryBtn: { backgroundColor: theme.primary, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  secondaryBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: theme.primaryBg, borderWidth: 1, borderColor: theme.border },
  secondaryBtnText: { fontWeight: "600", color: theme.foreground },
  disabled: { opacity: 0.5 },
});
