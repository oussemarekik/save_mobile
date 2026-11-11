import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useProducts, useFavorites } from "@/hooks/use-shop";
import { BagCard } from "@/components/BagCard";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "@/context/LanguageContext";
import { useHeaderTopPadding, useTabScreenContentInsets } from "@/lib/screen-insets";
import { isOfferExpired } from "@/utils/offerUtils";

const FILTERS = ["all", "available", "favorites"] as const;
type Filter = typeof FILTERS[number];

export default function Browse() {
  const { t } = useLanguage();
  const { data: products, isLoading, isError, refetch } = useProducts();
  const { data: favorites } = useFavorites();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const headerTop = useHeaderTopPadding();
  const contentInsets = useTabScreenContentInsets();

  const filterLabel = (f: Filter) => {
    if (f === "all") return t("offers.filter_all") || "All";
    if (f === "available") return t("offers.filter_available") || "Available";
    return t("offers.filter_favorites") || "Favorites";
  };

  const filteredProducts = products?.filter((p: any) => {
    if (isOfferExpired(p.expirationDate)) return false;

    const matchesSearch =
      !search.trim() ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.store?.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === "available") return p.quantity > 0;
    if (filter === "favorites") {
      const providerId = p.storeId || p.store?.id;
      return !!providerId && favorites?.includes(providerId);
    }
    return true;
  });

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="search-outline" size={32} color="#888" />
      </View>
      <Text style={styles.emptyTitle}>{t("offers.no_results") || "No bags found"}</Text>
      <Text style={styles.emptySubtitle}>
        {t("offers.try_adjusting_filters") || "Try adjusting your filters or search area."}
      </Text>
    </View>
  );

  const renderSkeleton = () => (
    <View style={styles.skeletonGrid}>
      {Array(4).fill(0).map((_, i) => (
        <View key={i} style={styles.skeleton} />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Sticky Header */}
      <View style={[styles.stickyHeader, { paddingTop: headerTop }]}>
        <Text style={styles.title}>{t("nav.view_offers") || "Browse"}</Text>

        {/* Search Bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchWrapper}>
            <Ionicons name="search-outline" size={18} color="#888" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t("offers.search_placeholder") || "Search offers..."}
              placeholderTextColor="#888"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {/* Filter chips row */}
        <View style={styles.filtersRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.chip, filter === f && styles.chipActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
                {filterLabel(f)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        renderSkeleton()
      ) : isError ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={32} color="#ef4444" />
          <Text style={styles.emptyTitle}>{t("offers.error_fetch") || "Unable to load offers"}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>{t("common.try_again") || "Try Again"}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <BagCard product={item} store={item.store} />
          )}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[styles.listContent, contentInsets]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  stickyHeader: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111",
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111",
  },
  filtersRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  chipActive: {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#888",
  },
  chipTextActive: {
    color: "#fff",
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  skeletonGrid: {
    padding: 16,
    gap: 16,
  },
  skeleton: {
    height: 200,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 8,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: "#16a34a",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
