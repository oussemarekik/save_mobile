import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabScreenContentInsets } from "@/lib/screen-insets";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useProducts, useOrders, useFavorites } from "@/hooks/use-shop";
import { BagCard } from "@/components/BagCard";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/context/LanguageContext";
import { notificationsApi, usersApi } from "@/lib/api-client";
import { APP_NAME, co2SavedFromMeals } from "@/lib/constants";
import { theme } from "@/lib/theme";
import { writeAuthIntentRole } from "@/lib/authIntent";
import { isOfferExpired } from "@/utils/offerUtils";
import { calculateDistance, formatDistance } from "@/utils/distanceUtils";
import { formatPrice } from "@/utils/formatPrice";

const DISTANCES = [1, 3, 5, 10] as const;
const ENDING_SOON_HOURS = 12;

const CATEGORIES: {
  type: "meal" | "snack" | "beverage" | "other";
  icon: React.ComponentProps<typeof Ionicons>["name"];
  tint: string;
  iconColor: string;
}[] = [
  { type: "meal", icon: "restaurant-outline", tint: "#FFF1E8", iconColor: "#C46B3A" },
  { type: "snack", icon: "cafe-outline", tint: "#FFF8D6", iconColor: "#8A6A12" },
  { type: "beverage", icon: "wine-outline", tint: theme.infoBg, iconColor: "#3D87A8" },
  { type: "other", icon: "cube-outline", tint: theme.primaryBg, iconColor: theme.primaryDark },
];

function displayName(username?: string | null): string {
  if (!username) return "";
  const raw = username.split(/[\s._@-]/).find(Boolean) || username;
  return raw.charAt(0).toLocaleUpperCase() + raw.slice(1);
}

