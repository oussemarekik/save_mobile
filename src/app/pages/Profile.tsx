import React from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Image, ActivityIndicator, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-shop";
import { useLanguage } from "@/context/LanguageContext";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { theme } from "@/lib/theme";
import { formatPriceValue } from "@/utils/formatPrice";
import { APP_VERSION, BUILD_NUMBER } from "@/lib/constants";
import { writeAuthIntentRole } from "@/lib/authIntent";

export default function Profile() {
  const router = useRouter();
  const { user, logoutAsync, isAuthenticated } = useAuth();
  const { data: orders, isLoading } = useOrders();
  const { t } = useLanguage();

  const collectedOrders = orders?.filter((o: any) => o.status === "confirmed" && o.collectedAt) || [];
  const mealsSaved = collectedOrders.length;
  const co2Saved = mealsSaved * 2.5;
  const moneySaved = collectedOrders.reduce((sum: number, order: any) => {
    const original = order.product?.originalPrice || 0;
    const price = order.totalPrice || order.product?.price || 0;
    if (original > price && original > 0) return sum + (original - price) * order.quantity;
    return sum;
  }, 0);

  const handleSignOut = async () => {
    try {
      await logoutAsync();
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.location.assign("/signin");
        return;
      }
      Toast.show({ type: "success", text1: t("auth.signedOut"), text2: t("auth.signedOutSuccess") });
      router.replace("/(auth)/signin");
    } catch {
      Toast.show({ type: "error", text1: t("common.error"), text2: t("auth.signOutConfirmMessage") });
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={s.centered}>
        <Ionicons name="person-outline" size={64} color={theme.muted} />
        <Text style={s.centeredTitle}>{t("auth.signInRequired") || "Sign in required"}</Text>
        <TouchableOpacity style={s.primaryButton} onPress={() => router.push("/(auth)/signin")}>
          <Text style={s.primaryButtonText}>{t("common.signIn")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading) {
    return <View style={s.centered}><ActivityIndicator color={theme.primary} size="large" /></View>;
  }

  const displayName = user?.username || user?.email || "User";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={s.pageTitle}>{t("profile.title")}</Text>

      <View style={s.userCard}>
        <View style={s.avatarContainer}>
          {user?.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={s.avatarImage} />
          ) : (
            <Text style={s.avatarInitials}>{initials}</Text>
          )}
        </View>
        <View style={s.userInfo}>
          <Text style={s.userName}>{displayName}</Text>
          <Text style={s.userEmail}>{user?.email}</Text>
          <View style={s.roleRow}>
            <View style={s.roleDot} />
            <Text style={s.roleText}>{user?.role === "PROVIDER" ? "Provider" : t("profile.customer") || "Customer"}</Text>
          </View>
        </View>
      </View>

      <Text style={s.sectionLabel}>{t("profile.impact")}</Text>
      <View style={s.statsRow}>
        <StatCard icon="leaf-outline" value={String(mealsSaved)} label={t("profile.mealsSaved")} color={theme.primary} bg={theme.primaryBg} />
        <StatCard icon="trophy-outline" value={co2Saved.toFixed(1)} label={t("profile.co2Saved")} color={theme.blue} bg={theme.blueBg} />
        <StatCard icon="bag-outline" value={formatPriceValue(moneySaved)} label={t("profile.moneySaved")} color={theme.amber} bg={theme.amberBg} />
      </View>

      {user?.role === "PENDING_PROVIDER" && (
        <View style={s.pendingBanner}>
          <Ionicons name="time-outline" size={22} color={theme.amber} />
          <View style={{ flex: 1 }}>
            <Text style={s.pendingTitle}>{t("profile.pendingProvider")}</Text>
            <Text style={s.pendingSubtitle}>{t("profile.pendingProviderDesc")}</Text>
          </View>
        </View>
      )}

      <Text style={s.sectionLabel}>{t("profile.account")}</Text>
      <MenuItem icon="person-outline" label={t("profile.accountDetails")} onPress={() => router.push("/account-details" as any)} />
      <MenuItem icon="card-outline" label={t("profile.paymentMethods")} onPress={() => router.push("/payment-methods" as any)} />
      <MenuItem icon="settings-outline" label={t("common.preferences")} onPress={() => router.push("/preferences" as any)} />

      <Text style={[s.sectionLabel, { marginTop: 16 }]}>{t("profile.discover")}</Text>
      <MenuItem icon="heart-outline" label={t("nav.impact")} onPress={() => router.push("/impact" as any)} />
      <MenuItem icon="chatbubble-outline" label={t("nav.contact")} onPress={() => router.push("/contact" as any)} />
      <MenuItem icon="help-circle-outline" label={t("profile.helpSupport")} onPress={() => router.push("/help-support" as any)} />

      {user?.role === "PROVIDER" && (
        <MenuItem icon="storefront-outline" label={t("profile.providerDashboard")} onPress={() => router.push("/(provider)/dashboard")} />
      )}

      {user?.role !== "PROVIDER" && user?.role !== "PENDING_PROVIDER" && (
        <MenuItem icon="storefront-outline" label={t("profile.becomeProvider") || "Become a Provider"} onPress={async () => { await writeAuthIntentRole("PROVIDER"); router.push("/(auth)/ProviderSignup"); }} />
      )}

      <TouchableOpacity style={s.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color={theme.destructive} />
        <Text style={s.signOutText}>{t("common.signOut")}</Text>
      </TouchableOpacity>

      <Text style={s.version}>{t("profile.version")} {APP_VERSION} (Build {BUILD_NUMBER})</Text>
    </ScrollView>
  );
}

