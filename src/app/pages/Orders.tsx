import React, { useState } from "react";
import {
  View, Text, Image, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Clipboard, Share,
  Linking, LayoutAnimation, Platform, UIManager,
} from "react-native";
import { useRouter } from "expo-router";
import { useOrders } from "@/hooks/use-shop";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api-client";
import { Ionicons } from "@expo/vector-icons";
import { formatPrice } from "@/utils/formatPrice";
import Toast from "react-native-toast-message";
import QRCode from "react-native-qrcode-svg";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PRIMARY = "#16a34a";
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80";

// ─── Status config ─────────────────────────────────────────────────────────────
function getStatusConfig(status: string) {
  switch (status) {
    case "pending":
      return { bg: "#fefce8", border: "#fde047", text: "#854d0e", icon: "time-outline", iconColor: "#ca8a04" };
    case "confirmed":
      return { bg: "#f0fdf4", border: "#86efac", text: "#166534", icon: "checkmark-circle-outline", iconColor: "#16a34a" };
    case "cancelled":
      return { bg: "#fef2f2", border: "#fca5a5", text: "#991b1b", icon: "close-circle-outline", iconColor: "#dc2626" };
    default:
      return { bg: "#f9fafb", border: "#d1d5db", text: "#374151", icon: "cube-outline", iconColor: "#6b7280" };
  }
}

