import React from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useLanguage } from "@/context/LanguageContext";
import { useProducts } from "@/hooks/use-shop";
import { ScreenHeader } from "@/components/ScreenHeader";
import { theme } from "@/lib/theme";

export default function MapScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const { data: products, isLoading } = useProducts();

  const withLocation = products?.filter((p: any) => p.store?.latitude && p.store?.longitude) || [];

  return (
    <View style={styles.container}>
      <ScreenHeader title={t("common.show_map") || "Map"} />
      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <Text style={styles.hint}>
            {t("common.map_web_hint") || "Map view is available on the mobile app. Browse nearby offers below:"}
          </Text>
          {withLocation.length === 0 ? (
            <Text style={styles.empty}>{t("common.no_results") || "No offers with location found."}</Text>
          ) : (
            withLocation.map((p: any) => (
              <TouchableOpacity
                key={p.id}
                style={styles.card}
                onPress={() => router.push(`/product/${p.id}` as any)}
              >
                <Text style={styles.cardTitle}>{p.name}</Text>
                <Text style={styles.cardSub}>{p.store?.name}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>{t("common.back") || "Back"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  list: { padding: 16, paddingBottom: 100 },
  hint: { fontSize: 14, color: theme.muted, marginBottom: 16, lineHeight: 20 },
  empty: { fontSize: 15, color: theme.muted, textAlign: "center", marginTop: 24 },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 12,
    backgroundColor: "#fafafa",
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: theme.foreground },
  cardSub: { fontSize: 13, color: theme.muted, marginTop: 4 },
  backBtn: {
    position: "absolute",
    bottom: 32,
    alignSelf: "center",
    backgroundColor: theme.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  backText: { color: "#fff", fontWeight: "700" },
});
