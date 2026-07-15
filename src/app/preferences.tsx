import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useLanguage } from "@/context/LanguageContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { theme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";

const LANGUAGES = [
  { code: "en" as const, name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "fr" as const, name: "French", nativeName: "Français", flag: "🇫🇷" },
];

export default function Preferences() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();

  return (
    <View style={styles.container}>
      <ScreenHeader title={t("preferences.title") || "Preferences"} onBack={() => router.push("/(client)/profile")} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.globeIcon}>
              <Ionicons name="globe-outline" size={20} color={theme.primary} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>{t("preferences.language") || "Language"}</Text>
              <Text style={styles.sectionDesc}>{t("preferences.chooseLanguage") || "Choose your preferred language"}</Text>
            </View>
          </View>
          {LANGUAGES.map((lang) => {
            const selected = language === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.langRow, selected && styles.langRowSelected]}
                onPress={() => setLanguage(lang.code)}
              >
                <Text style={styles.flag}>{lang.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.langName}>{lang.name}</Text>
                  <Text style={styles.langNative}>{lang.nativeName}</Text>
                </View>
                {selected && (
                  <View style={styles.check}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.backgroundGradient },
  content: { padding: 16 },
  section: { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border },
  sectionHeader: { flexDirection: "row", gap: 12, marginBottom: 16 },
  globeIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.primaryBg, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontWeight: "700", fontSize: 16, color: theme.foreground },
  sectionDesc: { fontSize: 13, color: theme.muted },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 8,
  },
  langRowSelected: { borderColor: theme.primary, backgroundColor: theme.primaryBg },
  flag: { fontSize: 24 },
  langName: { fontWeight: "600", color: theme.foreground },
  langNative: { fontSize: 13, color: theme.muted },
  check: { width: 24, height: 24, borderRadius: 12, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" },
});
