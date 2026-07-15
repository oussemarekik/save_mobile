import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useLanguage } from "@/context/LanguageContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { theme } from "@/lib/theme";

export default function ImpactScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const sections = [
    { title: t("impact.problem_title"), body: t("impact.problem_intro") },
    { title: t("impact.meals_saved_title"), body: t("impact.meals_saved_description") },
    { title: t("impact.co2_title"), body: t("impact.co2_description") },
    { title: t("impact.water_title"), body: t("impact.water_description") },
    { title: t("impact.trees_title"), body: t("impact.trees_description") },
  ];

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("impact.title")}
        subtitle={t("impact.description")}
        onBack={() => router.push("/(client)/profile")}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {sections.map((s, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.cardTitle}>{s.title}</Text>
            <Text style={styles.cardBody}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.backgroundGradient },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border },
  cardTitle: { fontSize: 16, fontWeight: "700", color: theme.foreground, marginBottom: 8 },
  cardBody: { fontSize: 14, color: theme.muted, lineHeight: 20 },
});
