import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, Image, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Clipboard, Share,
  Linking, LayoutAnimation, Platform, UIManager,
} from "react-native";
import { useRouter } from "expo-router";
import { useOrders } from "@/hooks/use-shop";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ordersApi, ratingsApi } from "@/lib/api-client";
import { Ionicons } from "@expo/vector-icons";
import { formatPrice } from "@/utils/formatPrice";
import Toast from "react-native-toast-message";
import QRCode from "react-native-qrcode-svg";
import { FALLBACK_IMAGE } from "@/lib/asset-uri";
import { RatingModal } from "@/components/RatingModal";
import { useLanguage } from "@/context/LanguageContext";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { PageHeader } from "@/components/ScreenHeader";
import { useTabScreenContentInsets } from "@/lib/screen-insets";
import { theme } from "@/lib/theme";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Main Orders Screen ────────────────────────────────────────────────────────
export default function Orders() {
  const router = useRouter();
  const { t } = useLanguage();
  const contentInsets = useTabScreenContentInsets();
  const { data: orders, isLoading, isError, refetch } = useOrders();
  const queryClient = useQueryClient();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const cancelOrderMutation = useMutation({
    mutationFn: (id: number) => ordersApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/orders"] });
      Toast.show({
        type: "success",
        text1: t("cart_order.order_cancelled") || "Order cancelled",
        text2: "Your order has been cancelled successfully",
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: t("common.error") || "Error",
        text2: error.message || t("cart_order.cancel_failed") || "Failed to cancel order",
      });
    },
  });

  const deleteHistoryMutation = useMutation({
    mutationFn: (id: number) => ordersApi.deleteFromHistory(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["/orders"] });
      const previous = queryClient.getQueryData<any[]>(["/orders"]);
      queryClient.setQueryData<any[]>(["/orders"], (current) =>
        (current || []).filter((order) => order.id !== id)
      );
      return { previous };
    },
    onError: (error: any, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["/orders"], context.previous);
      }
      Toast.show({
        type: "error",
        text1: t("common.error") || "Error",
        text2: error.message || t("orders.remove_from_history_failed") || "Could not remove this order",
      });
    },
    onSuccess: () => {
      Toast.show({
        type: "success",
        text1: t("orders.removed_from_history") || "Removed from history",
        text2: t("orders.removed_from_history_desc") || "This order was removed from your history.",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/orders"] });
    },
  });

  const handleCancelRequest = (orderId: number) => {
    confirm({
      title: t("cart_order.cancel_order") || "Cancel Order",
      message: t("cart_order.cancel_confirm") || "Are you sure you want to cancel this order?",
      confirmLabel: t("cart_order.cancel_order") || "Cancel Order",
      cancelLabel: t("common.close") || "Keep order",
      destructive: true,
      icon: "close-circle-outline",
      onConfirm: async () => {
        setCancellingId(orderId);
        try {
          await cancelOrderMutation.mutateAsync(orderId);
        } finally {
          setCancellingId(null);
        }
      },
    });
  };

  const handleDeleteFromHistory = (orderId: number) => {
    confirm({
      title: t("orders.remove_from_history") || "Remove from history",
      message:
        t("orders.remove_from_history_confirm") ||
        "Remove this order from your history? This cannot be undone.",
      confirmLabel: t("common.delete") || "Delete",
      cancelLabel: t("common.close") || "Keep",
      destructive: true,
      icon: "trash-outline",
      onConfirm: async () => {
        setCancellingId(orderId);
        try {
          await deleteHistoryMutation.mutateAsync(orderId);
        } finally {
          setCancellingId(null);
        }
      },
    });
  };

  const pendingOrders = orders?.filter((o: any) => o.status === "pending") || [];
  const confirmedOrders = orders?.filter((o: any) => o.status === "confirmed" && !o.collectedAt) || [];
  const pastOrders = orders?.filter((o: any) =>
    (o.status === "confirmed" && o.collectedAt) || o.status === "expired"
  ) || [];
  const cancelledOrders = orders?.filter((o: any) => o.status === "cancelled") || [];
  const hasOrders = orders && orders.length > 0;

  const title = t("client.orders.my_orders") || "My Orders";

  if (isLoading) {
    return (
      <View style={s.container}>
        <PageHeader title={title} />
        <View style={s.centered}>
          <ActivityIndicator size="large" color={theme.primaryDark} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={s.container}>
        <PageHeader title={title} />
        <View style={s.centered}>
          <Ionicons name="alert-circle-outline" size={40} color={theme.destructive} />
          <Text style={s.errorTitle}>{t("client.orders.error_fetch") || "Unable to load your orders"}</Text>
          <TouchableOpacity style={s.emptyButton} onPress={() => refetch()}>
            <Text style={s.emptyButtonText}>{t("common.try_again") || "Try Again"}</Text>
          </TouchableOpacity>
        </View>
        {confirmDialog}
      </View>
    );
  }

  return (
    <View style={s.container}>
    <PageHeader title={title} />
    <ScrollView style={s.flex} contentContainerStyle={[s.scrollContent, contentInsets]} showsVerticalScrollIndicator={false}>

      {/* Stats row */}
      {hasOrders && (
        <View style={s.statsRow}>
          {[
            { count: pendingOrders.length, label: "Pending", bg: theme.amberBg, border: theme.yellow, iconColor: theme.warningDark, icon: "time-outline" },
            { count: confirmedOrders.length, label: "Confirmed", bg: theme.successBg, border: theme.primaryBorder, iconColor: theme.primaryDark, icon: "checkmark-circle-outline" },
            { count: pastOrders.length, label: "Past", bg: theme.card, border: theme.border, iconColor: theme.muted, icon: "cube-outline" },
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
          <SectionHeader icon="time-outline" iconBg={theme.amberBg} iconColor={theme.warningDark} title="Pending Orders" count={pendingOrders.length} />
          {pendingOrders.map((order: any) => (
            <OrderCard
              key={order.id} order={order}
              onCancel={() => handleCancelRequest(order.id)}
              isCancelling={cancellingId === order.id}
            />
          ))}
        </View>
      )}

      {/* Confirmed */}
      {confirmedOrders.length > 0 && (
        <View style={s.section}>
          <SectionHeader icon="checkmark-circle-outline" iconBg={theme.successBg} iconColor={theme.primaryDark} title="Confirmed Orders" count={confirmedOrders.length} />
          {confirmedOrders.map((order: any) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </View>
      )}

      {/* Past (picked up + missed pickup) */}
      {pastOrders.length > 0 && (
        <View style={s.section}>
          <SectionHeader
            icon="cube-outline"
            iconBg={theme.border}
            iconColor={theme.muted}
            title={t("client.orders.past_orders") || "Past Orders"}
            count={pastOrders.length}
          />
          {pastOrders.map((order: any) => (
            <OrderCard
              key={order.id}
              order={order}
              muted
              onDeleteFromHistory={() => handleDeleteFromHistory(order.id)}
              isDeleting={cancellingId === order.id && deleteHistoryMutation.isPending}
            />
          ))}
        </View>
      )}

      {/* Cancelled — always last */}
      {cancelledOrders.length > 0 && (
        <View style={s.section}>
          <SectionHeader
            icon="close-circle-outline"
            iconBg={theme.destructiveBg}
            iconColor={theme.destructive}
            title={t("client.orders.cancelled_orders") || "Cancelled Orders"}
            count={cancelledOrders.length}
          />
          {cancelledOrders.map((order: any) => (
            <OrderCard
              key={order.id}
              order={order}
              muted
              onDeleteFromHistory={() => handleDeleteFromHistory(order.id)}
              isDeleting={cancellingId === order.id && deleteHistoryMutation.isPending}
            />
          ))}
        </View>
      )}

      {/* Empty state */}
      {!isLoading && !hasOrders && (
        <View style={s.emptyBox}>
          <View style={s.emptyIcon}>
            <Ionicons name="bag-outline" size={28} color={theme.primaryDark} />
          </View>
          <Text style={s.emptyTitle}>No orders yet</Text>
          <Text style={s.emptySubtitle}>Start saving food and money!</Text>
          <TouchableOpacity style={s.emptyButton} onPress={() => router.push("/search" as any)}>
            <Text style={s.emptyButtonText}>Browse Offers</Text>
          </TouchableOpacity>
        </View>
      )}
      {confirmDialog}
    </ScrollView>
    </View>
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
function OrderCard({ order, onCancel, onDeleteFromHistory, isCancelling, isDeleting, muted }: {
  order: any;
  onCancel?: () => void;
  onDeleteFromHistory?: () => void;
  isCancelling?: boolean;
  isDeleting?: boolean;
  muted?: boolean;
}) {
  const { t, language } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRating, setShowRating] = useState(false);

  const product = order.product || {};
  const store = product.store || {};
  const providerId = order.providerId || store.id || product.storeId;
  const isPending = order.status === "pending";
  const isCollected = order.status === "confirmed" && !!order.collectedAt;
  const awaitingPickup = (isPending || order.status === "confirmed") && !order.collectedAt;
  const canRate = isCollected && !!providerId;
  const canShowQR = isPending && !!order.pickupCode;
  const canOpenMaps = awaitingPickup && !!(store.mapsLink || store.address);
  const canCancel = isPending && !!onCancel;
  const canDeleteFromHistory =
    !!onDeleteFromHistory &&
    (order.status === "cancelled" ||
      order.status === "expired" ||
      isCollected);

  const shortDate = (value: string | Date) =>
    new Date(value).toLocaleDateString(language === "fr" ? "fr-FR" : "en-US", {
      day: "numeric",
      month: "short",
    });

  const status = awaitingPickup
    ? {
        icon: "time-outline",
        color: theme.primaryDark,
        label:
          product.pickupStart && product.pickupEnd
            ? `${t("common.pickup") || "Pickup"} ${product.pickupStart} – ${product.pickupEnd}`
            : t("orders.pending") || "Pending",
      }
    : isCollected
      ? {
          icon: "checkmark-circle-outline",
          color: theme.primaryDark,
          label: `${t("orders.picked_up") || "Picked up"} · ${shortDate(order.collectedAt)}`,
        }
      : order.status === "cancelled"
        ? {
            icon: "close-circle-outline",
            color: theme.destructive,
            label: `${t("orders.cancelled") || "Order cancelled"} · ${shortDate(order.createdAt)}`,
          }
        : {
            icon: "alert-circle-outline",
            color: theme.muted,
            label: `${t("orders.expired") || "Missed pickup"} · ${shortDate(order.createdAt)}`,
          };

  const qrExpiresAt = useMemo(
    () => new Date(new Date(order.createdAt).getTime() + 30 * 60 * 1000),
    [order.createdAt]
  );
  const [qrSecondsLeft, setQrSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((qrExpiresAt.getTime() - Date.now()) / 1000))
  );
  const qrExpired = qrSecondsLeft <= 0;

  useEffect(() => {
    if (!expanded || !showQR || order.status !== "pending") return;
    const tick = () => {
      setQrSecondsLeft(
        Math.max(0, Math.floor((qrExpiresAt.getTime() - Date.now()) / 1000))
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expanded, showQR, order.status, qrExpiresAt]);

  const qrCountdownLabel = useMemo(() => {
    const m = Math.floor(qrSecondsLeft / 60);
    const s = qrSecondsLeft % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }, [qrSecondsLeft]);

  const { data: existingRating, isLoading: ratingLoading } = useQuery({
    queryKey: ["rating", order.id],
    queryFn: async () => {
      try {
        return await ratingsApi.getByOrder(order.id);
      } catch {
        return null;
      }
    },
    enabled: canRate && expanded,
    retry: false,
  });

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => {
      if (v) setShowQR(false);
      return !v;
    });
  };

  const toggleQR = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowQR((v) => !v);
  };

  const handleCopy = async () => {
    try {
      Clipboard.setString(order.pickupCode);
      setCopied(true);
      Toast.show({ type: "success", text1: "Copied!", text2: "Pickup code copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Toast.show({
        type: "error",
        text1: t("common.error") || "Error",
        text2: "Could not copy pickup code",
      });
    }
  };

  const handleMaps = () => {
    if (store.mapsLink) Linking.openURL(store.mapsLink);
    else if (store.address) Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(store.address)}`);
  };

  return (
    <View style={[s.card, muted && s.cardMuted]}>
      <TouchableOpacity style={s.cardTop} onPress={toggleExpanded} activeOpacity={0.8}>
        <Image
          source={{ uri: product.imageUrl || store.imageUrl || FALLBACK_IMAGE }}
          style={[s.cardImage, muted && s.cardImageMuted]}
          resizeMode="cover"
        />
        <View style={s.cardInfo}>
          <View style={s.cardTitleRow}>
            <Text style={s.cardTitle} numberOfLines={1}>
              {product.name || t("client.orders.order") || "Order"}
            </Text>
            <Text style={s.cardPrice}>{formatPrice(order.totalPrice || 0)}</Text>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={theme.muted}
            />
          </View>
          <Text style={s.cardSub} numberOfLines={1}>
            {[store.name, `×${order.quantity}`].filter(Boolean).join(" · ")}
          </Text>
          <View style={s.statusLine}>
            <Ionicons name={status.icon as any} size={14} color={status.color} />
            <Text style={[s.statusLineText, { color: status.color }]} numberOfLines={1}>
              {status.label}
            </Text>
            {canRate && existingRating && (
              <View style={s.rated}>
                <Ionicons name="star" size={13} color={theme.peachDark} />
                <Text style={s.ratedText}>{existingRating.rating}/5</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <>
          {canShowQR && (
            <TouchableOpacity style={s.qrButton} onPress={toggleQR} activeOpacity={0.85}>
              <Ionicons name="qr-code-outline" size={18} color="#fff" />
              <Text style={s.qrButtonText}>
                {showQR
                  ? t("cart_order.hide_qr") || "Hide QR Code"
                  : t("cart_order.show_qr") || "Show QR Code"}
              </Text>
            </TouchableOpacity>
          )}

          {canShowQR && showQR && (
            <View style={s.qrPanel}>
              <View style={[s.qrCodeBox, qrExpired && s.qrCodeBoxExpired]}>
                <QRCode value={order.pickupCode} size={180} />
              </View>
              <Text style={[s.qrExpiry, qrExpired && s.qrExpiryExpired]}>
                {qrExpired
                  ? t("orders.qr_expired") ||
                    "Pickup window ended (30 min). This order is a missed pickup."
                  : t("orders.qr_expires_in", { time: qrCountdownLabel }) ||
                    `Pick up within ${qrCountdownLabel}`}
              </Text>
              <Text style={s.codeValue} selectable>{order.pickupCode}</Text>
              <View style={s.linkRow}>
                <TouchableOpacity style={s.linkButton} onPress={handleCopy}>
                  <Ionicons name={copied ? "checkmark" : "copy-outline"} size={16} color={theme.ink} />
                  <Text style={s.linkButtonText}>
                    {copied
                      ? t("order_qr.copied") || "Copied!"
                      : t("order_qr.copy_code") || "Copy Code"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.linkButton}
                  onPress={() => Share.share({ message: `My pickup code: ${order.pickupCode}` })}
                >
                  <Ionicons name="share-outline" size={16} color={theme.ink} />
                  <Text style={s.linkButtonText}>{t("orders.share") || "Share"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {(canOpenMaps || canCancel || canDeleteFromHistory) && (
            <View style={[s.linkRow, s.cardFooter]}>
              {canOpenMaps && (
                <TouchableOpacity style={s.linkButton} onPress={handleMaps}>
                  <Ionicons name="navigate-outline" size={16} color={theme.ink} />
                  <Text style={s.linkButtonText}>{t("orders.directions") || "Directions"}</Text>
                </TouchableOpacity>
              )}
              {canCancel && (
                <TouchableOpacity
                  style={[s.linkButton, isCancelling && s.disabled]}
                  onPress={onCancel}
                  disabled={isCancelling}
                >
                  <Ionicons name="close-outline" size={16} color={theme.destructive} />
                  <Text style={[s.linkButtonText, s.dangerText]}>
                    {isCancelling
                      ? t("cart_order.cancelling") || "Cancelling..."
                      : t("cart_order.cancel_order") || "Cancel Order"}
                  </Text>
                </TouchableOpacity>
              )}
              {canDeleteFromHistory && (
                <TouchableOpacity
                  style={[s.linkButton, isDeleting && s.disabled]}
                  onPress={onDeleteFromHistory}
                  disabled={isDeleting}
                >
                  <Ionicons name="trash-outline" size={16} color={theme.destructive} />
                  <Text style={[s.linkButtonText, s.dangerText]}>
                    {isDeleting
                      ? t("orders.removing_from_history") || "Removing..."
                      : t("orders.remove_from_history") || "Remove"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {canRate && !ratingLoading && !existingRating && (
            <TouchableOpacity style={s.rateButton} onPress={() => setShowRating(true)} activeOpacity={0.85}>
              <Ionicons name="star-outline" size={16} color={theme.peachDark} />
              <Text style={s.rateButtonText}>
                {t("cart_order.rate_experience") || "Rate Experience"}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {canRate && providerId && (
        <RatingModal
          visible={showRating}
          onClose={() => setShowRating(false)}
          orderId={order.id}
          providerId={providerId}
          providerName={store.name}
        />
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.backgroundGradient },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 8 },
  statCardInner: { flexDirection: "row", alignItems: "center", gap: 4 },
  statIcon: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statCount: { fontSize: 14, fontWeight: "800" },
  statLabel: { fontSize: 9, fontWeight: "600" },

  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: theme.foreground },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: "700" },

  card: { backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 14, marginBottom: 12, gap: 12 },
  cardMuted: { backgroundColor: theme.backgroundGradient },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardImage: { width: 64, height: 64, borderRadius: 12, backgroundColor: theme.border },
  cardImageMuted: { opacity: 0.75 },
  cardInfo: { flex: 1, gap: 4 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: theme.foreground },
  cardPrice: { fontSize: 15, fontWeight: "800", color: theme.foreground },
  cardSub: { fontSize: 13, color: theme.muted },
  statusLine: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusLineText: { flex: 1, fontSize: 13, fontWeight: "600" },
  rated: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratedText: { fontSize: 13, fontWeight: "700", color: theme.peachDark },

  qrButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: theme.primaryDark, borderRadius: 12, paddingVertical: 13 },
  qrButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  qrPanel: { alignItems: "center", gap: 10 },
  qrExpiry: { fontSize: 12, fontWeight: "600", color: theme.primaryDark, textAlign: "center" },
  qrExpiryExpired: { color: theme.destructive },
  qrCodeBox: { padding: 12, backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
  qrCodeBoxExpired: { opacity: 0.45 },
  codeValue: { fontSize: 11, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", color: theme.muted, textAlign: "center" },

  linkRow: { flexDirection: "row", alignSelf: "stretch" },
  cardFooter: { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 4, marginBottom: -6 },
  linkButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 },
  linkButtonText: { fontSize: 13, fontWeight: "600", color: theme.ink },
  dangerText: { color: theme.destructive },
  disabled: { opacity: 0.5 },
  rateButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: theme.peachBg, borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: theme.peach },
  rateButtonText: { color: theme.peachDark, fontWeight: "700", fontSize: 14 },

  emptyBox: { alignItems: "center", padding: 32, borderRadius: 16, borderWidth: 1, borderColor: theme.primaryBorder, borderStyle: "dashed", marginTop: 32, gap: 8, backgroundColor: theme.card },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.primaryBg, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: theme.foreground },
  emptySubtitle: { fontSize: 14, color: theme.muted },
  emptyButton: { backgroundColor: theme.primaryDark, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, marginTop: 8 },
  emptyButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  errorTitle: { fontSize: 16, fontWeight: "600", color: theme.foreground, textAlign: "center", marginTop: 12, marginHorizontal: 24 },
});