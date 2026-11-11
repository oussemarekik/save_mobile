import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, Image, TouchableOpacity,
} from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useQueries } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/use-auth";
import { useFavorites, useToggleFavorite } from "@/hooks/use-shop";
import { useLanguage } from "@/context/LanguageContext";
import { usersApi, transformOfferToProduct, buildImageUrl } from "@/lib/api-client";
import { BagCard } from "@/components/BagCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { theme } from "@/lib/theme";
import { safeGoBack } from "@/lib/navigation";
import { isOfferExpired } from "@/utils/offerUtils";
import { useScreenBottomPadding } from "@/lib/screen-insets";

const DEFAULT_PROFILE_IMAGE = require("@/assets/images/logoOnly.png");

function displayAddress(location?: string | null): string {
  const value = location?.trim() || "";
  return /^(https?:\/\/|www\.)/i.test(value) ? "" : value;
}

function Avatar({ uri }: { uri: string | null }) {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      source={uri && !failed ? { uri } : DEFAULT_PROFILE_IMAGE}
      style={styles.avatar}
      onError={() => setFailed(true)}
    />
  );
}

export default function FavoritesScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const bottomPad = useScreenBottomPadding();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: favoriteIds, isLoading: loadingFavorites } = useFavorites();
  const { mutate: toggleFavorite } = useToggleFavorite();

  const profiles = useQueries({
    queries: favoriteIds.map((id) => ({
      queryKey: ["business-profile", id],
      queryFn: () => usersApi.getProfile(id),
      retry: 1,
    })),
  });

  if (!authLoading && !isAuthenticated) {
    return <Redirect href="/(auth)/signin" />;
  }

  const title = t("favorites.title") || "Mes favoris";
  const loading = authLoading || loadingFavorites || profiles.some((query) => query.isLoading);

  const businesses = profiles
    .map((query) => query.data)
    .filter((profile: any) => profile?.user)
    .map((profile: any) => {
      const user = profile.user;
      const avatarUri = buildImageUrl(user.profileImage);
      const address = displayAddress(user.location);
      const store = {
        id: user.id,
        name: user.username,
        description: address,
        address,
        imageUrl: avatarUri || "",
        logoUrl: avatarUri || undefined,
        mapsLink: user.mapsLink,
        latitude: user.latitude,
        longitude: user.longitude,
        category: "",
        rating: null,
      };
      const offers = (profile.offers || [])
        .filter((offer: any) => (offer.quantity ?? 0) > 0 && !isOfferExpired(offer.expirationDate))
        .map(transformOfferToProduct);
      return { id: user.id as number, name: user.username as string, avatarUri, address, store, offers };
    });

  const offerCountLabel = (count: number) => {
    if (count === 0) return t("business.no_offers") || "Aucune offre disponible";
    return count === 1
      ? t("client.home.offer_one") || "1 offre"
      : t("client.home.offer_many", { count }) || `${count} offres`;
  };

  const withOffers = businesses.filter((business) => business.offers.length > 0);

  return (
    <View style={styles.container}>
      <ScreenHeader title={title} onBack={() => safeGoBack(router, "/(client)/Home")} />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primaryDark} size="large" />
        </View>
      ) : businesses.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIcon}>
            <Ionicons name="heart-outline" size={32} color={theme.primaryDark} />
          </View>
          <Text style={styles.emptyTitle}>{t("favorites.empty_title") || "Aucun favori pour le moment"}</Text>
          <Text style={styles.emptyHint}>
            {t("favorites.empty_hint") || "Appuyez sur le cœur d'un commerce pour le retrouver ici."}
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => safeGoBack(router, "/(client)/Home")}>
            <Text style={styles.emptyButtonText}>{t("favorites.discover") || "Découvrir les commerces"}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.list}>
            {businesses.map((business) => (
              <TouchableOpacity
                key={business.id}
                style={styles.row}
                onPress={() => router.push(`/business/${business.id}` as any)}
                activeOpacity={0.85}
              >
                <Avatar uri={business.avatarUri} />
                <View style={styles.rowCopy}>
                  <Text style={styles.rowName} numberOfLines={1}>{business.name}</Text>
                  {business.address ? (
                    <Text style={styles.rowMeta} numberOfLines={1}>{business.address}</Text>
                  ) : null}
                  <Text style={[styles.rowMeta, business.offers.length > 0 && styles.rowMetaActive]}>
                    {offerCountLabel(business.offers.length)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.heartButton}
                  onPress={() => toggleFavorite(business.id)}
                  hitSlop={8}
                  accessibilityLabel={t("favorites.remove") || "Retirer des favoris"}
                >
                  <Ionicons name="heart" size={20} color="#ef4444" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>

          {withOffers.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>{t("favorites.offers_title") || "Offres de vos favoris"}</Text>
              <View style={styles.list}>
                {withOffers.flatMap((business) =>
                  business.offers.map((product: any) => (
                    <BagCard key={product.id} product={product} store={business.store} />
                  ))
                )}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.backgroundGradient },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  list: { gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.primaryBg },
  rowCopy: { flex: 1, gap: 2 },
  rowName: { fontSize: 15, fontWeight: "700", color: theme.foreground },
  rowMeta: { fontSize: 12, color: theme.muted },
  rowMetaActive: { color: theme.primaryDark, fontWeight: "700" },
  heartButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.destructiveBg, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: theme.foreground, marginTop: 24, marginBottom: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.primaryBg, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: theme.foreground, textAlign: "center" },
  emptyHint: { fontSize: 14, color: theme.muted, textAlign: "center", lineHeight: 20 },
  emptyButton: { marginTop: 12, backgroundColor: theme.primaryDark, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20 },
  emptyButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
