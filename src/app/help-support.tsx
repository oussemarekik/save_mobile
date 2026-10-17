import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking } from "react-native";
import { useRouter } from "expo-router";
import { useLanguage } from "@/context/LanguageContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { theme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";

export default function HelpSupport() {
  const router = useRouter();
  const { t } = useLanguage();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const items = [
    { icon: "chatbubble-outline" as const, title: t("help.contactUs"), desc: t("help.contactUsDesc"), onPress: () => router.push("/contact" as any) },
    { icon: "document-text-outline" as const, title: t("help.termsOfUse"), desc: t("help.termsOfUseDesc"), onPress: () => router.push("/legal/terms" as any) },
    { icon: "shield-checkmark-outline" as const, title: t("help.privacyPolicy"), desc: t("help.privacyPolicyDesc"), onPress: () => router.push("/legal/privacy" as any) },
    { icon: "mail-outline" as const, title: t("help.emailSupport"), desc: t("help.emailSupportDesc"), onPress: () => Linking.openURL("mailto:savetheplatetunisia@gmail.com") },
  ];

  const faqs = [
    { q: t("help.faq1Question") || "How do I place an order?", a: t("help.faq1Answer") },
    { q: t("help.faq2Question") || "When can I pick up my order?", a: t("help.faq2Answer") },
    { q: t("help.faq3Question") || "What payment methods are accepted?", a: t("help.faq3Answer") },
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

        <View style={styles.faqCard}>
          <Text style={styles.faqTitle}>{t("help.faq") || "Frequently Asked Questions"}</Text>
          {faqs.map((faq, index) => {
            const open = openFaq === index;
            return (
              <View key={faq.q} style={styles.faqItem}>
                <TouchableOpacity
                  style={styles.faqQuestion}
                  onPress={() => setOpenFaq(open ? null : index)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.faqQuestionText}>{faq.q}</Text>
                  <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={theme.muted} />
                </TouchableOpacity>
                {open && <Text style={styles.faqAnswer}>{faq.a}</Text>}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.backgroundGradient },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  infoCard: { flexDirection: "row", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border },
  infoTitle: { fontWeight: "700", fontSize: 16, color: theme.foreground },
  infoDesc: { fontSize: 13, color: theme.muted, marginTop: 2 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border },
  itemIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.primaryBg, alignItems: "center", justifyContent: "center" },
  itemTitle: { fontWeight: "700", fontSize: 15, color: theme.foreground },
  itemDesc: { fontSize: 12, color: theme.muted, marginTop: 2 },
  faqCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border, marginTop: 4 },
  faqTitle: { fontWeight: "700", fontSize: 16, color: theme.foreground, marginBottom: 8 },
  faqItem: { borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingVertical: 12 },
  faqQuestion: { flexDirection: "row", alignItems: "center", gap: 8 },
  faqQuestionText: { flex: 1, fontWeight: "600", fontSize: 14, color: theme.foreground },
  faqAnswer: { marginTop: 8, fontSize: 13, color: theme.muted, lineHeight: 19 },
});
