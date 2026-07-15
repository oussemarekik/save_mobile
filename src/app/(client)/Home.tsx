import React, { useEffect, useState, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Image,
} from "react-native";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useStores, useProducts, useOrders } from "@/hooks/use-shop";
import { BagCard } from "@/components/BagCard";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/context/LanguageContext";
import { usersApi } from "@/lib/api-client";
import { Ionicons } from "@expo/vector-icons";
import { APP_NAME } from "@/lib/constants";
import { theme } from "@/lib/theme";
import { writeAuthIntentRole } from "@/lib/authIntent";
import { isOfferExpired } from "@/utils/offerUtils";

const FOOD_TYPES = ["meal", "snack", "beverage", "other"] as const;

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const { data: products, isLoading: loadingProducts } = useProducts();
  const { data: orders } = useOrders();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState("Tunisia");

  const pendingCount = orders?.filter((o: any) => o.status === "pending" || o.status === "confirmed").length || 0;

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      const cached = await AsyncStorage.getItem("userLocation");
      if (cached) {
        try {
          const loc = JSON.parse(cached);
          if (loc.city && loc.city !== "Unknown") {
            setLocationLabel(loc.state ? `${loc.city}, ${loc.state}` : loc.city);
            return;
          }
        } catch {}
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({});
      try {
        const geo = await usersApi.reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        const city = geo.city || "Unknown";
        const state = geo.state || "";
        setLocationLabel(state ? `${city}, ${state}` : city);
        await AsyncStorage.setItem("userLocation", JSON.stringify({ city, state, timestamp: Date.now() }));
      } catch {
        setLocationLabel(user?.location || "Tunisia");
      }
    })();
  }, [isAuthenticated, user?.location]);

  const filteredProducts = useMemo(() => {
    let list = products?.filter((p: any) => p.quantity > 0 && !isOfferExpired(p.expirationDate)) || [];
    if (selectedCategory) list = list.filter((p: any) => p.foodType === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p: any) =>
        p.name?.toLowerCase().includes(q) || p.store?.name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, selectedCategory, searchQuery]);

  const featuredProducts = filteredProducts.slice(0, 5);

  if (!authLoading && !isAuthenticated) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCenter}>
          <View style={styles.leafCircle}>
            <Ionicons name="leaf-outline" size={40} color={theme.primary} />
          </View>
          <Text style={styles.welcomeTitle}>{t("landing.welcome_title") || `Welcome to ${APP_NAME}`}</Text>
          <Text style={styles.welcomeSubtitle}>{t("landing.welcome_subtitle")}</Text>
        </View>
        <View style={styles.ctaGroup}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push("/(auth)/signin")}>
            <Text style={styles.primaryButtonText}>{t("landing.sign_in")}</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push("/(auth)/signup")}>
            <Text style={styles.secondaryButtonText}>{t("landing.get_started")}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.providerCard}>
          <Ionicons name="storefront-outline" size={32} color={theme.primary} />
          <Text style={styles.providerTitle}>{t("landing.for_business")}</Text>
          <Text style={styles.providerDesc}>{t("landing.list_surplus")}</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={async () => {
              await writeAuthIntentRole("PROVIDER");
              router.push("/(auth)/ProviderSignup");
            }}
          >
            <Text style={styles.primaryButtonText}>{t("landing.register_business")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (authLoading || loadingProducts) {
    return <View style={styles.skeletonContainer}><ActivityIndicator color={theme.primary} size="large" /></View>;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.locationRow} onPress={() => router.push("/map" as any)}>
          <Ionicons name="location" size={18} color={theme.primary} />
          <Text style={styles.locationText}>{locationLabel}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.muted} />
        </TouchableOpacity>
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={16} color={theme.muted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t("nav.search_offers_businesses")}
            placeholderTextColor={theme.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => searchQuery.trim() && router.push({ pathname: "/search", params: { query: searchQuery.trim() } } as any)}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.filterBtn} onPress={() => router.push("/map" as any)}>
            <Ionicons name="map-outline" size={16} color={theme.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      {pendingCount > 0 && (
        <TouchableOpacity style={styles.pendingBanner} onPress={() => router.push("/(client)/orders")}>
          <Ionicons name="time-outline" size={20} color={theme.amber} />
          <Text style={styles.pendingText}>
            {t("client.home.pickup_reminder_message", { count: pendingCount, plural: pendingCount > 1 ? "s" : "" }) ||
              `You have ${pendingCount} pending order(s) waiting for pickup.`}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.heroBanner}>
        <Text style={styles.heroBannerTitle}>{APP_NAME}</Text>
        <Text style={styles.heroBannerSubtitle}>{t("landing.welcome_description")}</Text>
        <TouchableOpacity style={styles.heroBannerButton} onPress={() => router.push("/search" as any)}>
          <Text style={styles.heroBannerButtonText}>{t("client.home.browse_offers") || "Browse Offers"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t("client.home.recommended") || "Recommended for you"}</Text>
          <TouchableOpacity onPress={() => router.push("/search" as any)}>
            <Text style={styles.seeAll}>{t("client.home.see_all") || "See all"}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
          {featuredProducts.map((product: any) => (
            <View key={product.id} style={styles.horizontalCard}>
              <BagCard product={product} store={product.store} />
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("client.home.categories") || "Categories"}</Text>
        <View style={styles.categoryGrid}>
          {FOOD_TYPES.map((type) => {
            const selected = selectedCategory === type;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.categoryCard, selected && styles.categoryCardSelected]}
                onPress={() => setSelectedCategory(selected ? null : type)}
              >
          <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>{t(`food_types.${type}`) || type}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={[styles.section, { paddingBottom: 100 }]}>
        <Text style={styles.sectionTitle}>{t("client.home.nearby_offers") || "Nearby offers"}</Text>
        <View style={{ gap: 16 }}>
          {filteredProducts.slice(0, 6).map((product: any) => (
            <BagCard key={product.id} product={product} store={product.store} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.backgroundGradient },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 32, paddingBottom: 80 },
  heroCenter: { alignItems: "center", marginBottom: 32 },
  leafCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.primaryBg, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  welcomeTitle: { fontSize: 28, fontWeight: "800", color: theme.foreground, textAlign: "center", marginBottom: 12 },
  welcomeSubtitle: { fontSize: 16, color: theme.muted, textAlign: "center", lineHeight: 24 },
  ctaGroup: { gap: 12, marginBottom: 32 },
  primaryButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 16 },
  primaryButtonText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  secondaryButton: { paddingVertical: 16, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: theme.border, alignItems: "center" },
  secondaryButtonText: { fontSize: 15, fontWeight: "500", color: theme.foreground },
  providerCard: { backgroundColor: theme.primaryBg, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: theme.primaryBorder, alignItems: "center", gap: 8 },
  providerTitle: { fontSize: 18, fontWeight: "700", color: theme.foreground },
  providerDesc: { fontSize: 13, color: theme.muted, textAlign: "center", marginBottom: 8 },
  skeletonContainer: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.backgroundGradient },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: "#fff" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 12 },
  locationText: { fontWeight: "700", color: theme.foreground, fontSize: 15 },
  searchWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: theme.primaryBg, borderRadius: 12, paddingHorizontal: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: theme.foreground },
  filterBtn: { padding: 6, borderRadius: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: theme.border },
  pendingBanner: { flexDirection: "row", alignItems: "center", gap: 10, margin: 16, marginBottom: 0, padding: 14, backgroundColor: theme.amberBg, borderRadius: 12, borderWidth: 1, borderColor: "#fde68a" },
  pendingText: { flex: 1, fontSize: 13, color: "#92400e", fontWeight: "600" },
  heroBanner: { margin: 16, borderRadius: 24, padding: 24, backgroundColor: theme.primary },
  heroBannerTitle: { fontSize: 22, fontWeight: "800", color: "#fff", marginBottom: 8 },
  heroBannerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.9)", marginBottom: 20 },
  heroBannerButton: { alignSelf: "flex-start", backgroundColor: "#fff", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  heroBannerButtonText: { color: theme.primary, fontWeight: "700", fontSize: 14 },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: theme.foreground },
  seeAll: { fontSize: 14, fontWeight: "600", color: theme.primary },
  horizontalList: { gap: 16, paddingRight: 16 },
  horizontalCard: { width: 280 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  categoryCard: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: theme.border },
  categoryCardSelected: { backgroundColor: theme.primary, borderColor: theme.primary },
  categoryText: { fontSize: 13, fontWeight: "600", color: theme.foreground },
  categoryTextSelected: { color: "#fff" },
});
