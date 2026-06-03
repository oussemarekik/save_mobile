import React from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-shop";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";

const PRIMARY = "#16a34a";

export default function Profile() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();
  const { data: orders } = useOrders();

  const collectedOrders = orders?.filter(
    (o: any) => o.status === "confirmed" && o.collectedAt
  ) || [];
  const mealsSaved = collectedOrders.length;
  const co2Saved = mealsSaved * 2.5;
  const moneySaved = collectedOrders.reduce((sum: number, order: any) => {
    const saved = (order.product?.originalPrice || 0) - (order.totalPrice || 0);
    return sum + saved;
  }, 0) / 100;

  const handleSignOut = () => {
    logout();
    Toast.show({ type: "success", text1: "Signed out", text2: "You've been signed out successfully" });
    router.replace("/");
  };

  // ── Not authenticated ──────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <View style={s.centered}>
        <Ionicons name="person-outline" size={64} color="#888" />
        <Text style={s.centeredTitle}>Sign in required</Text>
        <Text style={s.centeredSubtitle}>
          Sign in to view your profile and track your impact
        </Text>
        <TouchableOpacity
          style={s.primaryButton}
          onPress={() => router.push("/(auth)/signin")}
        >
          <Text style={s.primaryButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayName = user?.username || user?.email || "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={s.pageTitle}>Profile</Text>

      {/* User Info */}
      <View style={s.userCard}>
        <View style={s.avatarContainer}>
          {user?.profileImage ? (
            <Image
              source={{ uri: user.profileImage }}
              style={s.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={s.avatarInitials}>{initials}</Text>
          )}
        </View>
        <View style={s.userInfo}>
          <Text style={s.userName}>{displayName}</Text>
          <Text style={s.userEmail}>{user?.email}</Text>
        </View>
      </View>

      {/* Impact Stats */}
      <View style={s.statsRow}>
        <View style={[s.statCard, { backgroundColor: "#16a34a" }]}>
          <Ionicons name="leaf-outline" size={24} color="#fff" style={s.statIcon} />
          <Text style={s.statValue}>{mealsSaved}</Text>
          <Text style={s.statLabel}>Meals Saved</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: "#2563eb" }]}>
          <Ionicons name="trophy-outline" size={24} color="#fff" style={s.statIcon} />
          <Text style={s.statValue}>{co2Saved.toFixed(1)}</Text>
          <Text style={s.statLabel}>kg CO₂ Saved</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: "#ea580c" }]}>
          <Ionicons name="bag-outline" size={24} color="#fff" style={s.statIcon} />
          <Text style={s.statValue}>${moneySaved.toFixed(0)}</Text>
          <Text style={s.statLabel}>Money Saved</Text>
        </View>
      </View>

      {/* Pending provider banner */}
      {user?.role === "PENDING_PROVIDER" && (
        <View style={s.pendingBanner}>
          <View style={s.pendingIcon}>
            <Ionicons name="time-outline" size={20} color="#a16207" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.pendingTitle}>Pending to become a provider</Text>
            <Text style={s.pendingSubtitle}>Your request is being reviewed</Text>
          </View>
        </View>
      )}

      {/* Menu items */}
      <View style={s.menuGroup}>
        <MenuItem icon="person-outline" label="Account Details" />
        <MenuItem icon="card-outline" label="Payment Methods" />
        <MenuItem icon="settings-outline" label="Preferences" />
        <MenuItem icon="help-circle-outline" label="Help & Support" />

        {user?.role === "PROVIDER" && (
          <MenuItem
            icon="storefront-outline"
            label="Provider Dashboard"
            onPress={() => router.push("/(provider)/dashboard")}
          />
        )}

        {user?.role !== "PROVIDER" && user?.role !== "PENDING_PROVIDER" && (
          <MenuItem
            icon="storefront-outline"
            label="Become a Provider"
            onPress={() => router.push("/(auth)/ProviderSignup")}
          />
        )}
      </View>

      {/* Sign out */}
      <TouchableOpacity style={s.signOutButton} onPress={handleSignOut} activeOpacity={0.85}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={s.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={s.version}>Version 2.4.0 (Build 182)</Text>
    </ScrollView>
  );
}

// ─── Menu Item ─────────────────────────────────────────────────────────────────
function MenuItem({ icon, label, onPress }: {
  icon: string; label: string; onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={s.menuItem} onPress={onPress} activeOpacity={0.8}>
      <View style={s.menuItemLeft}>
        <View style={s.menuItemIcon}>
          <Ionicons name={icon as any} size={20} color="#555" />
        </View>
        <Text style={s.menuItemLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#aaa" />
    </TouchableOpacity>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { padding: 16, paddingTop: 40, paddingBottom: 100 },

  centered: {
    flex: 1, alignItems: "center", justifyContent: "center",
    padding: 24, gap: 12, backgroundColor: "#fff",
  },
  centeredTitle: { fontSize: 22, fontWeight: "800", color: "#111", textAlign: "center" },
  centeredSubtitle: { fontSize: 14, color: "#888", textAlign: "center", lineHeight: 20 },
  primaryButton: {
    backgroundColor: PRIMARY, borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 32, marginTop: 8,
  },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  pageTitle: { fontSize: 30, fontWeight: "800", color: "#111", marginBottom: 24 },

  // User card
  userCard: {
    flexDirection: "row", alignItems: "center", gap: 16,
    backgroundColor: "#f9f9f9", borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: "#e0e0e0", marginBottom: 20,
  },
  avatarContainer: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: 64, height: 64 },
  avatarInitials: { fontSize: 24, fontWeight: "800", color: PRIMARY },
  userInfo: { flex: 1 },
  userName: { fontSize: 20, fontWeight: "700", color: "#111", marginBottom: 2 },
  userEmail: { fontSize: 13, color: "#888" },

  // Stats
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 14, padding: 14 },
  statIcon: { marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: "800", color: "#fff", marginBottom: 2 },
  statLabel: { fontSize: 10, color: "rgba(255,255,255,0.9)", fontWeight: "500" },

  // Pending banner
  pendingBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fefce8", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#fde68a", marginBottom: 20,
  },
  pendingIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#fef9c3", alignItems: "center", justifyContent: "center",
  },
  pendingTitle: { fontSize: 13, fontWeight: "700", color: "#78350f" },
  pendingSubtitle: { fontSize: 11, color: "#a16207", marginTop: 2 },

  // Menu
  menuGroup: { gap: 8, marginBottom: 24 },
  menuItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 16, backgroundColor: "#f9f9f9", borderRadius: 14,
    borderWidth: 1, borderColor: "#e0e0e0",
  },
  menuItemLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  menuItemIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center",
  },
  menuItemLabel: { fontSize: 15, fontWeight: "500", color: "#111" },

  // Sign out
  signOutButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, padding: 16, borderRadius: 14,
    backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca",
  },
  signOutText: { fontSize: 15, fontWeight: "600", color: "#ef4444" },

  version: { fontSize: 12, color: "#aaa", textAlign: "center", marginTop: 32 },
});