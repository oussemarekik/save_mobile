import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "@/context/LanguageContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";

interface ProviderQRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  /** Parent closes the modal on success via `visible={false}`. Return false (or throw) so the scanner can retry. */
  onScan: (token: string) => boolean | void | Promise<boolean | void>;
}

export function ProviderQRScannerModal({ visible, onClose, onScan }: ProviderQRScannerModalProps) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  useEffect(() => {
    if (visible) scannedRef.current = false;
  }, [visible]);

  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  const processScan = async (token: string) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    try {
      const result = await Promise.resolve(onScan(token));
      if (result === false) {
        scannedRef.current = false;
      }
    } catch {
      scannedRef.current = false;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.overlay, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{t("qr_scanner.title") || "Scan QR Code"}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={20} color={theme.foreground} />
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            {t("qr_scanner.point_camera") || "Point the camera at the customer's QR code"}
          </Text>

          {!permission?.granted ? (
            <View style={styles.permissionBox}>
              <Ionicons name="camera-outline" size={40} color={theme.primary} />
              <Text style={styles.permissionText}>
                {t("qr_scanner.camera_failed") || "Camera access is required to scan codes"}
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
                <Text style={styles.primaryBtnText}>
                  {t("qr_scanner.allow_camera") || "Allow camera"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cameraBox}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={({ data }) => processScan(data)}
              />
              <View style={styles.frame} pointerEvents="none" />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.foreground,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    fontSize: 14,
    color: theme.muted,
    lineHeight: 20,
  },
  cameraBox: {
    height: 280,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    width: 180,
    height: 180,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
  },
  permissionBox: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 12,
  },
  permissionText: {
    fontSize: 14,
    color: theme.muted,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  primaryBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 4,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
