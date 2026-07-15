import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Dimensions,
} from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi, transformOrder } from "@/lib/api-client";
import { useToast } from "@/lib/toast";
import { formatPrice } from "@/utils/formatPrice";
import { useRouter } from "expo-router";
import { useLanguage } from "@/context/LanguageContext";
import { ProviderPendingBanner } from "@/components/provider/ProviderPendingBanner";
import { ProviderQRScannerModal } from "@/components/provider/ProviderQRScannerModal";

import {
  Clock,
  CheckCircle2,
  X,
  ShoppingBag,
  ArrowLeft,
  User,
  Package,
  DollarSign,
  QrCode,
} from "lucide-react-native";

type OrderFilter = "all" | "pending" | "confirmed" | "cancelled" | "expired";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// ---------------------------------------------------------------------------
// Theme — update these to match your app's color system
// ---------------------------------------------------------------------------
const theme = {
  background: "#ffffff",
  card: "#f9f9f9",
  secondary: "#f1f5f9",
  border: "#e2e8f0",
  primary: "#22c55e",
  primaryForeground: "#ffffff",
  muted: "#94a3b8",
  destructive: "#ef4444",
  text: "#0f172a",
  textMuted: "#64748b",
  warning: "#f59e0b",
  warningBg: "#fef3c7",
  warningText: "#92400e",
  successBg: "#d1fae5",
  successText: "#065f46",
  errorBg: "#fee2e2",
  errorText: "#991b1b",
};

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------
function statusStyle(status: string) {
  switch (status) {
    case "pending":
      return { bg: theme.warningBg, text: theme.warningText };
    case "confirmed":
      return { bg: theme.successBg, text: theme.successText };
    case "cancelled":
      return { bg: theme.errorBg, text: theme.errorText };
    default:
      return { bg: theme.secondary, text: theme.textMuted };
  }
}

