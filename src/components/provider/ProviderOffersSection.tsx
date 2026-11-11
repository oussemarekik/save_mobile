import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { useLanguage } from "@/context/LanguageContext";
import { transformOfferToProduct } from "@/lib/api-client";
import { FALLBACK_IMAGE } from "@/lib/asset-uri";
import { pickupWindowLabel } from "@/lib/pickup-labels";
import { theme } from "@/lib/theme";
import { useDeleteOffer } from "@/hooks/use-delete-offer";
import { useUpdateOfferQuantity } from "@/hooks/use-update-offer-quantity";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { formatPrice } from "@/utils/formatPrice";
import { sanitizeErrorMessage } from "@/utils/errorUtils";
import {
  filterOffers,
  getOfferStats,
  getOfferStatus,
  type OfferFilter,
  type OfferStatus,
} from "@/utils/offerUtils";

const MAX_QUANTITY = 99;

const STATUS_COLORS: Record<OfferStatus, { background: string; text: string }> = {
  active: { background: theme.successBg, text: theme.primaryDark },
  sold_out: { background: theme.warningBg, text: theme.warningDark },
  expired: { background: theme.border, text: theme.muted },
};

/** The provider's offers: search, filters, and a card per offer with its quick actions. */
export function ProviderOffersSection({ offers, isLoading }: { offers: any[] | undefined; isLoading: boolean }) {
  const router = useRouter();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<OfferFilter>("all");
  const deleteOffer = useDeleteOffer();
  const updateQuantity = useUpdateOfferQuantity();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const allOffers = offers ?? [];
  const stats = getOfferStats(allOffers);
  const displayedOffers = filterOffers(allOffers, search, filter);

  const filters: { key: OfferFilter; label: string }[] = [
    { key: "all", label: `${t("provider.home.filter_all")} (${stats.total})` },
    { key: "active", label: `${t("provider.home.filter_active")} (${stats.active})` },
    { key: "expired", label: `${t("provider.home.filter_expired")} (${stats.expired})` },
    { key: "low_stock", label: `${t("provider.home.filter_low_stock")} (${stats.lowStock})` },
  ];

  const openCreate = () => router.push("/new-offer" as any);
  const openEdit = (offer: any, relaunch: boolean) =>
    router.push({
      pathname: "/edit-offer",
      params: { id: String(offer.id), relaunch: relaunch ? "1" : "0" },
    } as any);

  const changeQuantity = (offer: any, quantity: number) =>
    updateQuantity.mutateAsync({ id: Number(offer.id), quantity }).catch((error: unknown) => {
      Toast.show({
        type: "error",
        text1: t("provider_offers.quantity_failed"),
        text2: sanitizeErrorMessage(error, { defaultMessage: t("common.try_again") }),
      });
    });

  const promptDelete = (offer: any) => {
    confirm({
      title: t("offer_card.confirm_deletion"),
      message: t("offer_card.delete_message"),
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteOffer.mutateAsync(Number(offer.id));
          Toast.show({
            type: "success",
            text1: t("provider.home.offer_deleted"),
            text2: t("provider.dashboard.offer_deleted_desc"),
          });
        } catch (error: unknown) {
          Toast.show({
            type: "error",
            text1: t("provider.dashboard.delete_failed_title"),
            text2: sanitizeErrorMessage(error, { defaultMessage: t("provider.dashboard.delete_failed_desc") }),
          });
          // Keeps the dialog open so the provider can retry or cancel
          throw error;
        }
      },
    });
  };

  return (
    <>
      <TextInput
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
        placeholder={t("provider.home.search_placeholder")}
        placeholderTextColor={theme.mutedForeground}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {filters.map((item) => {
          const selected = filter === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => setFilter(item.key)}
              style={[styles.filterChip, selected && styles.filterChipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.sectionRow}>
        <Ionicons name="cube-outline" size={18} color={theme.primaryDark} />
        <Text style={styles.sectionTitle}>{t("provider.dashboard.my_offers", { count: allOffers.length })}</Text>
        <TouchableOpacity style={styles.publishButton} onPress={openCreate}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.publishButtonText}>{t("provider.dashboard.publish")}</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        [1, 2, 3].map((i) => <View key={i} style={styles.skeleton} />)
      ) : displayedOffers.length > 0 ? (
        displayedOffers.map((offer: any) => (
          <ProviderOfferCard
            key={offer.id}
            offer={offer}
            onEdit={() => openEdit(offer, false)}
            onRelaunch={() => openEdit(offer, true)}
            onDelete={() => promptDelete(offer)}
            onQuantityChange={(quantity) => changeQuantity(offer, quantity)}
          />
        ))
      ) : allOffers.length > 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>{t("provider.home.no_results")}</Text>
        </View>
      ) : (
        <View style={styles.emptyBox}>
          <Ionicons name="bag-handle-outline" size={48} color={theme.mutedForeground} />
          <Text style={styles.emptyText}>{t("provider.home.no_offers")}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={openCreate}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>{t("provider_offers.empty_cta")}</Text>
          </TouchableOpacity>
        </View>
      )}
      {confirmDialog}
    </>
  );
}