function StatCard({ icon, value, label, color, bg }: { icon: string; value: string; label: string; color: string; bg: string }) {
  return (
    <View style={[s.statCard, { backgroundColor: bg, borderColor: color + "33" }]}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={[s.statLabel, { color }]}>{label}</Text>
    </View>
  );
}

function MenuItem({ icon, label, onPress }: { icon: string; label: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={s.menuItem} onPress={onPress}>
      <View style={s.menuItemLeft}>
        <View style={s.menuItemIcon}><Ionicons name={icon as any} size={20} color={theme.primary} /></View>
        <Text style={s.menuItemLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.muted} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.backgroundGradient },
  scrollContent: { padding: 16, paddingTop: 48, paddingBottom: 100 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12, backgroundColor: theme.backgroundGradient },
  centeredTitle: { fontSize: 22, fontWeight: "800", color: theme.foreground },
  primaryButton: { backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  pageTitle: { fontSize: 28, fontWeight: "800", color: theme.foreground, marginBottom: 20 },
  userCard: { flexDirection: "row", gap: 16, backgroundColor: "#fff", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: theme.border, marginBottom: 20 },
  avatarContainer: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.primaryBg, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImage: { width: 72, height: 72 },
  avatarInitials: { fontSize: 24, fontWeight: "800", color: theme.primary },
  userInfo: { flex: 1 },
  userName: { fontSize: 20, fontWeight: "700", color: theme.foreground },
  userEmail: { fontSize: 13, color: theme.muted, marginTop: 2 },
  roleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  roleDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary },
  roleText: { fontSize: 12, fontWeight: "600", color: theme.primary },
  sectionLabel: { fontSize: 14, fontWeight: "700", color: theme.foreground, marginBottom: 8 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 14, padding: 12, borderWidth: 1, gap: 4 },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 10, fontWeight: "600" },
  pendingBanner: { flexDirection: "row", gap: 12, backgroundColor: theme.amberBg, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#fde68a", marginBottom: 16 },
  pendingTitle: { fontWeight: "700", fontSize: 13, color: "#78350f" },
  pendingSubtitle: { fontSize: 11, color: "#a16207", marginTop: 2 },
  menuItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: theme.border, marginBottom: 8 },
  menuItemLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuItemIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: theme.primaryBg, alignItems: "center", justifyContent: "center" },
  menuItemLabel: { fontSize: 15, fontWeight: "500", color: theme.foreground },
  signOutButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 14, backgroundColor: theme.destructiveBg, borderWidth: 1, borderColor: "#fecaca", marginTop: 16 },
  signOutText: { fontSize: 15, fontWeight: "600", color: theme.destructive },
  version: { fontSize: 11, color: theme.muted, textAlign: "center", marginTop: 32 },
});
