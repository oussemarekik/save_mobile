import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking } from "react-native";
import { useRouter } from "expo-router";
import { useLanguage } from "@/context/LanguageContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { theme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";

export default function HelpSupport() {
  const router = useRouter();
  const { t } = useLanguage();

  const items = [
    { icon: "chatbubble-outline" as const, title: t("help.contactUs"), desc: t("help.contactUsDesc"), onPress: () => router.push("/contact" as any) },
    { icon: "document-text-outline" as const, title: t("help.termsOfUse"), desc: t("help.termsOfUseDesc"), onPress: () => router.push("/legal/terms" as any) },
    { icon: "shield-checkmark-outline" as const, title: t("help.privacyPolicy"), desc: t("help.privacyPolicyDesc"), onPress: () => router.push("/legal/privacy" as any) },
    { icon: "mail-outline" as const, title: t("help.emailSupport"), desc: t("help.emailSupportDesc"), onPress: () => Linking.openURL("mailto:savetheplatetunisia@gmail.com") },
  ];

  return (
    <View style={styles.container}>
      <ScreenHeader title={t("profile.helpSupport")} onBack={() => router.push("/(client)/profile")} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="help-circle-outline" size={24} color={theme.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>{t("help.title")}</Text>
            <Text style={styles.infoDesc}>{t("help.subtitle")}</Text>
          </View>
        </View>
        {items.map((item) => (
          <TouchableOpacity key={item.title} style={styles.item} onPress={item.onPress}>
            <View style={styles.itemIcon}>
              <Ionicons name={item.icon} size={22} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDesc}>{item.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.muted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.backgroundGradient },
  content: { padding: 16, gap: 12 },
  infoCard: { flexDirection: "row", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border },
  infoTitle: { fontWeight: "700", fontSize: 16, color: theme.foreground },
  infoDesc: { fontSize: 13, color: theme.muted, marginTop: 2 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border },
  itemIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.primaryBg, alignItems: "center", justifyContent: "center" },
  itemTitle: { fontWeight: "700", fontSize: 15, color: theme.foreground },
  itemDesc: { fontSize: 12, color: theme.muted, marginTop: 2 },
});
