import React from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useLanguage } from "@/context/LanguageContext";
import { theme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";

export function OfferTypeModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="cube-outline" size={32} color={theme.primary} />
          </View>
          <Text style={styles.title}>{t("offer_type_modal.title") || "Create New Offer"}</Text>
          <Text style={styles.description}>
            {t("offer_type_modal.description") || "Choose how you want to create your offer"}
          </Text>

          <TouchableOpacity
            style={[styles.option, styles.rapidOption]}
            onPress={() => {
              onClose();
              router.push("/(provider)/rapid-offer" as any);
            }}
          >
            <View style={[styles.optionIcon, { backgroundColor: "#dcfce7" }]}>
              <Ionicons name="flash-outline" size={24} color="#15803d" />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>
                {t("offer_type_modal.rapid_title") || "⚡ Rapid Offer"}
              </Text>
              <Text style={styles.optionDesc}>
                {t("offer_type_modal.rapid_description") || "Quick setup in 30 seconds."}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, styles.normalOption]}
            onPress={() => {
              onClose();
              router.push("/(provider)/add-offer" as any);
            }}
          >
            <View style={[styles.optionIcon, { backgroundColor: "#dbeafe" }]}>
              <Ionicons name="create-outline" size={24} color="#1d4ed8" />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>
                {t("offer_type_modal.normal_title") || "📝 Detailed Offer"}
              </Text>
              <Text style={styles.optionDesc}>
                {t("offer_type_modal.normal_description") || "Full details with images and categories."}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, styles.magicOption]}
            onPress={() => {
              onClose();
              router.push("/(provider)/create-magic-box" as any);
            }}
          >
            <View style={[styles.optionIcon, { backgroundColor: "#fce7f3" }]}>
              <Ionicons name="gift-outline" size={24} color="#be185d" />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>
                {t("create_magic_box.title") || "🎁 Rescue Pack"}
              </Text>
              <Text style={styles.optionDesc}>
                {t("create_magic_box.subtitle") || "Quick setup with preset sizes and prices."}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>{t("common.cancel") || "Cancel"}</Text>
          </TouchableOpacity>
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
    padding: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.primaryBg,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: "800", textAlign: "center", color: theme.foreground },
  description: { fontSize: 14, color: theme.muted, textAlign: "center", marginTop: 8, marginBottom: 20 },
  option: {
    flexDirection: "row",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    marginBottom: 12,
  },
  rapidOption: { borderColor: "#bbf7d0", backgroundColor: "#f0fdf4" },
  normalOption: { borderColor: "#bfdbfe", backgroundColor: "#eff6ff" },
  magicOption: { borderColor: "#fbcfe8", backgroundColor: "#fdf2f8" },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: { flex: 1 },
  optionTitle: { fontWeight: "700", fontSize: 15, color: theme.foreground },
  optionDesc: { fontSize: 13, color: theme.muted, marginTop: 4 },
  cancelBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
  },
  cancelText: { fontWeight: "600", color: theme.foreground },
});
