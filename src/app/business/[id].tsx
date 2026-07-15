import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Image, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useLanguage } from "@/context/LanguageContext";
import { usersApi, transformOfferToProduct } from "@/lib/api-client";
import { BagCard } from "@/components/BagCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { theme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";

export default function BusinessProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLanguage();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    usersApi.getProfile(id)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={theme.primary} size="large" /></View>;
  }

  if (!profile?.user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{t("business.not_found") || "Business not found"}</Text>
      </View>
    );
  }

  const business = profile.user;
  const offers = (profile.offers || []).map(transformOfferToProduct);

  return (
    <View style={styles.container}>
      <ScreenHeader title={business.username} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          {business.profileImage ? (
            <Image source={{ uri: business.profileImage }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="storefront-outline" size={32} color={theme.primary} />
            </View>
          )}
          <Text style={styles.name}>{business.username}</Text>
          {business.location ? <Text style={styles.location}>{business.location}</Text> : null}
          {business.mapsLink ? (
            <Text style={styles.mapsLink} onPress={() => Linking.openURL(business.mapsLink)}>
              {t("common.view_on_maps")}
            </Text>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>{t("business.offers") || "Offers"}</Text>
        {offers.length === 0 ? (
          <Text style={styles.empty}>{t("business.no_offers") || "No offers available"}</Text>
        ) : (
          offers.map((product: any) => <BagCard key={product.id} product={product} store={product.store} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.backgroundGradient },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { color: theme.muted },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  profileCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, alignItems: "center", borderWidth: 1, borderColor: theme.border },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  avatarPlaceholder: { backgroundColor: theme.primaryBg, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 22, fontWeight: "800", color: theme.foreground },
  location: { fontSize: 14, color: theme.muted, marginTop: 4 },
  mapsLink: { fontSize: 14, color: theme.primary, marginTop: 8, fontWeight: "600" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: theme.foreground, marginTop: 8 },
  empty: { color: theme.muted, textAlign: "center", marginTop: 20 },
});
