import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  Linking,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useLanguage } from "@/context/LanguageContext";
import { usersApi, transformOfferToProduct, buildImageUrl } from "@/lib/api-client";
import { BagCard } from "@/components/BagCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { theme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";

const DEFAULT_PROFILE_IMAGE = require("@/assets/images/logoOnly.png");

function isMapsOrUrl(value?: string | null): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return (
    /^https?:\/\//i.test(v) ||
    v.startsWith("www.") ||
    v.includes("maps.google") ||
    v.includes("goo.gl/") ||
    v.includes("maps.app.goo.gl") ||
    v.includes("share.google/")
  );
}

function getDisplayAddress(location?: string | null): string | null {
  if (!location?.trim()) return null;
  if (isMapsOrUrl(location)) return null;
  return location.trim();
}

function getMapsHref(location?: string | null, mapsLink?: string | null): string | null {
  if (mapsLink?.trim()) return mapsLink.trim();
  if (location && isMapsOrUrl(location)) return location.trim();
  return null;
}

export default function BusinessProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    if (!id) return;
    setAvatarFailed(false);
    usersApi
      .getProfile(id)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  if (!profile?.user) {
    return (
      <View style={styles.centered}>
        <View style={styles.emptyIcon}>
          <Ionicons name="storefront-outline" size={32} color={theme.primary} />
        </View>
        <Text style={styles.error}>{t("business.not_found") || "Business not found"}</Text>
      </View>
    );
  }

  const business = profile.user;
  const offers = (profile.offers || []).map(transformOfferToProduct);
  const avatarUri = buildImageUrl(business.profileImage);
  const avatarSource =
    avatarUri && !avatarFailed ? { uri: avatarUri } : DEFAULT_PROFILE_IMAGE;
  const displayAddress = getDisplayAddress(business.location);
  const mapsHref = getMapsHref(business.location, business.mapsLink);

  return (
    <View style={styles.container}>
      <ScreenHeader title={business.username} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <Image
            source={avatarSource}
            style={styles.avatar}
            onError={() => setAvatarFailed(true)}
          />

          <Text style={styles.name}>{business.username}</Text>

          {(displayAddress || mapsHref) ? (
            <View style={styles.locationBlock}>
              {displayAddress ? (
                <Text style={styles.location}>{displayAddress}</Text>
              ) : null}
              {mapsHref ? (
                <TouchableOpacity
                  style={styles.mapsButton}
                  onPress={() => Linking.openURL(mapsHref)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="map-outline" size={16} color="#fff" />
                  <Text style={styles.mapsButtonText}>
                    {t("common.location") || "Location"}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>{t("business.offers") || "Offers"}</Text>
        {offers.length === 0 ? (
          <View style={styles.emptyOffers}>
            <Ionicons name="bag-handle-outline" size={28} color={theme.muted} />
            <Text style={styles.empty}>{t("business.no_offers") || "No offers available"}</Text>
          </View>
        ) : (
          offers.map((product: any) => (
            <BagCard key={product.id} product={product} store={product.store} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.backgroundGradient },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.backgroundGradient,
    padding: 24,
  },
  error: { color: theme.muted, marginTop: 12, textAlign: "center" },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: theme.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  profileCard: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.primaryBorder,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 24,
    marginBottom: 14,
    backgroundColor: theme.primaryBg,
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.foreground,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  locationBlock: {
    marginTop: 10,
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    width: "100%",
  },
  location: { fontSize: 14, color: theme.muted, textAlign: "center" },
  mapsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  mapsButtonText: { fontSize: 14, color: "#fff", fontWeight: "700" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: theme.foreground, marginTop: 8 },
  emptyOffers: { alignItems: "center", gap: 8, paddingVertical: 28 },
  empty: { color: theme.muted, textAlign: "center" },
});