function distanceOf(product: any, coords: { lat: number; lng: number } | null): number {
  if (!coords) return Infinity;
  const lat = Number(product.store?.latitude);
  const lng = Number(product.store?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return Infinity;
  return calculateDistance(coords.lat, coords.lng, lat, lng);
}

function discountOf(product: any): number {
  const original = Number(product.originalPrice) || 0;
  const price = Number(product.price) || 0;
  if (original <= 0 || original <= price) return 0;
  return (original - price) / original;
}

function BusinessAvatar({ uri }: { uri?: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) {
    return (
      <View style={styles.businessAvatarFallback}>
        <Ionicons name="storefront" size={22} color={theme.primaryDark} />
      </View>
    );
  }
  return <Image source={{ uri }} style={styles.businessAvatar} onError={() => setFailed(true)} />;
}

function hoursLeft(product: any): number {
  if (!product.expirationDate) return Infinity;
  const time = new Date(product.expirationDate).getTime();
  if (!Number.isFinite(time)) return Infinity;
  return (time - Date.now()) / 36e5;
}

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const contentInsets = useTabScreenContentInsets();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const { data: products, isLoading: loadingProducts, isError: productsError, refetch } = useProducts();
  const { data: favorites } = useFavorites();
  const { data: orders, refetch: refetchOrders } = useOrders();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [distanceFilter, setDistanceFilter] = useState<number | null>(null);
  const [showAllNearby, setShowAllNearby] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [locationLabel, setLocationLabel] = useState("Tunisia");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const isSearching = searchQuery.trim().length > 0;

  const { data: unreadData } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => notificationsApi.unreadCount(),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
  const unreadCount = unreadData?.count ?? 0;

  const pendingCount =
    orders?.filter(
      (o: any) => o.status === "pending" || (o.status === "confirmed" && !o.collectedAt)
    ).length || 0;

  const impact = useMemo(() => {
    const collected = orders?.filter((o: any) => o.status === "confirmed" && o.collectedAt) || [];
    const meals = collected.length;
    const money = collected.reduce((sum: number, order: any) => {
      const original = Number(order.product?.originalPrice) || 0;
      const qty = Number(order.quantity) || 1;
      const total =
        order.totalPrice != null
          ? Number(order.totalPrice)
          : (Number(order.product?.price) || 0) * qty;
      const originalTotal = original * qty;
      if (original > 0 && originalTotal > total) return sum + (originalTotal - total);
      return sum;
    }, 0);
    return { meals, co2: co2SavedFromMeals(meals), money };
  }, [orders]);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      const cached = await AsyncStorage.getItem("userLocation");
      if (cached) {
        try {
          const loc = JSON.parse(cached);
          if (loc.city && loc.city !== "Unknown") {
            setLocationLabel(loc.state ? `${loc.city}, ${loc.state}` : loc.city);
          }
          if (loc.lat != null && loc.lng != null) {
            setUserCoords({ lat: loc.lat, lng: loc.lng });
          }
        } catch {}
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({});
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setUserCoords({ lat, lng });
      try {
        const geo = await usersApi.reverseGeocode(lat, lng);
        const city = geo.city || "Unknown";
        const state = geo.state || "";
        setLocationLabel(state ? `${city}, ${state}` : city);
        await AsyncStorage.setItem(
          "userLocation",
          JSON.stringify({ city, state, lat, lng, timestamp: Date.now() })
        );
      } catch {
        setLocationLabel(user?.location || "Tunisia");
      }
    })();
  }, [isAuthenticated, user?.location]);

  const available = useMemo(() => {
    return (products || [])
      .filter((p: any) => p.quantity > 0 && !isOfferExpired(p.expirationDate))
      .map((p: any) => ({ ...p, _distance: distanceOf(p, userCoords) }));
  }, [products, userCoords]);

  const withinDistance = useMemo(() => {
    if (distanceFilter == null) return available;
    return available.filter((p: any) => p._distance <= distanceFilter);
  }, [available, distanceFilter]);

  const searched = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return withinDistance;
    return withinDistance.filter((p: any) =>
      p.name?.toLowerCase().includes(q) || p.store?.name?.toLowerCase().includes(q)
    );
  }, [withinDistance, searchQuery]);

  const businesses = useMemo(() => {
    const source = isSearching ? searched : withinDistance;
    const favoriteIds = new Set(favorites || []);
    const map = new Map<number, { id: number; name: string; imageUrl?: string; address: string; distance: number; offerCount: number; favorite: boolean }>();
    for (const product of source) {
      const id = Number(product.store?.id || product.storeId);
      if (!Number.isFinite(id)) continue;
      const current = map.get(id);
      if (current) {
        current.offerCount += 1;
        current.distance = Math.min(current.distance, product._distance);
        continue;
      }
      const address = String(product.store?.address || "");
      map.set(id, {
        id,
        name: product.store?.name || "",
        imageUrl: product.store?.logoUrl || product.store?.imageUrl,
        address: /^https?:/i.test(address) ? "" : address,
        distance: product._distance,
        offerCount: 1,
        favorite: favoriteIds.has(id),
      });
    }
    return [...map.values()].sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      return a.distance - b.distance;
    });
  }, [isSearching, searched, withinDistance, favorites]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const category of CATEGORIES) {
      counts[category.type] = withinDistance.filter((p: any) => p.foodType === category.type).length;
    }
    return counts;
  }, [withinDistance]);

  const inView = useMemo(() => {
    if (!selectedCategory) return searched;
    return searched.filter((p: any) => p.foodType === selectedCategory);
  }, [searched, selectedCategory]);

  const endingSoon = useMemo(() => {
    return [...inView]
      .filter((p: any) => {
        const hours = hoursLeft(p);
        return hours > 0 && hours <= ENDING_SOON_HOURS;
      })
      .sort((a: any, b: any) => hoursLeft(a) - hoursLeft(b))
      .slice(0, 8);
  }, [inView]);

  const featured = useMemo(() => {
    const soonIds = new Set(endingSoon.map((p: any) => p.id));
    return [...inView]
      .filter((p: any) => !soonIds.has(p.id))
      .sort((a: any, b: any) => discountOf(b) - discountOf(a) || a._distance - b._distance)
      .slice(0, 5);
  }, [inView, endingSoon]);

  const nearby = useMemo(() => {
    const sorted = [...inView].sort((a: any, b: any) => a._distance - b._distance);
    if (isSearching || selectedCategory) return sorted;
    const hidden = new Set([...featured, ...endingSoon].map((p: any) => p.id));
    return sorted.filter((p: any) => !hidden.has(p.id));
  }, [inView, featured, endingSoon, selectedCategory, isSearching]);

  const visibleNearby = showAllNearby || isSearching ? nearby : nearby.slice(0, 6);
  const name = displayName(user?.username);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchOrders()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refetchOrders]);

  const offerCountLabel = (count: number) =>
    count === 1
      ? t("client.home.offer_one") || "1 offre"
      : t("client.home.offer_many", { count }) || `${count} offres`;

  if (!authLoading && !isAuthenticated) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + contentInsets.paddingTop, paddingBottom: contentInsets.paddingBottom },
        ]}
      >
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
    return <View style={styles.skeletonContainer}><ActivityIndicator color={theme.primaryDark} size="large" /></View>;
  }

  if (productsError) {
    return (
      <View style={styles.skeletonContainer}>
        <Ionicons name="alert-circle-outline" size={40} color={theme.destructive} />
        <Text style={styles.stateMessage}>{t("offers.error_fetch") || "Unable to load offers"}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>{t("common.try_again") || "Try Again"}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const listTitle = isSearching
    ? `${t("client.home.search_results") || "Résultats"} (${inView.length})`
    : selectedCategory
      ? t(`offers.food_type_${selectedCategory}`) || selectedCategory
      : t("client.home.nearby_offers") || "Offres à proximité";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.topRow}>
          <View style={styles.greetingBlock}>
            <Text style={styles.greeting} numberOfLines={1}>
              {name
                ? t("client.home.greeting", { name }) || `Bonjour, ${name}`
                : t("nav.home") || "Accueil"}
            </Text>
            <TouchableOpacity style={styles.locationRow} onPress={() => router.push("/map" as any)}>
              <Ionicons name="location" size={14} color={theme.primaryDark} />
              <Text style={styles.locationText} numberOfLines={1}>{locationLabel}</Text>
              <Ionicons name="chevron-down" size={14} color={theme.muted} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.bell}
            onPress={() => router.push("/favorites" as any)}
            accessibilityLabel={t("favorites.title") || "Mes favoris"}
          >
            <Ionicons name="heart-outline" size={22} color={theme.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bell}
            onPress={() => router.push("/notifications" as any)}
            accessibilityLabel={t("notifications.title") || "Notifications"}
          >
            <Ionicons name="notifications-outline" size={22} color={theme.foreground} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : String(unreadCount)}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
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
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.muted} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.filterBtn} onPress={() => router.push("/map" as any)}>
              <Ionicons name="map-outline" size={16} color={theme.foreground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.feed, contentInsets]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primaryDark} colors={[theme.primaryDark]} />
        }
      >
        {pendingCount > 0 && (
          <TouchableOpacity style={styles.pendingBanner} onPress={() => router.push("/(client)/orders")}>
            <View style={styles.pendingIcon}>
              <Ionicons name="time-outline" size={20} color="#92400e" />
            </View>
            <View style={styles.pendingBody}>
              <Text style={styles.pendingTitle}>{t("client.home.pickup_reminder_title")}</Text>
              <Text style={styles.pendingText}>
                {pendingCount === 1
                  ? t("client.home.pickup_reminder_message_singular")
                  : t("client.home.pickup_reminder_message", { count: pendingCount, plural: "s" }) ||
                    `Vous avez ${pendingCount} commandes en attente.`}
              </Text>
              <Text style={styles.pendingLink}>{t("client.home.view_orders")}</Text>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.impactCard} onPress={() => router.push("/impact" as any)} activeOpacity={0.85}>
          <View style={styles.impactTop}>
            <View style={styles.impactTitleRow}>
              <Ionicons name="leaf" size={16} color={theme.primaryDark} />
              <Text style={styles.impactTitle}>{t("client.home.your_impact") || "Votre impact"}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.muted} />
          </View>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{impact.meals}</Text>
              <Text style={styles.statLabel} numberOfLines={2}>{t("profile.mealsSaved") || "Repas sauvés"}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{impact.co2 >= 10 ? impact.co2.toFixed(0) : impact.co2.toFixed(1)}</Text>
              <Text style={styles.statLabel} numberOfLines={2}>kg CO₂</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{formatPrice(impact.money)}</Text>
              <Text style={styles.statLabel} numberOfLines={2}>{t("profile.moneySaved") || "Économisé"}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {userCoords && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, distanceFilter == null && styles.chipSelected]}
              onPress={() => setDistanceFilter(null)}
            >
              <Text style={[styles.chipText, distanceFilter == null && styles.chipTextSelected]}>
                {t("client.home.all_distances") || "Toutes"}
              </Text>
            </TouchableOpacity>
            {DISTANCES.map((km) => {
              const selected = distanceFilter === km;
              return (
                <TouchableOpacity
                  key={km}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setDistanceFilter(selected ? null : km)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{km} km</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {businesses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("search.businesses") || "Commerces"}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.businessList}>
              {businesses.map((business) => (
                <TouchableOpacity
                  key={business.id}
                  style={[styles.businessCard, business.favorite && styles.businessCardFavorite]}
                  onPress={() => router.push(`/business/${business.id}` as any)}
                  activeOpacity={0.85}
                >
                  <View>
                    <BusinessAvatar uri={business.imageUrl} />
                    {business.favorite && (
                      <View style={styles.heartBadge}>
                        <Ionicons name="heart" size={12} color="#fff" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.businessName} numberOfLines={2}>{business.name}</Text>
                  <Text style={styles.businessMeta} numberOfLines={1}>
                    {Number.isFinite(business.distance) ? formatDistance(business.distance) : business.address}
                  </Text>
                  <Text style={styles.businessMeta}>{offerCountLabel(business.offerCount)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("client.home.categories") || "Catégories"}</Text>
              {selectedCategory && (
                <TouchableOpacity onPress={() => setSelectedCategory(null)} hitSlop={8}>
                  <Text style={styles.seeAll}>{t("home.clearFilter") || "Effacer"}</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((category) => {
                const selected = selectedCategory === category.type;
                const count = categoryCounts[category.type] || 0;
                return (
                  <TouchableOpacity
                    key={category.type}
                    style={[styles.categoryCard, selected && styles.categoryCardSelected]}
                    onPress={() => setSelectedCategory(selected ? null : category.type)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.categoryIcon, { backgroundColor: category.tint }]}>
                      <Ionicons name={category.icon} size={18} color={category.iconColor} />
                    </View>
                    <View style={styles.categoryCopy}>
                      <Text style={[styles.categoryText, selected && styles.categoryTextSelected]} numberOfLines={1}>
                        {t(`offers.food_type_${category.type}`) || category.type}
                      </Text>
                      <Text style={styles.categoryCount}>{offerCountLabel(count)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

        {!isSearching && !selectedCategory && endingSoon.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.impactTitleRow}>
                <Ionicons name="time-outline" size={18} color="#92400e" />
                <Text style={styles.sectionTitle}>{t("client.home.ending_soon") || "À récupérer bientôt"}</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {endingSoon.map((product: any) => (
                <View key={product.id} style={styles.horizontalCard}>
                  <BagCard product={product} store={product.store} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {!isSearching && !selectedCategory && featured.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("client.home.recommended") || "Recommandé pour vous"}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {featured.map((product: any) => (
                <View key={product.id} style={styles.horizontalCard}>
                  <BagCard product={product} store={product.store} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {(isSearching || selectedCategory || nearby.length > 0 || (featured.length === 0 && endingSoon.length === 0)) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{listTitle}</Text>
            {!showAllNearby && nearby.length > visibleNearby.length && (
              <TouchableOpacity onPress={() => setShowAllNearby(true)} hitSlop={8}>
                <Text style={styles.seeAll}>{t("client.home.see_all") || "Voir tout"}</Text>
              </TouchableOpacity>
            )}
          </View>
          {visibleNearby.length > 0 ? (
            <View style={styles.offerList}>
              {visibleNearby.map((product: any) => (
                <BagCard key={product.id} product={product} store={product.store} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="leaf-outline" size={28} color={theme.primaryDark} />
              <Text style={styles.emptyInline}>
                {isSearching
                  ? t("offers.no_results") || "Aucune offre ne correspond à votre recherche."
                  : selectedCategory
                    ? t("client.home.no_category") || "Aucune offre dans cette catégorie pour le moment."
                    : t("offers.check_back_later") || "Revenez plus tard pour de nouvelles offres !"}
              </Text>
              {(selectedCategory || distanceFilter != null) && (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedCategory(null);
                    setDistanceFilter(null);
                  }}
                >
                  <Text style={styles.seeAll}>{t("home.clearFilter") || "Effacer le filtre"}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.backgroundGradient },
  scrollContent: { paddingHorizontal: 16 },
  heroCenter: { alignItems: "center", marginBottom: 32 },
  leafCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.primaryBg, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  welcomeTitle: { fontSize: 28, fontWeight: "800", color: theme.foreground, textAlign: "center", marginBottom: 12 },
  welcomeSubtitle: { fontSize: 16, color: theme.muted, textAlign: "center", lineHeight: 24 },
  ctaGroup: { gap: 12, marginBottom: 32 },
  primaryButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: theme.primaryDark, borderRadius: 12, paddingVertical: 16 },
  primaryButtonText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  secondaryButton: { paddingVertical: 16, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: theme.border, alignItems: "center" },
  secondaryButtonText: { fontSize: 15, fontWeight: "500", color: theme.foreground },
  providerCard: { backgroundColor: theme.primaryBg, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: theme.primaryBorder, alignItems: "center", gap: 8 },
  providerTitle: { fontSize: 18, fontWeight: "700", color: theme.foreground },
  providerDesc: { fontSize: 13, color: theme.muted, textAlign: "center", marginBottom: 8 },
  skeletonContainer: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.backgroundGradient, gap: 12, padding: 24 },
  stateMessage: { fontSize: 15, color: theme.foreground, textAlign: "center", fontWeight: "600" },
  retryButton: { backgroundColor: theme.primaryDark, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  retryButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, backgroundColor: theme.backgroundGradient },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  greetingBlock: { flex: 1 },
  greeting: { fontSize: 26, fontWeight: "800", color: theme.primaryDark, marginBottom: 2 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locationText: { fontWeight: "600", color: theme.foreground, fontSize: 13, flexShrink: 1 },
  bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff", borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: theme.destructive, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  searchWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.border },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: theme.foreground },
  filterBtn: { padding: 6, borderRadius: 8, backgroundColor: theme.primaryBg },
  feed: {},
  pendingBanner: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginHorizontal: 16, marginTop: 4, padding: 14, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#f3e2b3" },
  pendingIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.amberBg, alignItems: "center", justifyContent: "center" },
  pendingBody: { flex: 1, gap: 2 },
  pendingTitle: { fontSize: 14, fontWeight: "800", color: "#92400e" },
  pendingText: { fontSize: 13, color: "#92400e", lineHeight: 18 },
  pendingLink: { marginTop: 4, fontSize: 13, fontWeight: "700", color: theme.primaryDark },
  impactCard: { marginHorizontal: 16, marginTop: 16, backgroundColor: "#fff", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: theme.primaryBorder },
  impactTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  impactTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  impactTitle: { fontSize: 16, fontWeight: "800", color: theme.primaryDark },
  statsRow: { flexDirection: "row", alignItems: "center" },
  stat: { flex: 1, alignItems: "center", gap: 2, paddingHorizontal: 4 },
  statValue: { fontSize: 16, fontWeight: "800", color: theme.foreground },
  statLabel: { fontSize: 11, color: theme.muted, textAlign: "center" },
  statDivider: { width: 1, alignSelf: "stretch", backgroundColor: theme.border },
  chipRow: { paddingHorizontal: 16, paddingTop: 14, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: theme.border },
  chipSelected: { backgroundColor: theme.primaryDark, borderColor: theme.primaryDark },
  chipText: { fontSize: 13, fontWeight: "700", color: theme.foreground },
  chipTextSelected: { color: "#fff" },
  section: { paddingHorizontal: 16, marginTop: 22 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: theme.foreground, flexShrink: 1 },
  seeAll: { fontSize: 14, fontWeight: "700", color: theme.primaryDark },
  horizontalList: { gap: 12, paddingRight: 16 },
  horizontalCard: { width: 270 },
  businessList: { gap: 12, paddingRight: 4 },
  businessCard: { width: 132, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 12, alignItems: "center" },
  businessCardFavorite: { borderColor: theme.primaryDark, backgroundColor: theme.primaryBg },
  businessAvatar: { width: 64, height: 64, borderRadius: 32 },
  businessAvatarFallback: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.primaryBg, alignItems: "center", justifyContent: "center" },
  heartBadge: { position: "absolute", right: -2, bottom: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: theme.destructive, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  businessName: { marginTop: 8, fontSize: 13, fontWeight: "700", color: theme.foreground, textAlign: "center", minHeight: 34 },
  businessMeta: { marginTop: 2, fontSize: 11, color: theme.muted, textAlign: "center" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  categoryCard: { flexBasis: "47%", flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: theme.border, paddingVertical: 12, paddingHorizontal: 12 },
  categoryCardSelected: { backgroundColor: theme.primaryBg, borderColor: theme.primaryDark },
  categoryIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  categoryCopy: { flex: 1 },
  categoryText: { fontSize: 14, fontWeight: "700", color: theme.foreground },
  categoryTextSelected: { color: theme.primaryDark },
  categoryCount: { fontSize: 12, color: theme.muted, marginTop: 2 },
  offerList: { gap: 16 },
  emptyCard: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 24, alignItems: "center", gap: 8 },
  emptyInline: { fontSize: 14, color: theme.muted, textAlign: "center", lineHeight: 20 },
});
