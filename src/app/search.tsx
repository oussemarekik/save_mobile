import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useLanguage } from "@/context/LanguageContext";
import { usersApi, offersApi, transformOfferToProduct, buildImageUrl } from "@/lib/api-client";
import { isOfferExpired } from "@/utils/offerUtils";
import { ScreenHeader } from "@/components/ScreenHeader";
import { BagCard } from "@/components/BagCard";
import { theme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";

const DEFAULT_PROFILE_IMAGE = require("@/assets/images/logoOnly.png");

export default function SearchScreen() {
  const { query: initialQuery } = useLocalSearchParams<{ query?: string }>();
  const { t } = useLanguage();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(initialQuery || "");
  const [businessResults, setBusinessResults] = useState<any[]>([]);
  const [offerResults, setOfferResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const performSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setBusinessResults([]);
      setOfferResults([]);
      return;
    }
    setLoading(true);
    try {
      const [businesses, offers] = await Promise.all([
        usersApi.search(trimmed),
        offersApi.getAll(),
      ]);
      const normalized = trimmed.toLowerCase();
      const filtered = (offers || []).filter((offer: any) => {
        if (isOfferExpired(offer.expirationDate) || (offer.quantity ?? 0) <= 0) return false;
        const title = String(offer.title || "").toLowerCase();
        const desc = String(offer.description || "").toLowerCase();
        const owner = String(offer.owner?.username || "").toLowerCase();
        return title.includes(normalized) || desc.includes(normalized) || owner.includes(normalized);
      });
      setBusinessResults(businesses || []);
      setOfferResults(filtered.map(transformOfferToProduct));
    } catch {
      setBusinessResults([]);
      setOfferResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => performSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  useEffect(() => {
    if (initialQuery) setSearchQuery(initialQuery);
  }, [initialQuery]);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("search.searchBusinesses") || "Search"}
        subtitle={t("search.findBusinessesText") || "Find restaurants and food providers near you"}
      />
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={theme.muted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t("nav.search_offers_businesses") || "Search offers or businesses..."}
          placeholderTextColor={theme.muted}
          autoFocus
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading && <ActivityIndicator color={theme.primary} style={{ marginVertical: 24 }} />}

        {businessResults.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t("search.businesses") || "Businesses"}</Text>
            {businessResults.map((b) => {
              const avatarUri = buildImageUrl(b.profileImage);
              return (
                <TouchableOpacity
                  key={b.id}
                  style={styles.businessCard}
                  onPress={() => router.push(`/business/${b.id}` as any)}
                >
                  <Image
                    source={avatarUri ? { uri: avatarUri } : DEFAULT_PROFILE_IMAGE}
                    style={styles.businessAvatar}
                    defaultSource={DEFAULT_PROFILE_IMAGE}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.businessName}>{b.username}</Text>
                    {b.location ? <Text style={styles.businessLoc}>{b.location}</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.muted} />
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {offerResults.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t("search.offers") || "Offers"}</Text>
            {offerResults.map((product) => (
              <BagCard key={product.id} product={product} store={product.store} />
            ))}
          </>
        )}

        {!loading && searchQuery.trim() && businessResults.length === 0 && offerResults.length === 0 && (
          <Text style={styles.empty}>{t("search.noResults") || "No results found"}</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.backgroundGradient },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: theme.foreground },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: theme.foreground, marginBottom: 4 },
  businessCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 8,
  },
  businessAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.primaryBg },
  businessName: { fontWeight: "700", fontSize: 15, color: theme.foreground },
  businessLoc: { fontSize: 12, color: theme.muted, marginTop: 2 },
  empty: { textAlign: "center", color: theme.muted, marginTop: 40 },
});
