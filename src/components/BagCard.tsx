import React, { useState } from "react";
import {
  View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useFavorites, useToggleFavorite, useCreateOrder } from "@/hooks/use-shop";
import { useAuth } from "@/hooks/use-auth";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import type { Product, Store } from "@/lib/mock-data";

const PRIMARY = "#16a34a";
const FALLBACK = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80";

interface BagCardProps {
  product: Product;
  store: Store;
}

export function BagCard({ product, store }: BagCardProps) {
  const router = useRouter();
  const { data: favorites } = useFavorites();
  const { mutate: toggleFavorite } = useToggleFavorite();
  const { mutate: createOrder, isPending } = useCreateOrder();
  const { isAuthenticated } = useAuth();
  const [isFavorited, setIsFavorited] = useState(favorites?.includes(product.id) || false);
  const [imgError, setImgError] = useState(false);

  const originalPriceValue = product.originalPrice || 0;
  const priceValue = product.price || 0;
  const discount = originalPriceValue > priceValue && originalPriceValue > 0
    ? Math.round(((originalPriceValue - priceValue) / originalPriceValue) * 100)
    : 0;

  const price = `$${(priceValue / 100).toFixed(2)}`;
  const originalPrice = originalPriceValue > priceValue
    ? `$${(originalPriceValue / 100).toFixed(2)}`
    : null;

  const handleFavorite = () => {
    toggleFavorite(product.id);
    setIsFavorited((v) => !v);
  };

  const handleOrder = () => {
    if (!isAuthenticated) {
      Toast.show({ type: "error", text1: "Sign in required", text2: "Please sign in to order this bag" });
      router.push("/(auth)/signin");
      return;
    }
    if (product.quantity === 0) {
      Toast.show({ type: "error", text1: "Sold out", text2: "This item is no longer available" });
      return;
    }
    createOrder(
      { productId: product.id, quantity: 1 },
      {
        onSuccess: () => Toast.show({ type: "success", text1: "Order placed!", text2: "Your Magic Bag is reserved." }),
        onError: (error: any) => Toast.show({ type: "error", text1: "Error", text2: error?.message || "Failed to place order" }),
      }
    );
  };

  return (
    <TouchableOpacity
      style={s.card}
      activeOpacity={0.92}
      onPress={() => router.push(`/product/${product.id}`)}
    >
      {/* Image */}
      <View style={s.imageContainer}>
        <Image
          source={{ uri: imgError ? FALLBACK : (product.imageUrl || store?.imageUrl || FALLBACK) }}
          style={s.image}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />

        {/* Sold out overlay */}
        {product.quantity === 0 && (
          <View style={s.soldOutOverlay}>
            <Text style={s.soldOutText}>Sold Out</Text>
          </View>
        )}

        {/* Top-left badges */}
        <View style={s.badgesRow}>
          {discount > 0 && (
            <View style={s.discountBadge}>
              <Text style={s.discountBadgeText}>{discount}% OFF</Text>
            </View>
          )}
          <View style={s.quantityBadge}>
            <Text style={s.quantityBadgeText}>
              {product.quantity > 0 ? `${product.quantity} left` : "Sold out"}
            </Text>
          </View>
        </View>

        {/* Favorite button */}
        <TouchableOpacity style={s.favoriteButton} onPress={handleFavorite} activeOpacity={0.8}>
          <Ionicons
            name={isFavorited ? "heart" : "heart-outline"}
            size={16}
            color={isFavorited ? "#ef4444" : "#9ca3af"}
          />
        </TouchableOpacity>

        {/* Store logo */}
        {store?.logoUrl && (
          <View style={s.storeLogo}>
            <Image source={{ uri: store.logoUrl }} style={s.storeLogoImage} resizeMode="cover" />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={s.content}>
        <View>
          <Text style={s.storeName} numberOfLines={1}>{store?.name || "Unknown Store"}</Text>
          <Text style={s.productName} numberOfLines={1}>{product.name || "Food Offer"}</Text>
        </View>

        {/* Pickup time */}
        <View style={s.pickupRow}>
          <View style={s.pickupBadge}>
            <Ionicons name="time-outline" size={12} color="#555" />
            <Text style={s.pickupText}>{product.pickupStart} - {product.pickupEnd}</Text>
          </View>
        </View>

        {/* Price + Order button */}
        <View style={s.footer}>
          <View style={s.priceRow}>
            <Text style={s.price}>{price}</Text>
            {originalPrice && (
              <Text style={s.originalPrice}>{originalPrice}</Text>
            )}
          </View>
          <TouchableOpacity
            style={[s.orderButton, (isPending || product.quantity === 0) && s.orderButtonDisabled]}
            onPress={handleOrder}
            disabled={isPending || product.quantity === 0}
            activeOpacity={0.85}
          >
            {isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="bag-outline" size={14} color="#fff" />
                <Text style={s.orderButtonText}>Order</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // Image
  imageContainer: { width: "100%", height: 160, backgroundColor: "#f0f0f0" },
  image: { width: "100%", height: "100%" },
  soldOutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center", justifyContent: "center",
  },
  soldOutText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  badgesRow: { position: "absolute", top: 8, left: 8, flexDirection: "row", gap: 6 },
  discountBadge: {
    backgroundColor: "#f59e0b", borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  discountBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  quantityBadge: {
    backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  quantityBadgeText: { color: "#111", fontSize: 11, fontWeight: "700" },

  favoriteButton: {
    position: "absolute", top: 8, right: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 999, padding: 6,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },

  storeLogo: {
    position: "absolute", bottom: -16, right: 12,
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 2, borderColor: "#fff",
    overflow: "hidden", backgroundColor: "#fff",
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  storeLogoImage: { width: "100%", height: "100%" },

  // Content
  content: { padding: 12, gap: 8 },
  storeName: { fontSize: 15, fontWeight: "800", color: "#111", marginBottom: 2 },
  productName: { fontSize: 12, color: "#888" },

  pickupRow: { flexDirection: "row" },
  pickupBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#f5f5f5", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 5,
  },
  pickupText: { fontSize: 12, fontWeight: "500", color: "#555" },

  footer: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8, borderTopWidth: 1, borderTopColor: "#f0f0f0",
  },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  price: { fontSize: 18, fontWeight: "800", color: PRIMARY },
  originalPrice: { fontSize: 12, color: "#aaa", textDecorationLine: "line-through" },

  orderButton: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: PRIMARY, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    shadowColor: PRIMARY, shadowOpacity: 0.25, shadowRadius: 4, elevation: 2,
  },
  orderButtonDisabled: { opacity: 0.5 },
  orderButtonText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});