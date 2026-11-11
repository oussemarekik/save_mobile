import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Modal, Image,
  KeyboardAvoidingView, Platform, Pressable, Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { offersApi, ordersApi, usersApi, transformOrder } from "@/lib/api-client";
import { providerOffersKey } from "@/lib/offer-queries";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { formatPrice } from "@/utils/formatPrice";
import { useLanguage } from "@/context/LanguageContext";
import { ProviderPendingBanner } from "@/components/provider/ProviderPendingBanner";
import { ProviderQRScannerModal } from "@/components/provider/ProviderQRScannerModal";
import { ProviderOffersSection } from "@/components/provider/ProviderOffersSection";
import { LocationAutocomplete, generateMapsLink, type SelectedPlace } from "@/components/LocationAutocomplete";
import { getOfferStats } from "@/utils/offerUtils";
import { useHeaderTopPadding, useTabScreenContentInsets } from "@/lib/screen-insets";
import { theme } from "@/lib/theme";

type Tab = "overview" | "orders" | "offers";

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function ProviderDashboard() { 
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const headerTop = useHeaderTopPadding();
  const contentInsets = useTabScreenContentInsets();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const params = useLocalSearchParams<{ tab?: string | string[] }>();

  // Other screens can open a given tab, e.g. the offers list after publishing
  useEffect(() => {
    const requested = Array.isArray(params.tab) ? params.tab[0] : params.tab;
    if (requested === "overview" || requested === "orders" || requested === "offers") {
      setActiveTab(requested);
      // Emptied (not removed) so asking for the same tab again later is seen as a change
      router.setParams({ tab: "" });
    }
  }, [params.tab, router]);

  const openCreateOffer = () => router.push("/new-offer" as any);

  const { data: offers, isLoading } = useQuery({
    queryKey: providerOffersKey(user?.id),
    queryFn: () => offersApi.getByOwner(user?.id || 0),
    enabled: !!user?.id && typeof user.id === "number",
  });

  const { data: orders } = useQuery({
    queryKey: ["/orders/provider"],
    queryFn: async () => {
      const backendOrders = await ordersApi.getForProvider();
      return backendOrders?.map(transformOrder).filter(Boolean) || [];
    },
    enabled: isAuthenticated,
  });

  const scanOrderMutation = useMutation({
    mutationFn: (token: string) => ordersApi.scan(token),
    onSuccess: (result: any) => {
      const scanned = result?.order;
      if (scanned?.id) {
        queryClient.setQueryData<any[]>(["/orders/provider"], (current) =>
          (current || []).map((order) =>
            order.id === scanned.id
              ? {
                  ...order,
                  status: scanned.status || "confirmed",
                  collectedAt: scanned.collectedAt || new Date().toISOString(),
                }
              : order
          )
        );
      }
      queryClient.invalidateQueries({ queryKey: ["/orders/provider"] });
      queryClient.invalidateQueries({ queryKey: ["/orders"] });
      Toast.show({
        type: "success",
        text1: t("provider.dashboard.order_found"),
        text2: t("provider.dashboard.order_found_desc"),
      });
      setShowQRScanner(false);
      setSelectedOrder(null);
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: error.message || t("qr_scanner.invalid_qr"),
      });
    },
  });

  const tabLabels: Record<Tab, string> = {
    overview: t("provider.dashboard.tab_overview"),
    orders: t("provider.dashboard.tab_orders"),
    offers: t("provider.dashboard.tab_offers"),
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centeredTitle}>{t("auth.signInRequired")}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push("/(auth)/signin")}>
          <Text style={styles.primaryButtonText}>{t("common.signIn")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (user?.role !== "PROVIDER" && user?.role !== "PENDING_PROVIDER") {
    return (
      <View style={styles.centered}>
        <Ionicons name="cube-outline" size={64} color={theme.muted} />
        <Text style={styles.centeredTitle}>{t("auth.providerRequired")}</Text>
        <Text style={styles.centeredSubtitle}>{t("auth.providerRequiredDesc")}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push("/(auth)/ProviderSignup")}>
          <Text style={styles.primaryButtonText}>{t("auth.createProviderAccount")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeOrders = orders?.filter((o: any) =>
    (o.status === "pending" || o.status === "confirmed") && !o.collectedAt
  ) || [];
  const pastOrders = orders?.filter((o: any) =>
    (o.status === "confirmed" && o.collectedAt) || o.status === "cancelled" || o.status === "expired"
  ) || [];
  const revenueOrders = orders?.filter((o: any) => o.status === "confirmed" && o.collectedAt) || [];
  const totalRevenue = revenueOrders.reduce((sum: number, o: any) => sum + (o.totalPrice || 0), 0);
  const completedOrders = pastOrders.length;
  const isPendingProvider = user?.role === "PENDING_PROVIDER";
  const offerStats = getOfferStats(offers || []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: headerTop }]}>
        <Text style={styles.headerTitle}>{t("provider.dashboard.title")}</Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreateOffer}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(["overview", "orders", "offers"] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tabLabels[tab]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, contentInsets]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Overview Tab ── */}
        {activeTab === "overview" && (
          <>
            {isPendingProvider && <ProviderPendingBanner />}
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              {[
                { icon: "cube-outline", color: theme.primaryDark, value: offerStats.active, label: t("provider.dashboard.active_offers") },
                { icon: "time-outline", color: theme.amber, value: activeOrders.length, label: t("provider.dashboard.pending_orders") },
                { icon: "cash-outline", color: theme.primary, value: formatPrice(totalRevenue), label: t("provider.dashboard.total_revenue") },
                { icon: "trending-up-outline", color: theme.blue, value: completedOrders, label: t("provider.dashboard.completed_orders") },
              ].map((stat) => (
                <View key={stat.label} style={styles.statCard}>
                  <View style={styles.statRow}>
                    <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                    <Text style={styles.statValue}>{stat.value}</Text>
                  </View>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>{t("provider.dashboard.quick_actions")}</Text>
            <View style={styles.statsGrid}>
              {[
                { icon: "add-circle-outline", label: t("provider.home.publish_offer"), sub: t("provider.dashboard.publish_offer_sub"), onPress: openCreateOffer },
                { icon: "qr-code-outline", label: t("provider.scan_qr"), sub: t("provider.dashboard.scan_qr_sub"), onPress: () => setShowQRScanner(true) },
                { icon: "settings-outline", label: t("provider.profile.edit_profile"), sub: t("provider.dashboard.edit_profile_sub"), onPress: () => setShowProfileEdit(true) },
              ].map((a) => (
                <TouchableOpacity key={a.label} style={styles.actionCard} onPress={a.onPress} activeOpacity={0.8}>
                  <Ionicons name={a.icon as any} size={24} color={theme.primaryDark} />
                  <Text style={styles.actionLabel}>{a.label}</Text>
                  <Text style={styles.actionSub}>{a.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Recent Pending Orders */}
            {activeOrders.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <Ionicons name="time-outline" size={18} color={theme.amber} />
                  <Text style={styles.sectionTitle}>{t("provider.dashboard.recent_pending_orders")}</Text>
                </View>
                {activeOrders.slice(0, 3).map((order: any) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onPress={() => setSelectedOrder(order)}
                    onScan={() => setShowQRScanner(true)}
                  />
                ))}
                {activeOrders.length > 3 && (
                  <TouchableOpacity onPress={() => setActiveTab("orders")}>
                    <Text style={styles.viewAll}>{t("provider.dashboard.view_all_orders")}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </>
        )}

        {/* ── Orders Tab ── */}
        {activeTab === "orders" && (
          <>
            {activeOrders.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <Ionicons name="time-outline" size={18} color={theme.amber} />
                  <Text style={styles.sectionTitle}>{t("provider.dashboard.pending_pickups", { count: activeOrders.length })}</Text>
                </View>
                {activeOrders.map((order: any) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onPress={() => setSelectedOrder(order)}
                    onScan={() => setShowQRScanner(true)}
                  />
                ))}
              </>
            )}

            {pastOrders.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={theme.primaryDark} />
                  <Text style={styles.sectionTitle}>{t("provider.dashboard.completed_orders_title", { count: pastOrders.length })}</Text>
                </View>
                {pastOrders.map((order: any) => (
                  <TouchableOpacity
                    key={order.id}
                    style={[styles.orderCard, { opacity: 0.75 }]}
                    onPress={() => setSelectedOrder(order)}
                  >
                    <View style={styles.orderCardRow}>
                      <View>
                        <Text style={styles.orderTitle}>{order.product?.name || order.offer?.title || t("provider.dashboard.order_default")}</Text>
                        <Text style={styles.orderSub}>
                          {order.collectedAt
                            ? t("provider.dashboard.collected", { date: new Date(order.collectedAt).toLocaleDateString() })
                            : order.status === "cancelled" ? t("provider.dashboard.cancelled") : t("common.expired")}
                        </Text>
                      </View>
                      <Text style={styles.orderPrice}>{formatPrice(order.totalPrice || 0)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {activeOrders.length === 0 && pastOrders.length === 0 && (
              <View style={styles.emptyBox}>
                <Ionicons name="bag-outline" size={48} color={theme.muted} />
                <Text style={styles.emptyText}>{t("provider.dashboard.no_orders")}</Text>
              </View>
            )}
          </>
        )}

        {/* ── Offers Tab ── */}
        {activeTab === "offers" && <ProviderOffersSection offers={offers} isLoading={isLoading} />}
      </ScrollView>

      {/* Modals */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onScan={() => {
            setSelectedOrder(null);
            setShowQRScanner(true);
          }}
        />
      )}
      <ProviderQRScannerModal
        visible={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={async (token) => {
          try {
            await scanOrderMutation.mutateAsync(token);
            return true;
          } catch {
            return false;
          }
        }}
      />
      {showProfileEdit && (
        <ProfileEditModal
          user={user}
          onClose={() => setShowProfileEdit(false)}
          onSuccess={() => { setShowProfileEdit(false); queryClient.invalidateQueries({ queryKey: ["/auth/get-user-by-token"] }); }}
        />
      )}
    </View>
  );
}

// ─── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({ order, onPress, onScan }: { order: any; onPress: () => void; onScan: () => void }) {
  const { t } = useLanguage();
  return (
    <TouchableOpacity style={styles.orderCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.orderCardRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderTitle}>{order.product?.name || order.offer?.title || t("provider.dashboard.order_default")}</Text>
          <Text style={styles.orderSub}>{t("provider.dashboard.pickup_code")}: <Text style={styles.mono}>{order.pickupCode || order.id}</Text></Text>
        </View>
        <Text style={styles.orderPrice}>{formatPrice(order.totalPrice || 0)}</Text>
      </View>
      <View style={styles.orderCardButtons}>
        <TouchableOpacity style={styles.confirmButton} onPress={onScan} activeOpacity={0.8}>
          <Text style={styles.confirmButtonText}>{t("provider.scan_qr") || "Scan QR"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.viewButton} onPress={onPress} activeOpacity={0.8}>
          <Ionicons name="eye-outline" size={18} color={theme.foreground} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Shared BottomSheet wrapper ────────────────────────────────────────────────
function BottomSheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const sheetMaxHeight = Math.round(Dimensions.get("window").height * 0.92);
  return (
    <Modal visible animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={sheet.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={sheet.backdrop} onPress={onClose} />
        <View style={[sheet.container, { maxHeight: sheetMaxHeight, paddingBottom: Math.max(insets.bottom, 12) }]}>
          <ScrollView
            style={{ maxHeight: sheetMaxHeight - Math.max(insets.bottom, 12) }}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            contentContainerStyle={sheet.scrollContent}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

// ─── Order Details Modal ───────────────────────────────────────────────────────
function OrderDetailsModal({ order, onClose, onScan }: { order: any; onClose: () => void; onScan: () => void }) {
  const { t } = useLanguage();
  const product = order.product || order.offer;
  const awaitingPickup = (order.status === "pending" || order.status === "confirmed") && !order.collectedAt;
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={sheet.overlay}>
        <View style={[sheet.container, { borderRadius: 20, margin: 16 }]}>
          <ModalHeader title={t("provider.dashboard.order_details")} onClose={onClose} />
          {product?.imageUrl && <Image source={{ uri: product.imageUrl }} style={styles.imagePreview} />}
          <Text style={styles.orderTitle}>{product?.name || order.offer?.title || t("provider.dashboard.order_default")}</Text>
          <Text style={[styles.orderSub, { marginBottom: 16 }]}>{product?.description || order.offer?.description}</Text>
          {[
            [t("provider.dashboard.quantity"), order.quantity],
            [t("provider.dashboard.price"), formatPrice(order.totalPrice || 0)],
            [t("provider.dashboard.status"), order.status],
            [t("provider.dashboard.pickup_code"), order.pickupCode || order.id],
            [t("provider.dashboard.order_date"), new Date(order.createdAt).toLocaleDateString()],
          ].map(([k, v]) => (
            <View key={k} style={styles.detailRow}>
              <Text style={styles.detailKey}>{k}</Text>
              <Text style={styles.detailValue}>{v}</Text>
            </View>
          ))}
          {awaitingPickup && (
            <TouchableOpacity style={[styles.primaryButton, { marginTop: 16 }]} onPress={onScan}>
              <Text style={styles.primaryButtonText}>{t("provider.scan_qr") || "Scan QR"}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Order Details Modal ───────────────────────────────────────────────────────
function ProfileEditModal({ user, onClose, onSuccess }: { user: any; onClose: () => void; onSuccess: () => void }) {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || "",
    location: user?.location || "",
    phoneNumber: user?.phoneNumber?.toString() || "",
    mapsLink: user?.mapsLink || "",
    latitude: (user?.latitude ?? null) as number | null,
    longitude: (user?.longitude ?? null) as number | null,
  });

  const handleLocationChange = (locationName: string, place?: SelectedPlace) => {
    setFormData((prev) => {
      const lat = place?.latitude ?? null;
      const lng = place?.longitude ?? null;
      const mapsLink = locationName.trim()
        ? generateMapsLink(locationName.trim(), prev.username, lat, lng, place?.placeId)
        : "";
      return {
        ...prev,
        location: locationName,
        latitude: lat,
        longitude: lng,
        mapsLink,
        username: !prev.username.trim() && place?.name ? place.name : prev.username,
      };
    });
  };

  const handleFieldChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const update: {
        username?: string;
        location?: string;
        phoneNumber?: number;
        mapsLink?: string;
        latitude?: number | null;
        longitude?: number | null;
      } = {};
      if (formData.username.trim()) update.username = formData.username.trim();
      if (formData.location.trim()) update.location = formData.location.trim();
      const phoneDigits = formData.phoneNumber.replace(/\D/g, "");
      if (phoneDigits) update.phoneNumber = parseInt(phoneDigits, 10);
      if (formData.mapsLink.trim()) update.mapsLink = formData.mapsLink.trim();
      if (formData.latitude != null) update.latitude = formData.latitude;
      if (formData.longitude != null) update.longitude = formData.longitude;
      await usersApi.updateProfile(update);
      Toast.show({
        type: "success",
        text1: t("provider.profile.edit_dialog.profile_updated"),
        text2: t("provider.dashboard.profile_updated_desc"),
      });
      onSuccess();
    } catch (e: any) {
      Toast.show({ type: "error", text1: t("common.error"), text2: e.message || t("provider.profile.edit_dialog.update_failed") });
    } finally { setIsLoading(false); }
  };

  return (
    <BottomSheet onClose={onClose}>
      <ModalHeader title={t("provider.dashboard.edit_business_profile")} onClose={onClose} />
      <Field label={t("provider.dashboard.business_name")}>
        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={16} color={theme.muted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={formData.username}
            onChangeText={(v) => handleFieldChange("username", v)}
            placeholder={t("provider.dashboard.business_name_placeholder")}
          />
        </View>
      </Field>
      <Field label={t("provider.dashboard.address")}>
        <LocationAutocomplete
          value={formData.location}
          onChange={handleLocationChange}
          placeholder={t("business_signup.location_search_placeholder") || t("provider.dashboard.address_placeholder")}
        />
      </Field>
      <Field label={t("provider.profile.edit_dialog.phone_number")}>
        <View style={styles.inputWrapper}>
          <Ionicons name="call-outline" size={16} color={theme.muted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={formData.phoneNumber}
            onChangeText={(v) => handleFieldChange("phoneNumber", v)}
            placeholder={t("provider.dashboard.phone_placeholder")}
            keyboardType="phone-pad"
          />
        </View>
      </Field>
      <ModalButtons onCancel={onClose} onSubmit={handleSubmit} isLoading={isLoading}
        submitLabel={t("offer_card.save_changes")} loadingLabel={t("offer_card.saving")} />
    </BottomSheet>
  );
}

// ─── Shared small components ───────────────────────────────────────────────────
function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <View style={styles.modalHeader}>
      <View>
        <Text style={styles.modalTitle}>{title}</Text>
        {subtitle && <Text style={styles.modalSubtitle}>{subtitle}</Text>}
      </View>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Ionicons name="close" size={20} color={theme.foreground} />
      </TouchableOpacity>
    </View>
  );
}

function ModalButtons({ onCancel, onSubmit, isLoading, submitLabel, loadingLabel }: {
  onCancel: () => void; onSubmit: () => void;
  isLoading: boolean; submitLabel: string; loadingLabel: string;
}) {
  const { t } = useLanguage();
  return (
    <View style={styles.modalButtons}>
      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.primaryButton, { flex: 1 }, isLoading && { opacity: 0.5 }]}
        onPress={onSubmit} disabled={isLoading}>
        {isLoading
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={styles.primaryButtonText}>{submitLabel}</Text>}
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.backgroundGradient },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12, backgroundColor: theme.backgroundGradient },
  centeredTitle: { fontSize: 22, fontWeight: "800", color: theme.foreground, textAlign: "center" },
  centeredSubtitle: { fontSize: 14, color: theme.muted, textAlign: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: theme.foreground },
  addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" },
  tabBar: { flexDirection: "row", backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
  tab: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: theme.primaryDark },
  tabText: { fontSize: 14, fontWeight: "500", color: theme.muted },
  tabTextActive: { color: theme.primaryDark },
  scrollContent: { paddingHorizontal: 16, gap: 16 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { width: "47%", backgroundColor: theme.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.border },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: "800", color: theme.foreground },
  statLabel: { fontSize: 11, color: theme.muted },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: theme.foreground },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionCard: { width: "47%", backgroundColor: theme.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.border, gap: 6 },
  actionLabel: { fontSize: 13, fontWeight: "700", color: theme.foreground },
  actionSub: { fontSize: 11, color: theme.muted },
  orderCard: { backgroundColor: theme.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.border },
  orderCardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  orderTitle: { fontSize: 15, fontWeight: "700", color: theme.foreground },
  orderSub: { fontSize: 13, color: theme.muted, marginTop: 2 },
  orderPrice: { fontSize: 14, fontWeight: "700", color: theme.primary },
  orderCardButtons: { flexDirection: "row", gap: 8 },
  confirmButton: { flex: 1, backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  confirmButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  viewButton: { paddingHorizontal: 14, borderRadius: 10, backgroundColor: theme.primaryBg, alignItems: "center", justifyContent: "center" },
  mono: { fontFamily: "monospace", fontWeight: "700" },
  viewAll: { color: theme.primaryDark, fontWeight: "600", textAlign: "center", marginTop: 8 },
  emptyBox: { alignItems: "center", padding: 32, borderRadius: 12, borderWidth: 1, borderColor: theme.border, borderStyle: "dashed", gap: 12 },
  emptyText: { color: theme.muted, fontSize: 15 },
  primaryButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20 },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: "800", color: theme.foreground },
  modalSubtitle: { fontSize: 13, color: theme.muted, marginTop: 2 },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 8, paddingBottom: 24 },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.primaryBg, alignItems: "center", justifyContent: "center" },
  cancelButton: { flex: 1, borderRadius: 12, backgroundColor: theme.primaryBg, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center", paddingVertical: 14 },
  cancelButtonText: { fontSize: 15, fontWeight: "500", color: theme.foreground },
  input: { backgroundColor: theme.primaryBg, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.foreground },
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: theme.primaryBg, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 14 },
  label: { fontSize: 13, fontWeight: "500", color: theme.foreground, marginBottom: 6 },
  imagePreview: { width: "100%", height: 160, borderRadius: 12, marginBottom: 8, resizeMode: "cover" },
  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  detailKey: { color: theme.muted, fontSize: 14 },
  detailValue: { fontWeight: "600", fontSize: 14, color: theme.foreground },
  hint: { fontSize: 12, color: theme.muted, marginBottom: 12 },
});

const sheet = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  backdrop: { flex: 1 },
  container: {
    backgroundColor: theme.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: "100%",
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 16,
  },
});