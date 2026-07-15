import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useLanguage } from "@/context/LanguageContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { theme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";

export default function PaymentMethods() {
  const router = useRouter();
  const { t } = useLanguage();

  const methods = [
    {
      id: "cash",
      name: t("payment.cash") || "Cash",
      desc: t("payment.cashDesc") || "Pay with cash when you pick up your order",
      icon: "cash-outline" as const,
      available: true,
      color: theme.primaryBg,
      iconColor: theme.primary,
    },
    {
      id: "card",
      name: t("payment.creditCard") || "Credit Card",
      desc: t("payment.creditCardDesc") || "Pay securely with your credit or debit card",
      icon: "card-outline" as const,
      available: false,
      color: theme.blueBg,
      iconColor: theme.blue,
    },
  ];

  return (
    <View style={styles.container}>
      <ScreenHeader title={t("payment.title") || "Payment Methods"} onBack={() => router.push("/(client)/profile")} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.info}>{t("payment.info") || "Choose your preferred payment method."}</Text>
        {methods.map((m) => (
          <View key={m.id} style={[styles.card, !m.available && styles.cardDisabled]}>
            <View style={[styles.icon, { backgroundColor: m.color }]}>
              <Ionicons name={m.icon} size={24} color={m.iconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text style={styles.name}>{m.name}</Text>
                <View style={[styles.badge, m.available ? styles.badgeGreen : styles.badgeOrange]}>
                  <Text style={[styles.badgeText, m.available ? styles.badgeTextGreen : styles.badgeTextOrange]}>
                    {m.available ? t("payment.available") || "Available" : t("payment.comingSoon") || "Coming Soon"}
                  </Text>
                </View>
              </View>
              <Text style={styles.desc}>{m.desc}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.backgroundGradient },
  content: { padding: 16, gap: 12 },
  info: { fontSize: 14, color: theme.muted, marginBottom: 8 },
  card: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardDisabled: { opacity: 0.75 },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  name: { fontWeight: "700", fontSize: 16, color: theme.foreground },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeGreen: { backgroundColor: theme.primaryBg },
  badgeOrange: { backgroundColor: theme.amberBg },
  badgeText: { fontSize: 11, fontWeight: "600" },
  badgeTextGreen: { color: theme.primary },
  badgeTextOrange: { color: theme.amber },
  desc: { fontSize: 13, color: theme.muted, marginTop: 4 },
});