// ---------------------------------------------------------------------------
// ProviderOrders (main screen)
// ---------------------------------------------------------------------------
export default function ProviderOrders() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showQRScanner, setShowQRScanner] = useState(false);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["/orders/provider"],
    queryFn: async () => {
      const backendOrders = await ordersApi.getForProvider();
      return backendOrders?.map(transformOrder).filter(Boolean) || [];
    },
    enabled: isAuthenticated,
  });

  const confirmOrderMutation = useMutation({
    mutationFn: (id: number) => ordersApi.confirm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/orders"] });
      toast({ title: t("orders.confirmed"), description: t("provider.dashboard.order_confirmed_desc") });
      setSelectedOrder(null);
    },
  });

  const scanOrderMutation = useMutation({
    mutationFn: (qrCodeToken: string) => ordersApi.scan(qrCodeToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/orders"] });
      toast({ title: t("provider.dashboard.order_found"), description: t("provider.dashboard.order_found_desc") });
      setShowQRScanner(false);
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("qr_scanner.invalid_qr"),
      });
    },
  });

  if (!isAuthenticated) {
    return (
      <View style={styles.centered}>
        <Text style={styles.heading}>{t("auth.signInRequired")}</Text>
      </View>
    );
  }

  if (user?.role !== "PROVIDER" && user?.role !== "PENDING_PROVIDER") {
    return (
      <View style={styles.centered}>
        <ShoppingBag color={theme.muted} size={64} />
        <Text style={[styles.heading, { marginTop: 16 }]}>{t("auth.providerRequired")}</Text>
      </View>
    );
  }

  const pendingOrders = orders?.filter((o: any) => o.status === "pending") || [];
  const confirmedOrders = orders?.filter((o: any) => o.status === "confirmed") || [];
  const cancelledOrders = orders?.filter((o: any) => o.status === "cancelled") || [];
  const expiredOrders = orders?.filter((o: any) => o.status === "expired") || [];

  const filteredOrders = (orders || []).filter((order: any) => {
    if (filter !== "all") {
      if (filter === "expired") {
        const isExpired =
          order.status === "expired" ||
          (order.status === "pending" &&
            order.offer?.pickupEndTime &&
            new Date(order.offer.pickupEndTime).getTime() <= Date.now());
        if (!isExpired) return false;
      } else if (order.status !== filter) {
        return false;
      }
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(order.id).includes(q) ||
      order.user?.username?.toLowerCase().includes(q) ||
      order.user?.email?.toLowerCase().includes(q) ||
      String(order.user?.phoneNumber || "").includes(q) ||
      order.offer?.title?.toLowerCase().includes(q) ||
      order.product?.name?.toLowerCase().includes(q)
    );
  });

  const isPendingProvider = user?.role === "PENDING_PROVIDER";

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push("/(provider)/dashboard")}
          >
            <ArrowLeft color={theme.text} size={20} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Orders</Text>
        </View>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: theme.primary }]}
          onPress={() => setShowQRScanner(true)}
        >
          <QrCode color={theme.primaryForeground} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isPendingProvider && <ProviderPendingBanner />}

        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t("provider.search_placeholder") || "Search orders..."}
          placeholderTextColor={theme.muted}
        />

        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
          {(
            [
              { key: "all" as OrderFilter, label: `${t("provider.tab_all") || "All"} (${orders?.length || 0})` },
              { key: "pending" as OrderFilter, label: `${t("provider.tab_pending") || "Pending"} (${pendingOrders.length})` },
              { key: "confirmed" as OrderFilter, label: `${t("provider.tab_confirmed") || "Confirmed"} (${confirmedOrders.length})` },
              { key: "cancelled" as OrderFilter, label: `${t("provider.status.cancelled") || "Cancelled"} (${cancelledOrders.length})` },
              { key: "expired" as OrderFilter, label: `${t("provider.status.expired") || "Expired"} (${expiredOrders.length})` },
            ]
          ).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
              onPress={() => setFilter(tab.key)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filter === tab.key && styles.filterTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
          </View>
        </ScrollView>

        {/* Orders List */}
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonCard} />
            ))}
          </>
        ) : filteredOrders && filteredOrders.length > 0 ? (
          filteredOrders.map((order: any) => (
            <OrderCard
              key={order.id}
              order={order}
              onPress={() => setSelectedOrder(order)}
              onConfirm={() => confirmOrderMutation.mutate(order.id)}
              confirming={confirmOrderMutation.isPending}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <ShoppingBag color={theme.muted} size={48} />
            <Text style={styles.emptyText}>No orders found</Text>
          </View>
        )}
      </ScrollView>

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onConfirm={(id) => confirmOrderMutation.mutate(id)}
        />
      )}

      {/* QR Scanner Modal */}
      <ProviderQRScannerModal
        visible={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={(token) => scanOrderMutation.mutate(token)}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// OrderCard
// ---------------------------------------------------------------------------
function OrderCard({
  order,
  onPress,
  onConfirm,
  confirming,
}: {
  order: any;
  onPress: () => void;
  onConfirm: () => void;
  confirming: boolean;
}) {
  const badge = statusStyle(order.status);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Client row */}
      <View style={styles.clientRow}>
        <View style={styles.clientAvatar}>
          <User color={theme.primary} size={20} />
        </View>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName} numberOfLines={1}>
            {order.user?.username ||
              order.user?.email ||
              `Client #${order.userId || order.id}`}
          </Text>
          {order.user?.phoneNumber && (
            <Text style={styles.clientPhone}>{order.user.phoneNumber}</Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.statusText, { color: badge.text }]}>{order.status}</Text>
        </View>
      </View>

      {/* Product row */}
      <View style={styles.productRow}>
        {order.product?.imageUrl && (
          <Image
            source={{ uri: order.product.imageUrl }}
            style={styles.productImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {order.product?.name || order.offer?.title || "Order"}
          </Text>
          <View style={styles.metaRow}>
            <Package color={theme.textMuted} size={12} />
            <Text style={styles.metaText}>Qty: {order.quantity}</Text>
            <DollarSign color={theme.textMuted} size={12} />
            <Text style={[styles.metaText, { color: theme.text, fontWeight: "600" }]}>
              {formatPrice(order.totalPrice || 0)}
            </Text>
          </View>
          {order.product?.pickupStart && order.product?.pickupEnd && (
            <View style={styles.metaRow}>
              <Clock color={theme.textMuted} size={12} />
              <Text style={styles.metaText}>
                {order.product.pickupStart} – {order.product.pickupEnd}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        {order.status !== "cancelled" && (
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.pickupCode} numberOfLines={1}>
              <Text style={styles.pickupCodeLabel}>Code  </Text>
              {order.pickupCode || order.qrCodeToken || order.id}
            </Text>
          </View>
        )}
        {order.status === "pending" && (
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={(e) => {
              onConfirm();
            }}
            disabled={confirming}
          >
            <Text style={styles.confirmBtnText}>Confirm</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// OrderDetailsModal
// ---------------------------------------------------------------------------
function OrderDetailsModal({
  order,
  onClose,
  onConfirm,
}: {
  order: any;
  onClose: () => void;
  onConfirm: (id: number) => void;
}) {
  const product = order.product || order.offer;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Order Details</Text>
            <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
              <X color={theme.text} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {product?.imageUrl && (
              <Image
                source={{ uri: product.imageUrl }}
                style={styles.detailImage}
                resizeMode="cover"
              />
            )}

            <Text style={styles.detailProductName}>
              {product?.name || order.offer?.title || "Order"}
            </Text>
            {(product?.description || order.offer?.description) && (
              <Text style={styles.detailDescription}>
                {product?.description || order.offer?.description}
              </Text>
            )}

            <View style={styles.detailRows}>
              <DetailRow label="Quantity" value={String(order.quantity)} />
              <DetailRow
                label="Price"
                value={formatPrice(order.totalPrice || 0)}
              />
              <DetailRow
                label="Status"
                value={order.status}
                valueStyle={{
                  color:
                    order.status === "confirmed"
                      ? theme.primary
                      : order.status === "pending"
                      ? theme.warning
                      : theme.textMuted,
                  textTransform: "capitalize",
                }}
              />
              <DetailRow
                label="Pickup Code"
                value={String(order.pickupCode || order.qrCodeToken || order.id)}
                valueStyle={{ fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", fontWeight: "700" }}
              />
              {order.createdAt && (
                <DetailRow
                  label="Order Date"
                  value={new Date(order.createdAt).toLocaleDateString()}
                />
              )}
              {product?.pickupStart && product?.pickupEnd && (
                <DetailRow
                  label="Pickup Time"
                  value={`${product.pickupStart} – ${product.pickupEnd}`}
                />
              )}
            </View>

            {order.status === "pending" && (
              <TouchableOpacity
                style={[styles.btnPrimary, { marginTop: 16 }]}
                onPress={() => onConfirm(order.id)}
              >
                <Text style={styles.btnPrimaryText}>Confirm Pickup</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 8 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: any;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueStyle]}>{value}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.background,
  },
  centered: {
    flex: 1,
    backgroundColor: theme.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  heading: {
    color: theme.text,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 16,
    paddingBottom: 16,
    backgroundColor: theme.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  headerTitle: {
    color: theme.text,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.secondary,
    alignItems: "center",
    justifyContent: "center",
  },

  // Scroll
  scrollContent: {
    padding: 16,
    paddingBottom: 96,
    gap: 12,
  },
  searchInput: {
    backgroundColor: theme.secondary,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.text,
  },

  // Filter tabs
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
    paddingRight: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.secondary,
    alignItems: "center",
  },
  filterTabActive: {
    backgroundColor: theme.primary,
  },
  filterTabText: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: "500",
  },
  filterTabTextActive: {
    color: theme.primaryForeground,
    fontWeight: "700",
  },

  // Skeleton
  skeletonCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    height: 128,
    opacity: 0.5,
    marginBottom: 12,
  },

  // Empty
  emptyState: {
    borderWidth: 1,
    borderColor: theme.border,
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    marginTop: 8,
  },
  emptyText: {
    color: theme.textMuted,
    fontSize: 14,
    marginTop: 12,
  },

  // Order card
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden",
    marginBottom: 12,
  },
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 10,
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${theme.primary}1a`,
    alignItems: "center",
    justifyContent: "center",
  },
  clientInfo: {
    flex: 1,
    minWidth: 0,
  },
  clientName: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "600",
  },
  clientPhone: {
    color: theme.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  productRow: {
    flexDirection: "row",
    padding: 12,
    gap: 10,
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: theme.secondary,
  },
  productInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  productName: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    color: theme.textMuted,
    fontSize: 12,
    marginRight: 8,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: `${theme.border}88`,
    backgroundColor: `${theme.secondary}66`,
  },
  pickupCode: {
    color: theme.text,
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontWeight: "700",
  },
  pickupCodeLabel: {
    color: theme.textMuted,
    fontWeight: "400",
    fontFamily: undefined,
  },
  confirmBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: theme.primary,
  },
  confirmBtnText: {
    color: theme.primaryForeground,
    fontSize: 12,
    fontWeight: "700",
  },

  // Modal shared
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: theme.background,
    borderRadius: 24,
    width: "100%",
    maxWidth: 420,
    maxHeight: SCREEN_HEIGHT * 0.85,
    overflow: "hidden",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    color: theme.text,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  // Mode toggle
  modeToggle: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingBottom: 16,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.secondary,
  },
  modeBtnActive: {
    backgroundColor: theme.primary,
  },
  modeBtnText: {
    color: theme.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  modeBtnTextActive: {
    color: theme.primaryForeground,
  },

  // Camera placeholder
  cameraPlaceholder: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  cameraBox: {
    width: 220,
    height: 220,
    position: "relative",
    backgroundColor: `${theme.secondary}44`,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraPermission: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 24,
  },
  cameraCornerTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 28,
    height: 28,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: theme.primary,
    borderTopLeftRadius: 6,
  },
  cameraCornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 28,
    height: 28,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: theme.primary,
    borderTopRightRadius: 6,
  },
  cameraCornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 28,
    height: 28,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: theme.primary,
    borderBottomLeftRadius: 6,
  },
  cameraCornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: theme.primary,
    borderBottomRightRadius: 6,
  },
  cameraHint: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  cameraSubHint: {
    color: theme.textMuted,
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 16,
  },

  // Manual form
  manualForm: {
    gap: 8,
  },
  label: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 2,
  },
  input: {
    backgroundColor: theme.secondary,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: theme.text,
    fontSize: 15,
  },
  inputHint: {
    color: theme.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  modalFooterRow: {
    flexDirection: "row",
    marginTop: 8,
  },

  // Buttons
  btnPrimary: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: {
    color: theme.primaryForeground,
    fontWeight: "700",
    fontSize: 15,
  },
  btnSecondary: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: theme.secondary,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondaryText: {
    color: theme.text,
    fontWeight: "500",
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.45,
  },

  // Order details modal
  detailImage: {
    width: "100%",
    height: 180,
    borderRadius: 14,
    marginBottom: 14,
    backgroundColor: theme.secondary,
  },
  detailProductName: {
    color: theme.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  detailDescription: {
    color: theme.textMuted,
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  detailRows: {
    gap: 0,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  detailLabel: {
    color: theme.textMuted,
    fontSize: 14,
  },
  detailValue: {
    color: theme.text,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "right",
    maxWidth: "55%",
  },

  // Misc
  warning: {
    color: theme.warning,
  },
});