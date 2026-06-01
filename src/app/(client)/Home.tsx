import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { useStores, useProducts } from "@/hooks/use-shop";
import { BagCard } from "@/components/BagCard";
import { useAuth } from "@/hooks/use-auth";
import { Ionicons } from "@expo/vector-icons";

const CATEGORIES = ["Meals", "Bread & Pastries", "Groceries", "Other"];

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: stores, isLoading: loadingStores } = useStores();
  const { data: products, isLoading: loadingProducts } = useProducts();

  const featuredProducts = products?.filter((p:any) => p.quantity > 0).slice(0, 5) || [];

  // ─── Unauthenticated welcome screen ───────────────────────────────────────
  if (!authLoading && !isAuthenticated) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Hero */}
        <View style={styles.heroCenter}>
          <View style={styles.leafCircle}>
            <Ionicons name="leaf-outline" size={40} color="#16a34a" />
          </View>
          <Text style={styles.welcomeTitle}>Welcome to Food Saver</Text>
          <Text style={styles.welcomeSubtitle}>
            Save delicious food from going to waste. Help the planet while saving money.
          </Text>
        </View>

        {/* CTA Buttons */}
        <View style={styles.ctaGroup}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/(auth)/signin")}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Sign In</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push("/(auth)/signup")}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>

        {/* Feature cards */}
        <View style={styles.featureList}>
          {[
            {
              icon: "leaf-outline",
              bg: "#dcfce7",
              color: "#16a34a",
              title: "Save the Planet",
              desc: "Reduce food waste and help fight climate change by rescuing unsold food from local businesses.",
            },
            {
              icon: "cash-outline",
              bg: "#ffedd5",
              color: "#ea580c",
              title: "Save Money",
              desc: "Get delicious food at amazing prices. Save up to 70% on quality meals, pastries, and groceries.",
            },
            {
              icon: "heart-outline",
              bg: "#fce7f3",
              color: "#db2777",
              title: "Support Local",
              desc: "Help local businesses reduce waste while discovering amazing food from your neighborhood.",
            },
          ].map((f) => (
            <View key={f.title} style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: f.bg }]}>
                <Ionicons name={f.icon as any} size={24} color={f.color} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Provider CTA */}
        <View style={styles.providerCard}>
          <Ionicons name="storefront-outline" size={32} color="#16a34a" />
          <Text style={styles.providerTitle}>Are you a business?</Text>
          <Text style={styles.providerDesc}>
            Join Food Saver and reduce food waste while earning extra revenue.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/(auth)/ProviderSignup")}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Become a Provider</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ─── Loading skeleton ──────────────────────────────────────────────────────
  if (authLoading || loadingStores || loadingProducts) {
    return (
      <View style={styles.skeletonContainer}>
        <View style={[styles.skeleton, { width: "33%", height: 24, marginBottom: 16 }]} />
        <View style={[styles.skeleton, { height: 160, marginBottom: 24 }]} />
        <View style={[styles.skeleton, { width: "25%", height: 20, marginBottom: 12 }]} />
        <View style={{ flexDirection: "row", gap: 16 }}>
          <View style={[styles.skeleton, { width: 240, height: 240 }]} />
          <View style={[styles.skeleton, { width: 240, height: 240 }]} />
        </View>
      </View>
    );
  }

  // ─── Authenticated home ────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.locationRow}>
          <Ionicons name="location" size={18} color="#16a34a" />
          <Text style={styles.locationText}>San Francisco, CA</Text>
          <Ionicons name="chevron-forward" size={16} color="#888" />
        </TouchableOpacity>

        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={16} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for bread, pizza, etc..."
            placeholderTextColor="#888"
          />
          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="options-outline" size={16} color="#111" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero banner */}
      <View style={styles.heroBanner}>
        <View style={styles.heroBannerDecor1} />
        <View style={styles.heroBannerDecor2} />
        <Text style={styles.heroBannerTitle}>Save food, Save money</Text>
        <Text style={styles.heroBannerSubtitle}>
          Help the planet by rescuing delicious unsold food from local shops.
        </Text>
        <TouchableOpacity
          style={styles.heroBannerButton}
          onPress={() => router.push("/(client)/Browse")}
          activeOpacity={0.85}
        >
          <Text style={styles.heroBannerButtonText}>Browse Bags</Text>
        </TouchableOpacity>
      </View>

      {/* Recommended horizontal scroll */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended for you</Text>
          <TouchableOpacity onPress={() => router.push("/(client)/Browse")}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {featuredProducts.map((product) => (
            <View key={product.id} style={styles.horizontalCard}>
              <BagCard product={product} store={product.store} />
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat, i) => (
            <TouchableOpacity key={cat} style={styles.categoryCard} activeOpacity={0.8}>
              <Text style={styles.categoryText}>{cat}</Text>
              <View
                style={[
                  styles.categoryIcon,
                  { backgroundColor: i % 2 === 0 ? "#ffedd5" : "#dcfce7" },
                ]}
              >
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={i % 2 === 0 ? "#ea580c" : "#16a34a"}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* New on the app */}
      <View style={[styles.section, { paddingBottom: 100 }]}>
        <Text style={styles.sectionTitle}>New on the app</Text>
        <View style={{ gap: 16 }}>
          {products?.slice(0, 3).map((product) => (
            <BagCard key={product.id} product={product} store={product.store} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const PRIMARY = "#16a34a";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 32, paddingBottom: 80 },

  // Welcome screen
  heroCenter: { alignItems: "center", marginBottom: 32 },
  leafCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#dcfce7", alignItems: "center",
    justifyContent: "center", marginBottom: 20,
  },
  welcomeTitle: { fontSize: 32, fontWeight: "800", color: "#111", textAlign: "center", marginBottom: 12 },
  welcomeSubtitle: { fontSize: 16, color: "#888", textAlign: "center", lineHeight: 24 },

  ctaGroup: { gap: 12, marginBottom: 32 },
  primaryButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: PRIMARY, borderRadius: 12,
    paddingVertical: 16,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  primaryButtonText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  secondaryButton: {
    paddingVertical: 16, borderRadius: 12,
    backgroundColor: "#f5f5f5", borderWidth: 1,
    borderColor: "#e0e0e0", alignItems: "center",
  },
  secondaryButtonText: { fontSize: 15, fontWeight: "500", color: "#111" },

  featureList: { gap: 16, marginBottom: 32 },
  featureCard: {
    flexDirection: "row", gap: 16, backgroundColor: "#fff",
    borderRadius: 16, padding: 20, borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000", shadowOpacity: 0.04,
    shadowRadius: 4, elevation: 1,
  },
  featureIcon: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 4 },
  featureDesc: { fontSize: 13, color: "#888", lineHeight: 20 },

  providerCard: {
    backgroundColor: "#f0fdf4", borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: "#bbf7d0", alignItems: "center", gap: 8,
  },
  providerTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  providerDesc: { fontSize: 13, color: "#888", textAlign: "center", marginBottom: 8 },

  // Skeleton
  skeletonContainer: { flex: 1, padding: 16, paddingTop: 32 },
  skeleton: { borderRadius: 12, backgroundColor: "#f0f0f0", width: "100%" },

  // Authenticated home
  header: {
    paddingHorizontal: 16, paddingTop: 16,
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  locationRow: {
    flexDirection: "row", alignItems: "center",
    gap: 4, marginBottom: 12,
  },
  locationText: { fontWeight: "700", color: "#111", fontSize: 15 },
  searchWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#f5f5f5", borderRadius: 12, paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: "#111" },
  filterBtn: {
    padding: 6, borderRadius: 8,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0e0e0",
  },

  heroBanner: {
    margin: 16, borderRadius: 24, padding: 24,
    backgroundColor: PRIMARY, overflow: "hidden",
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  heroBannerDecor1: {
    position: "absolute", top: -40, right: -40,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  heroBannerDecor2: {
    position: "absolute", bottom: -30, left: -30,
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  heroBannerTitle: { fontSize: 22, fontWeight: "800", color: "#fff", marginBottom: 8 },
  heroBannerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.9)", marginBottom: 20, maxWidth: "80%" },
  heroBannerButton: {
    alignSelf: "flex-start", backgroundColor: "#fff",
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 12,
  },
  heroBannerButtonText: { color: PRIMARY, fontWeight: "700", fontSize: 14 },

  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 12,
  },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: "#111" },
  seeAll: { fontSize: 14, fontWeight: "600", color: PRIMARY },

  horizontalList: { gap: 16, paddingRight: 16 },
  horizontalCard: { width: 280 },

  categoryGrid: {
    flexDirection: "row", flexWrap: "wrap",
    gap: 12, marginTop: 12,
  },
  categoryCard: {
    width: "47%", flexDirection: "row",
    alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: "#e0e0e0",
  },
  categoryText: { fontSize: 13, fontWeight: "600", color: "#111" },
  categoryIcon: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
});