function ProviderOfferCard({
  offer,
  onEdit,
  onRelaunch,
  onDelete,
  onQuantityChange,
}: {
  offer: any;
  onEdit: () => void;
  onRelaunch: () => void;
  onDelete: () => void;
  onQuantityChange: (quantity: number) => Promise<unknown>;
}) {
  const { t, language } = useLanguage();
  const product = transformOfferToProduct(offer);
  const status = getOfferStatus(offer);
  const statusColors = STATUS_COLORS[status];
  const savedQuantity: number = offer.quantity ?? 0;
  // Taps add up here first, so quick ones are not lost while the server catches up
  const [draftQuantity, setDraftQuantity] = useState<number | null>(null);
  const latestQuantity = useRef<number | null>(null);
  const requestsInFlight = useRef(0);
  const quantity = draftQuantity ?? savedQuantity;
  const windowLabel = pickupWindowLabel(offer, t, language);
  const hasDiscount = !!offer.originalPrice && offer.originalPrice > offer.price;
  const [imageUri, setImageUri] = useState(() => product.imageUrl || FALLBACK_IMAGE);

  useEffect(() => {
    setImageUri(product.imageUrl || FALLBACK_IMAGE);
  }, [product.imageUrl]);

  const stepQuantity = (delta: number) => {
    const current = latestQuantity.current ?? savedQuantity;
    const next = Math.min(MAX_QUANTITY, Math.max(0, current + delta));
    if (next === current) return;

    latestQuantity.current = next;
    setDraftQuantity(next);
    requestsInFlight.current += 1;
    void onQuantityChange(next).finally(() => {
      requestsInFlight.current -= 1;
      if (requestsInFlight.current > 0) return;
      // Everything is sent: show what the server kept
      latestQuantity.current = null;
      setDraftQuantity(null);
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Image
          source={{ uri: imageUri }}
          style={styles.cardImage}
          onError={() => {
            if (imageUri !== FALLBACK_IMAGE) setImageUri(FALLBACK_IMAGE);
          }}
        />
        <View style={styles.cardInfo}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {offer.title}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.background }]}>
              <Text style={[styles.statusText, { color: statusColors.text }]}>
                {t(`provider_offers.status_${status}`)}
              </Text>
            </View>
          </View>
          {windowLabel ? (
            <View style={styles.cardMetaRow}>
              <Ionicons name="time-outline" size={14} color={theme.muted} />
              <Text style={styles.cardMeta}>{windowLabel}</Text>
            </View>
          ) : null}
          <View style={styles.cardPriceRow}>
            <Text style={styles.cardPrice}>{formatPrice(offer.price || 0)}</Text>
            {hasDiscount ? <Text style={styles.cardOriginalPrice}>{formatPrice(offer.originalPrice)}</Text> : null}
          </View>
        </View>
      </View>

      <View style={styles.cardBottom}>
        {status === "expired" ? (
          <TouchableOpacity style={styles.relaunchButton} onPress={onRelaunch}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.relaunchText}>{t("provider_offers.relaunch")}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.quantityControl}>
            <TouchableOpacity
              style={[styles.quantityButton, quantity <= 0 && styles.disabled]}
              onPress={() => stepQuantity(-1)}
              disabled={quantity <= 0}
              accessibilityRole="button"
              accessibilityLabel={t("provider_offers.decrease")}
            >
              <Ionicons name="remove" size={18} color={theme.primaryDark} />
            </TouchableOpacity>
            <Text style={styles.quantityText}>
              {t(quantity <= 1 ? "provider_offers.left_one" : "provider_offers.left_many", { count: quantity })}
            </Text>
            <TouchableOpacity
              style={[styles.quantityButton, quantity >= MAX_QUANTITY && styles.disabled]}
              onPress={() => stepQuantity(1)}
              disabled={quantity >= MAX_QUANTITY}
              accessibilityRole="button"
              accessibilityLabel={t("provider_offers.increase")}
            >
              <Ionicons name="add" size={18} color={theme.primaryDark} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={onEdit}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel={t("offer_card.edit")}
          >
            <Ionicons name="create-outline" size={18} color={theme.primaryDark} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDelete}
            style={[styles.iconButton, styles.deleteButton]}
            accessibilityRole="button"
            accessibilityLabel={t("offer_card.delete")}
          >
            <Ionicons name="trash-outline" size={18} color={theme.destructive} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.foreground,
  },
  filterScroll: { flexGrow: 0 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: theme.primaryDark, borderColor: theme.primaryDark },
  filterChipText: { fontSize: 12, fontWeight: "600", color: theme.muted },
  filterChipTextActive: { color: "#fff" },

  sectionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: theme.foreground },
  publishButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.primaryDark,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: "auto",
  },
  publishButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },

  skeleton: { height: 128, borderRadius: 12, backgroundColor: theme.border },
  emptyBox: {
    alignItems: "center",
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.primaryBorder,
    borderStyle: "dashed",
    gap: 12,
  },
  emptyText: { color: theme.muted, fontSize: 15, textAlign: "center" },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: theme.primaryDark,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  card: { borderRadius: 12, borderWidth: 1, borderColor: theme.border, overflow: "hidden", backgroundColor: theme.card },
  cardTop: { flexDirection: "row" },
  cardImage: { width: 96, height: 96, backgroundColor: theme.primaryBg },
  cardInfo: { flex: 1, padding: 12, gap: 6 },
  cardTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: theme.foreground },
  statusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },
  cardMetaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardMeta: { flex: 1, fontSize: 13, color: theme.muted },
  cardPriceRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  cardPrice: { fontSize: 15, fontWeight: "700", color: theme.primaryDark },
  cardOriginalPrice: { fontSize: 13, color: theme.mutedForeground, textDecorationLine: "line-through" },

  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  quantityControl: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.4 },
  quantityText: { fontSize: 14, fontWeight: "600", color: theme.foreground, flexShrink: 1 },
  relaunchButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.primaryDark,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  relaunchText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  cardActions: { flexDirection: "row", gap: 8 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: { backgroundColor: theme.destructiveBg },
});
