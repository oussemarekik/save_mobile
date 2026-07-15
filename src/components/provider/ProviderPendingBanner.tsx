import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "@/context/LanguageContext";

export function ProviderPendingBanner() {
  const { t } = useLanguage();

  return (
    <View style={styles.banner}>
      <Ionicons name="alert-circle-outline" size={20} color="#b45309" />
      <View style={styles.content}>
        <Text style={styles.title}>
          {t("provider.home.pending_title") || "Account Under Review"}
        </Text>
        <Text style={styles.message}>
          {t("provider.home.pending_message") ||
            "Your provider account is currently under review."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  content: { flex: 1 },
  title: { fontSize: 14, fontWeight: "700", color: "#92400e", marginBottom: 2 },
  message: { fontSize: 13, color: "#b45309", lineHeight: 18 },
});
