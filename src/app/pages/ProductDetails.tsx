import React, { useState, useEffect } from "react";
import {
  View, Text, Image, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Share, Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProduct, useCreateOrder, useFavorites, useToggleFavorite } from "@/hooks/use-shop";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/context/LanguageContext";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { formatPrice } from "@/utils/formatPrice";
import { isOfferExpired } from "@/utils/offerUtils";
import { sanitizeErrorMessage } from "@/utils/errorUtils";
import { safeGoBack } from "@/lib/navigation";

const PRIMARY = "#16a34a";

interface Props {
  id: string;
}

export default function ProductDetails({ id }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const productId = parseInt(id || "0");

  const { data: product, isLoading } = useProduct(productId);
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const { mutate: createOrder, isPending } = useCreateOrder();
  const { data: favorites } = useFavorites();
  const { mutate: toggleFavorite } = useToggleFavorite();

  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (favorites && productId) {
      setIsFavorite(favorites.includes(productId));
    }
  }, [favorites, productId]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────────
  if (!product) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFound}>Product not found</Text>
      </View>
    );
  }

  const price = formatPrice(product.price);
  const originalPrice = formatPrice(product.originalPrice);
  const isExpired = isOfferExpired(product.expirationDate);
  const isSoldOut = product.quantity === 0;
  const canOrder = !isExpired && !isSoldOut;

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleOrder = () => {
    if (!isAuthenticated) {
      Toast.show({ type: "error", text1: "Sign in required", text2: "Please sign in to order this bag" });
      router.push("/(auth)/signin");
      return;
    }
    if (isExpired) {
      Toast.show({
        type: "error",
        text1: t("common.expired") || "Expired",
        text2: t("client.offers.detail.expired_cannot_order") || "This offer has expired and cannot be ordered.",
      });
      return;
    }
    if (isSoldOut) {
      Toast.show({ type: "error", text1: "Sold out", text2: "This offer is no longer available" });
      return;
    }
    createOrder(
      { productId: product.id, quantity: 1 },
      {
        onSuccess: () => {
          Toast.show({ type: "success", text1: "Order placed!", text2: "Your order has been placed successfully" });
          setTimeout(() => router.push("/(client)/orders"), 1000);
        },
        onError: (error: unknown) => {
          Toast.show({
            type: "error",
            text1: "Error",
            text2: sanitizeErrorMessage(error, { defaultMessage: "Failed to place order" }),
          });
        },
      }
    );
  };

  const handleFavorite = () => {
    toggleFavorite(productId);
    setIsFavorite(!isFavorite);
    Toast.show({
      type: "success",
      text1: isFavorite ? "Removed from favorites" : "Added to favorites",
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: `${product.store.name} - ${product.name}`,
        message: `Check out this Magic Bag from ${product.store.name}!`,
      });
    } catch (e) {}
  };

  const handleDirections = () => {
    const query = encodeURIComponent(product.store.address);
    Linking.openURL(`https://maps.google.com/?q=${query}`);
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: product.imageUrl || product.store.imageUrl }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          {/* Gradient overlay */}
          <View style={styles.heroOverlay} />

          {/* Header Actions */}
          <View style={[styles.heroActions, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity style={styles.heroButton} onPress={() => safeGoBack(router, "/(client)/Home")}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.heroActionRight}>
              <TouchableOpacity style={styles.heroButton} onPress={handleShare}>
                <Ionicons name="share-outline" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.heroButton, isFavorite && styles.heroButtonFav]}
                onPress={handleFavorite}
              >
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={20}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Content card */}
        <View style={styles.contentCard}>

          {/* Title & Price */}
          <View style={styles.titleRow}>
            <Text style={styles.storeName}>{product.store.name}</Text>
            <View style={styles.priceBlock}>
              <Text style={styles.price}>{price}</Text>
              <Text style={styles.originalPrice}>{originalPrice}</Text>
            </View>
          </View>

          {/* Category & Rating */}
          <View style={styles.metaRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{product.store.category}</Text>
            </View>
            <Text style={styles.dot}>•</Text>
            <Ionicons name="star" size={14} color="#f97316" />
            <Text style={styles.rating}>{product.store.rating}</Text>
            <Text style={styles.ratingCount}>(500+)</Text>
          </View>

          {/* Pickup Time */}
          <View style={styles.pickupBox}>
            <Ionicons name="time-outline" size={20} color="#c2410c" style={{ marginTop: 2 }} />
            <View>
              <Text style={styles.pickupTitle}>Collection Time</Text>
              <Text style={styles.pickupTime}>Today {product.pickupStart} - {product.pickupEnd}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* What you get */}
          <Text style={styles.sectionTitle}>What you could get</Text>
          <View style={styles.contentBox}>
            <View style={styles.contentBoxIcon}>
              <Ionicons name="alert-circle-outline" size={20} color={PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contentBoxTitle}>{product.name}</Text>
              <Text style={styles.contentBoxDesc}>{product.description}</Text>
              <View style={styles.contentBoxNote}>
                <Ionicons name="information-circle-outline" size={12} color="#888" />
                <Text style={styles.contentBoxNoteText}>Contents depend on unsold items</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Location */}
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={20} color="#888" style={{ marginTop: 2 }} />
            <View>
              <Text style={styles.address}>{product.store.address}</Text>
              <Text style={styles.distance}>1.2 km away</Text>
            </View>
          </View>

          {/* Map placeholder */}
          <TouchableOpacity style={styles.mapPlaceholder} onPress={handleDirections} activeOpacity={0.85}>
            <Image
              source={{ uri: "https://mt1.google.com/vt/lyrs=m&x=13&y=24&z=5" }}
              style={[StyleSheet.absoluteFill, { opacity: 0.5 }]}
              resizeMode="cover"
            />
            <View style={styles.directionsButton}>
              <Text style={styles.directionsButtonText}>Get Directions</Text>
            </View>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* Sticky Order Button */}
      <View style={[styles.orderBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[
            styles.orderButton,
            (!canOrder || isPending) && styles.orderButtonDisabled,
          ]}
          onPress={handleOrder}
          disabled={!canOrder || isPending}
          activeOpacity={0.85}
        >
          {isPending ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.orderButtonText}>Ordering...</Text>
            </>
          ) : isExpired ? (
            <Text style={styles.orderButtonText}>{t("common.expired") || "Expired"}</Text>
          ) : product.quantity > 0 ? (
            <>
              <Ionicons name="bag-outline" size={20} color="#fff" />
              <Text style={styles.orderButtonText}>Order</Text>
            </>
          ) : (
            <Text style={styles.orderButtonText}>Sold Out</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFound: { fontSize: 16, color: "#888" },

  // Hero
  heroContainer: { height: 280, width: "100%" },
  heroImage: { width: "100%", height: "100%" },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  heroActions: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 16,
  },
  heroActionRight: { flexDirection: "row", gap: 12 },
  heroButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  heroButtonFav: { backgroundColor: "rgba(239,68,68,0.8)" },

  // Content
  contentCard: {
    marginTop: -24, backgroundColor: "#fff",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 28,
  },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  storeName: { fontSize: 22, fontWeight: "800", color: "#111", flex: 1, marginRight: 12 },
  priceBlock: { alignItems: "flex-end" },
  price: { fontSize: 22, fontWeight: "800", color: PRIMARY },
  originalPrice: { fontSize: 13, color: "#888", textDecorationLine: "line-through", marginTop: 2 },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 },
  categoryBadge: { backgroundColor: "#f0f0f0", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  categoryText: { fontSize: 11, fontWeight: "700", color: "#555", textTransform: "uppercase", letterSpacing: 0.5 },
  dot: { color: "#ccc" },
  rating: { fontSize: 14, fontWeight: "600", color: "#111" },
  ratingCount: { fontSize: 13, color: "#888" },

  pickupBox: {
    flexDirection: "row", gap: 12, alignItems: "flex-start",
    backgroundColor: "#fff7ed", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#ffedd5",
  },
  pickupTitle: { fontSize: 13, fontWeight: "700", color: "#9a3412", marginBottom: 2 },
  pickupTime: { fontSize: 13, color: "#c2410c" },

  divider: { height: 1, backgroundColor: "#f0f0f0", marginVertical: 20 },

  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111", marginBottom: 12 },

  contentBox: {
    flexDirection: "row", gap: 12,
    backgroundColor: "#f9f9f9", borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: "#e0e0e0",
  },
  contentBoxIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  contentBoxTitle: { fontSize: 14, fontWeight: "700", color: "#111", marginBottom: 4 },
  contentBoxDesc: { fontSize: 13, color: "#555", lineHeight: 20 },
  contentBoxNote: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  contentBoxNoteText: { fontSize: 11, color: "#888", fontStyle: "italic" },

  locationRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  address: { fontSize: 15, fontWeight: "500", color: "#111" },
  distance: { fontSize: 13, color: "#888", marginTop: 2 },

  mapPlaceholder: {
    height: 130, borderRadius: 12, overflow: "hidden",
    backgroundColor: "#e0e0e0", alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  directionsButton: {
    backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 8, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  directionsButtonText: { fontSize: 14, fontWeight: "600", color: "#111" },

  // Order bar
  orderBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e0e0e0",
    paddingHorizontal: 16, paddingTop: 12,
  },
  orderButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 16,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  orderButtonDisabled: { opacity: 0.5 },
  orderButtonText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});