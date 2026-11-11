import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/hooks/use-auth";
import { ScreenHeader } from "@/components/ScreenHeader";
import { theme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";

export default function PaymentMethods() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();
  const isProvider =
    user?.role === "PROVIDER" || user?.role === "PENDING_PROVIDER";
  const profileHref = isProvider ? "/(provider)/profile" : "/(client)/profile";

  return (
    <View style={styles.container}>
      <ScreenHeader title={t("payment.title") || "Payment Methods"} onBack={() => router.push(profileHref as any)} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.info}>
          {t("payment.info") ||
            "Orders are paid in cash when you pick up. Card payments are not available yet."}
        </Text>
        <View style={styles.card}>
          <View style={[styles.icon, { backgroundColor: theme.primaryBg }]}>
            <Ionicons name="cash-outline" size={24} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.name}>{t("payment.cash") || "Cash on pickup"}</Text>
              <View style={[styles.badge, styles.badgeGreen]}>
                <Text style={[styles.badgeText, styles.badgeTextGreen]}>
                  {t("payment.available") || "Available"}
                </Text>
              </View>
            </View>
            <Text style={styles.desc}>
              {t("payment.cashDesc") || "Pay with cash when you pick up your order. No in-app payment is required."}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.backgroundGradient },
  content: { padding: 16, gap: 12 },
  info: { fontSize: 14, color: theme.muted, marginBottom: 8, lineHeight: 20 },
  card: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  name: { fontWeight: "700", fontSize: 16, color: theme.foreground },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeGreen: { backgroundColor: theme.primaryBg },
  badgeText: { fontSize: 11, fontWeight: "600" },
  badgeTextGreen: { color: theme.primary },
  desc: { fontSize: 13, color: theme.muted, marginTop: 4, lineHeight: 18 },
});