// ─── Main Orders Screen ────────────────────────────────────────────────────────
export default function Orders() {
  const router = useRouter();
  const { data: orders, isLoading } = useOrders();
  const queryClient = useQueryClient();

  const cancelOrderMutation = useMutation({
    mutationFn: (id: number) => ordersApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/orders"] });
      Toast.show({ type: "success", text1: "Order cancelled", text2: "Your order has been cancelled successfully" });
    },
    onError: (error: any) => {
      Toast.show({ type: "error", text1: "Error", text2: error.message || "Failed to cancel order" });
    },
  });

  const pendingOrders = orders?.filter((o: any) => o.status === "pending") || [];
  const confirmedOrders = orders?.filter((o: any) => o.status === "confirmed" && !o.collectedAt) || [];
  const pastOrders = orders?.filter((o: any) =>
    (o.status === "confirmed" && o.collectedAt) || o.status === "cancelled" || o.status === "expired"
  ) || [];
  const hasOrders = orders && orders.length > 0;

  if (isLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={s.pageTitle}>My Orders</Text>

      {/* Stats row */}
      {hasOrders && (
        <View style={s.statsRow}>
          {[
            { count: pendingOrders.length, label: "Pending", bg: "#fefce8", border: "#fde047", iconColor: "#ca8a04", icon: "time-outline" },
            { count: confirmedOrders.length, label: "Confirmed", bg: "#f0fdf4", border: "#86efac", iconColor: "#16a34a", icon: "checkmark-circle-outline" },
            { count: pastOrders.length, label: "Past", bg: "#f9fafb", border: "#d1d5db", iconColor: "#6b7280", icon: "cube-outline" },
          ].map((stat) => (
            <View key={stat.label}
              style={[s.statCard, { backgroundColor: stat.bg, borderColor: stat.border, opacity: stat.count > 0 ? 1 : 0.5 }]}>
              <View style={s.statCardInner}>
                <View style={[s.statIcon, { backgroundColor: stat.bg }]}>
                  <Ionicons name={stat.icon as any} size={12} color={stat.iconColor} />
                </View>
                <Text style={[s.statCount, { color: stat.iconColor }]}>{stat.count}</Text>
                <Text style={[s.statLabel, { color: stat.iconColor }]}>{stat.label}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Pending */}
      {pendingOrders.length > 0 && (
        <View style={s.section}>
          <SectionHeader icon="time-outline" iconBg="#fef9c3" iconColor="#ca8a04" title="Pending Orders" count={pendingOrders.length} />
          {pendingOrders.map((order: any) => (
            <OrderCard
              key={order.id} order={order}
              onCancel={() => cancelOrderMutation.mutate(order.id)}
              isCancelling={cancelOrderMutation.isPending}
            />
          ))}
        </View>
      )}

      {/* Confirmed */}
      {confirmedOrders.length > 0 && (
        <View style={s.section}>
          <SectionHeader icon="checkmark-circle-outline" iconBg="#dcfce7" iconColor="#16a34a" title="Confirmed Orders" count={confirmedOrders.length} />
          {confirmedOrders.map((order: any) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </View>
      )}

      {/* Past */}
      {pastOrders.length > 0 && (
        <View style={[s.section, { opacity: 0.7 }]}>
          <SectionHeader icon="cube-outline" iconBg="#f3f4f6" iconColor="#6b7280" title="Past Orders" count={pastOrders.length} />
          {pastOrders.map((order: any) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </View>
      )}

      {/* Empty state */}
      {!isLoading && !hasOrders && (
        <View style={s.emptyBox}>
          <View style={s.emptyIcon}>
            <Ionicons name="bag-outline" size={28} color={PRIMARY} />
          </View>
          <Text style={s.emptyTitle}>No orders yet</Text>
          <Text style={s.emptySubtitle}>Start saving food and money!</Text>
          <TouchableOpacity style={s.emptyButton} onPress={() => router.push("/(client)/Browse")}>
            <Text style={s.emptyButtonText}>Browse Offers</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ icon, iconBg, iconColor, title, count }: {
  icon: string; iconBg: string; iconColor: string; title: string; count: number;
}) {
  return (
    <View style={s.sectionHeader}>
      <View style={[s.sectionIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={14} color={iconColor} />
      </View>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={[s.badge, { backgroundColor: iconBg }]}>
        <Text style={[s.badgeText, { color: iconColor }]}>{count}</Text>
      </View>
    </View>
  );
}

// ─── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({ order, onCancel, isCancelling }: {
  order: any; onCancel?: () => void; isCancelling?: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  const cfg = getStatusConfig(order.status);
  const product = order.product || {};
  const store = product.store || {};
  const orderDate = new Date(order.createdAt);
  const collectedDate = order.collectedAt ? new Date(order.collectedAt) : null;

  const toggleDetails = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowDetails((v) => !v);
    if (showDetails) setShowQR(false);
  };

  const handleCopy = () => {
    Clipboard.setString(order.pickupCode);
    setCopied(true);
    Toast.show({ type: "success", text1: "Copied!", text2: "Pickup code copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMaps = () => {
    if (store.mapsLink) Linking.openURL(store.mapsLink);
    else if (store.address) Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(store.address)}`);
  };

  return (
    <View style={[s.card, { borderColor: cfg.border, backgroundColor: cfg.bg }]}>
      {/* Top row */}
      <View style={s.cardTop}>
        <Image
          source={{ uri: product.imageUrl || store.imageUrl || FALLBACK_IMAGE }}
          style={s.cardImage}
          resizeMode="cover"
        />
        <View style={s.cardInfo}>
          <Text style={s.cardTitle} numberOfLines={2}>{product.name || "Order"}</Text>
          <View style={[s.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
            <Ionicons name={cfg.icon as any} size={10} color={cfg.iconColor} />
            <Text style={[s.statusText, { color: cfg.text }]}>{order.status.toUpperCase()}</Text>
          </View>
          <View style={s.cardMeta}>
            <View style={s.cardQty}>
              <Ionicons name="cube-outline" size={12} color={PRIMARY} />
              <Text style={s.cardQtyText}>Qty: {order.quantity}</Text>
            </View>
            <Text style={s.cardPrice}>{formatPrice(order.totalPrice || 0)}</Text>
          </View>
        </View>
      </View>

      {/* Pickup time bar (pending only) */}
      {order.status === "pending" && product.pickupStart && product.pickupEnd && (
        <View style={s.pickupBar}>
          <Ionicons name="time-outline" size={14} color={PRIMARY} />
          <Text style={s.pickupBarText}>Pickup: {product.pickupStart} - {product.pickupEnd}</Text>
        </View>
      )}

      {/* Expandable details */}
      {showDetails && (
        <View style={s.details}>
          {/* Location */}
          <View style={s.detailRow}>
            <View style={[s.detailIcon, { backgroundColor: "#dcfce7" }]}>
              <Ionicons name="location-outline" size={16} color={PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.detailLabel}>PICKUP LOCATION</Text>
              <Text style={s.detailValue}>{store.address || store.location || "Location not specified"}</Text>
              {(store.mapsLink || store.address) && (
                <TouchableOpacity onPress={handleMaps} style={s.mapsLink}>
                  <Ionicons name="open-outline" size={12} color={PRIMARY} />
                  <Text style={s.mapsLinkText}>Open in Maps</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Order date */}
          <View style={s.detailRow}>
            <View style={[s.detailIcon, { backgroundColor: "#dbeafe" }]}>
              <Ionicons name="time-outline" size={16} color="#2563eb" />
            </View>
            <View>
              <Text style={s.detailLabel}>ORDERED ON</Text>
              <Text style={s.detailValue}>
                {orderDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </Text>
              <Text style={s.detailSub}>
                {orderDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          </View>

          {/* Collected date */}
          {collectedDate && (
            <View style={s.detailRow}>
              <View style={[s.detailIcon, { backgroundColor: "#dcfce7" }]}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
              </View>
              <View>
                <Text style={s.detailLabel}>PICKED UP AT</Text>
                <Text style={s.detailValue}>
                  {collectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </Text>
                <Text style={s.detailSub}>
                  {collectedDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            </View>
          )}

          {/* Action buttons */}
          <View style={s.actions}>
            {order.status === "pending" && order.pickupCode && (
              <TouchableOpacity
                style={s.qrButton}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setShowQR((v) => !v);
                }}
              >
                <Ionicons name="qr-code-outline" size={16} color="#fff" />
                <Text style={s.qrButtonText}>{showQR ? "Hide QR Code" : "Show QR Code"}</Text>
                <Ionicons name={showQR ? "chevron-up" : "chevron-down"} size={16} color="#fff" />
              </TouchableOpacity>
            )}
            {order.status === "pending" && onCancel && (
              <TouchableOpacity
                style={[s.cancelButton, isCancelling && s.cancelButtonDisabled]}
                onPress={onCancel}
                disabled={isCancelling}
              >
                <Ionicons name="close-outline" size={16} color="#fff" />
                <Text style={s.cancelButtonText}>{isCancelling ? "Cancelling..." : "Cancel Order"}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* QR Code */}
          {showQR && order.pickupCode && (
            <View style={s.qrContainer}>
              <Text style={s.qrTitle}>Pickup QR Code</Text>
              <Text style={s.qrSubtitle}>Show this QR code to the provider</Text>
              <View style={s.qrCodeBox}>
                <QRCode value={order.pickupCode} size={180} />
              </View>
              <View style={s.codeBox}>
                <Text style={s.codeLabel}>Order Code</Text>
                <Text style={s.codeValue}>{order.pickupCode}</Text>
              </View>
              <View style={s.qrActions}>
                <TouchableOpacity style={s.copyButton} onPress={handleCopy}>
                  <Ionicons name={copied ? "checkmark" : "copy-outline"} size={16} color="#111" />
                  <Text style={s.copyButtonText}>{copied ? "Copied" : "Copy"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.shareButton}
                  onPress={() => Share.share({ message: `My pickup code: ${order.pickupCode}` })}
                >
                  <Ionicons name="share-outline" size={16} color="#fff" />
                  <Text style={s.shareButtonText}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Toggle details button */}
      <TouchableOpacity style={s.toggleButton} onPress={toggleDetails} activeOpacity={0.8}>
        <Ionicons name={showDetails ? "chevron-up" : "chevron-down"} size={16} color="#555" />
        <Text style={s.toggleButtonText}>{showDetails ? "Hide Details" : "Show Details"}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { padding: 16, paddingBottom: 100 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: 24, fontWeight: "800", color: "#111", marginBottom: 16 },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 8, borderWidth: 1, padding: 8 },
  statCardInner: { flexDirection: "row", alignItems: "center", gap: 4 },
  statIcon: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statCount: { fontSize: 14, fontWeight: "800" },
  statLabel: { fontSize: 9, fontWeight: "600" },

  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#111" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: "700" },

  card: { borderRadius: 16, borderWidth: 2, marginBottom: 12, overflow: "hidden" },
  cardTop: { flexDirection: "row", gap: 12, padding: 12 },
  cardImage: { width: 80, height: 80, borderRadius: 12 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 6, lineHeight: 20 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, marginBottom: 8 },
  statusText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  cardMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardQty: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardQtyText: { fontSize: 12, fontWeight: "600", color: PRIMARY },
  cardPrice: { fontSize: 16, fontWeight: "800", color: PRIMARY },

  pickupBar: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 12, marginBottom: 12, backgroundColor: "rgba(22,163,74,0.07)", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "rgba(22,163,74,0.2)" },
  pickupBarText: { fontSize: 13, fontWeight: "600", color: "#111" },

  details: { paddingHorizontal: 12, paddingBottom: 4, gap: 10 },
  detailRow: { flexDirection: "row", gap: 12, backgroundColor: "#f9f9f9", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#e0e0e0" },
  detailIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  detailLabel: { fontSize: 9, fontWeight: "700", color: "#888", letterSpacing: 0.5, marginBottom: 4 },
  detailValue: { fontSize: 13, fontWeight: "500", color: "#111" },
  detailSub: { fontSize: 11, color: "#888", marginTop: 2 },
  mapsLink: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  mapsLinkText: { fontSize: 11, fontWeight: "700", color: PRIMARY },

  actions: { gap: 8, marginTop: 4 },
  qrButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 14 },
  qrButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  cancelButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#ef4444", borderRadius: 12, paddingVertical: 14 },
  cancelButtonDisabled: { opacity: 0.5 },
  cancelButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  qrContainer: { backgroundColor: "#fff", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#e0e0e0", alignItems: "center", gap: 8, marginTop: 4 },
  qrTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  qrSubtitle: { fontSize: 12, color: "#888" },
  qrCodeBox: { padding: 12, backgroundColor: "#fff", borderRadius: 12, borderWidth: 2, borderColor: "#e0e0e0" },
  codeBox: { width: "100%", backgroundColor: "#f5f5f5", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#e0e0e0" },
  codeLabel: { fontSize: 10, color: "#888", marginBottom: 4 },
  codeValue: { fontSize: 14, fontFamily: "monospace", fontWeight: "700", color: "#111" },
  qrActions: { flexDirection: "row", gap: 8, width: "100%" },
  copyButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#f0f0f0", borderRadius: 10, paddingVertical: 12 },
  copyButtonText: { fontSize: 14, fontWeight: "600", color: "#111" },
  shareButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: PRIMARY, borderRadius: 10, paddingVertical: 12 },
  shareButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  toggleButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, backgroundColor: "#f5f5f5", borderTopWidth: 1, borderTopColor: "#e0e0e0" },
  toggleButtonText: { fontSize: 14, fontWeight: "500", color: "#555" },

  emptyBox: { alignItems: "center", padding: 32, borderRadius: 16, borderWidth: 1, borderColor: "#e0e0e0", borderStyle: "dashed", marginTop: 32, gap: 8 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  emptySubtitle: { fontSize: 14, color: "#888" },
  emptyButton: { backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, marginTop: 8 },
  emptyButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});