import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useLanguage } from "@/context/LanguageContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { theme } from "@/lib/theme";
import { useOrders } from "@/hooks/use-shop";
import { useAuth } from "@/hooks/use-auth";
import { co2SavedFromMeals, waterSavedFromMeals } from "@/lib/constants";
import { Ionicons } from "@expo/vector-icons";

export default function ImpactScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { data: orders } = useOrders();

  const mealsSaved = isAuthenticated
    ? (orders?.filter((o: any) => o.status === "confirmed" && o.collectedAt) || []).length
    : 0;
  const co2Saved = co2SavedFromMeals(mealsSaved);
  const waterSaved = waterSavedFromMeals(mealsSaved);
  const treesEquiv = co2Saved / 21;

  const sections = [
    {
      title: t("impact.problem_title"),
      body: t("impact.problem_intro"),
      bullets: [
        t("impact.problem_1"),
        t("impact.problem_2"),
        t("impact.problem_3"),
        t("impact.problem_4"),
      ],
      footer: t("impact.problem_conclusion"),
    },
    {
      title: t("impact.meals_saved_title"),
      body: t("impact.meals_saved_description"),
      bullets: [t("impact.meals_calculation")],
    },
    {
      title: t("impact.co2_title"),
      body: t("impact.co2_description"),
      bullets: [t("impact.co2_calculation"), t("impact.co2_explanation"), t("impact.co2_equivalent")],
    },
    {
      title: t("impact.water_title"),
      body: t("impact.water_description"),
      bullets: [t("impact.water_calculation"), t("impact.water_explanation")],
    },
    {
      title: t("impact.ripple_effect"),
      body: t("impact.ripple_description"),
      bullets: [t("impact.ripple_100"), t("impact.ripple_1000"), t("impact.ripple_10000")],
    },
  ];

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("impact.title")}
        subtitle={t("impact.description")}
        onBack={() => router.push("/(client)/profile")}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {isAuthenticated && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>{t("impact.understanding") || "Your impact"}</Text>
            <View style={styles.statsRow}>
              <Stat value={String(mealsSaved)} label={t("impact.meals_saved_title") || "Meals"} icon="leaf-outline" />
              <Stat value={co2Saved.toFixed(1)} label="kg CO₂e" icon="cloud-outline" />
              <Stat
                value={waterSaved >= 1000 ? `${(waterSaved / 1000).toFixed(1)}k` : String(waterSaved)}
                label={t("impact.water_title") || "Water (L)"}
                icon="water-outline"
              />
            </View>
            <Text style={styles.treesNote}>
              ≈ {treesEquiv.toFixed(1)} {t("impact.trees_title") || "trees / year equivalent"}
            </Text>
          </View>
        )}

        {sections.map((s, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.cardTitle}>{s.title}</Text>
            <Text style={styles.cardBody}>{s.body}</Text>
            {s.bullets?.map((bullet, bi) =>
              bullet ? (
                <Text key={bi} style={styles.bullet}>
                  • {bullet}
                </Text>
              ) : null
            )}
            {s.footer ? <Text style={[styles.cardBody, { marginTop: 8 }]}>{s.footer}</Text> : null}
          </View>
        ))}

        <TouchableOpacity
          style={styles.cta}
          onPress={() => router.push("/(client)/Browse")}
          activeOpacity={0.85}
        >
          <Ionicons name="bag-outline" size={18} color="#fff" />
          <Text style={styles.ctaText}>{t("impact.browse_offers") || "Browse Offers"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Stat({ value, label, icon }: { value: string; label: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={theme.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.backgroundGradient },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  statsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.primaryBorder,
  },
  statsTitle: { fontSize: 16, fontWeight: "700", color: theme.foreground, marginBottom: 12 },
  statsRow: { flexDirection: "row", gap: 8 },
  stat: {
    flex: 1,
    alignItems: "center",
    backgroundColor: theme.primaryBg,
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  statValue: { fontSize: 18, fontWeight: "800", color: theme.primary },
  statLabel: { fontSize: 10, color: theme.muted, textAlign: "center" },
  treesNote: { marginTop: 12, fontSize: 13, color: theme.muted, textAlign: "center" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border },
  cardTitle: { fontSize: 16, fontWeight: "700", color: theme.foreground, marginBottom: 8 },
  cardBody: { fontSize: 14, color: theme.muted, lineHeight: 20 },
  bullet: { fontSize: 13, color: theme.muted, lineHeight: 19, marginTop: 6 },
  cta: {
    marginTop: 8,
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
