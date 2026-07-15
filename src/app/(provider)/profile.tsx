import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
  Image,
} from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { ratingsApi } from "@/lib/api-client";
import { useToast } from "@/lib/toast";
import { useRouter } from "expo-router";
import { useLanguage } from "@/context/LanguageContext";
import { useProviderStats } from "@/hooks/use-provider-stats";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { ProviderPendingBanner } from "@/components/provider/ProviderPendingBanner";
import { ProfileCompletionBanner } from "@/components/provider/ProfileCompletionBanner";
import { formatPriceValue } from "@/utils/formatPrice";

import {
  User,
  MapPin,
  Phone,
  Settings,
  LogOut,
  ArrowLeft,
  X,
  Store,
  ChevronRight,
  Heart,
  HelpCircle,
  Leaf,
  MessageCircle,
} from "lucide-react-native";

// ---------------------------------------------------------------------------
// Theme (light)
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
  destructiveBg: "#fef2f2",
  destructiveBorder: "#fecaca",
  text: "#0f172a",
  textMuted: "#64748b",
};

// ---------------------------------------------------------------------------
// ProviderProfile
// ---------------------------------------------------------------------------
export default function ProviderProfile() {
  const { user, logoutAsync, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const { stats, isLoading: statsLoading } = useProviderStats();

  const { data: rating } = useQuery({
    queryKey: ["/ratings/provider", user?.id],
    queryFn: () => ratingsApi.getProviderAverage(user?.id || 0),
    enabled: !!user?.id,
  });

  const isPendingProvider = user?.role === "PENDING_PROVIDER";

  const handleSignOut = () => {
    confirm({
      title: t("auth.signOutConfirmTitle"),
      message: t("auth.signOutConfirmMessage"),
      confirmLabel: t("common.signOut"),
      cancelLabel: t("common.cancel"),
      destructive: true,
      icon: "log-out-outline",
      onConfirm: async () => {
        await logoutAsync();
        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.location.assign("/signin");
          return;
        }
        toast({ title: t("auth.signedOut"), description: t("auth.signedOutSuccess") });
        router.replace("/(auth)/signin");
      },
    });
  };

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
        <Store color={theme.muted} size={64} />
        <Text style={[styles.heading, { marginTop: 16 }]}>{t("auth.providerRequired")}</Text>
      </View>
    );
  }

  const displayName = user?.username || user?.email || t("offer_card.provider");
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push("/(provider)/dashboard")}
        >
          <ArrowLeft color={theme.text} size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("profile.title")}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isPendingProvider && <ProviderPendingBanner />}

        <ProfileCompletionBanner
          profile={user}
          onEditProfile={() => router.push("/account-details" as any)}
        />

        {/* User Info Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            {user?.profileImage ? (
              <Image
                source={{ uri: user.profileImage }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.avatarInitials}>{initials}</Text>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <Text style={styles.profileBadge}>
              {isPendingProvider ? t("profile.pending_provider") : t("profile.provider_account")}
            </Text>
            {rating?.averageRating != null && (
              <Text style={styles.ratingText}>★ {Number(rating.averageRating).toFixed(1)} ({rating.totalRatings || 0})</Text>
            )}
          </View>
        </View>

        {/* Impact Stats */}
        <View style={styles.statsGrid}>
          <StatCard
            icon={<Store color="#047857" size={20} />}
            value={statsLoading ? "..." : String(stats.totalOffers)}
            label={t("provider.profile.active_offers") || "Active Offers"}
            color="#ecfdf5"
          />
          <StatCard
            icon={<Heart color="#1d4ed8" size={20} />}
            value={statsLoading ? "..." : String(stats.totalMealsSaved)}
            label={t("provider.profile.meals_saved") || "Meals Saved"}
            color="#eff6ff"
          />
          <StatCard
            icon={<User color="#b45309" size={20} />}
            value={statsLoading ? "..." : `${formatPriceValue(stats.revenue)} dt`}
            label={t("provider.profile.total_revenue") || "Revenue"}
            color="#fffbeb"
          />
        </View>

        {/* Environmental impact */}
        {stats.totalMealsSaved > 0 && (
          <View style={styles.impactCard}>
            <Leaf color="#16a34a" size={20} />
            <Text style={styles.impactText}>
              {t("profile.impact_summary", {
                co2: stats.co2Saved.toFixed(1),
                water: stats.waterSaved.toLocaleString(),
              })}
            </Text>
          </View>
        )}

        {/* Menu */}
        <Text style={styles.sectionTitle}>{t("profile.title") || "Settings"}</Text>
        <View style={styles.menuCard}>
          <MenuItem icon={<User color={theme.muted} size={18} />} label={t("profile.accountDetails") || "Account Details"} onPress={() => router.push("/account-details" as any)} />
          <MenuItem icon={<Settings color={theme.muted} size={18} />} label={t("profile.preferences") || "Preferences"} onPress={() => router.push("/preferences" as any)} />
          <MenuItem icon={<HelpCircle color={theme.muted} size={18} />} label={t("profile.helpSupport") || "Help & Support"} onPress={() => router.push("/help-support" as any)} />
          <MenuItem icon={<MessageCircle color={theme.muted} size={18} />} label={t("contact.title") || "Contact"} onPress={() => router.push("/contact" as any)} />
          <MenuItem icon={<Leaf color={theme.muted} size={18} />} label={t("impact.title") || "Impact"} onPress={() => router.push("/impact" as any)} isLast />
        </View>

        {/* Business Information */}
        <Text style={styles.sectionTitle}>{t("profile.business_information")}</Text>
        <View style={styles.infoCard}>
          {user?.username && (
            <InfoRow icon={<Store color={theme.muted} size={18} />} label={t("profile.business_name")} value={user.username} />
          )}
          {user?.location && (
            <InfoRow icon={<MapPin color={theme.muted} size={18} />} label={t("profile.address")} value={user.location} />
          )}
          {user?.phoneNumber && (
            <InfoRow icon={<Phone color={theme.muted} size={18} />} label={t("profile.phone")} value={String(user.phoneNumber)} />
          )}
          {user?.mapsLink && (
            <InfoRow
              icon={<MapPin color={theme.muted} size={18} />}
              label={t("profile.google_maps")}
              value={t("common.view_on_maps")}
              onPress={() => user.mapsLink && Linking.openURL(user.mapsLink)}
              isLink
            />
          )}
          {!user?.username && !user?.location && !user?.phoneNumber && !user?.mapsLink && (
            <Text style={styles.emptyInfo}>{t("profile.no_business_info")}</Text>
          )}
        </View>

        {/* Edit button */}
        <TouchableOpacity style={styles.editBtn} onPress={() => router.push("/account-details" as any)}>
          <Settings color={theme.text} size={20} />
          <Text style={styles.editBtnText}>{t("profile.edit_business_info")}</Text>
        </TouchableOpacity>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <LogOut color={theme.destructive} size={20} />
          <Text style={styles.signOutText}>{t("common.signOut")}</Text>
        </TouchableOpacity>
      </ScrollView>
      </View>
      {confirmDialog}
    </>
  );
}

// ---------------------------------------------------------------------------
// StatCard / MenuItem
// ---------------------------------------------------------------------------
function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  return (
    <View style={[styles.statCard, { backgroundColor: color }]}>
      {icon}
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({ icon, label, onPress, isLast }: { icon: React.ReactNode; label: string; onPress: () => void; isLast?: boolean }) {
  return (
    <TouchableOpacity style={[styles.menuItem, isLast && { borderBottomWidth: 0 }]} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        {icon}
        <Text style={styles.menuItemText}>{label}</Text>
      </View>
      <ChevronRight color={theme.muted} size={18} />
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// InfoRow
// ---------------------------------------------------------------------------
function InfoRow({
  icon,
  label,
  value,
  onPress,
  isLink,
  isLast,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onPress?: () => void;
  isLink?: boolean;
  isLast?: boolean;
}) {
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap
      style={[styles.infoRow, isLast && { borderBottomWidth: 0 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.infoIcon}>{icon}</View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, isLink && { color: theme.primary }]}>{value}</Text>
      </View>
    </Wrap>
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
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 16,
    paddingBottom: 16,
    backgroundColor: theme.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
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
    gap: 16,
  },

  // Profile card
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${theme.primary}18`,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 64,
    height: 64,
  },
  avatarInitials: {
    color: theme.primary,
    fontSize: 24,
    fontWeight: "700",
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    color: theme.text,
    fontSize: 18,
    fontWeight: "700",
  },
  profileEmail: {
    color: theme.textMuted,
    fontSize: 13,
  },
  profileBadge: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  ratingText: {
    color: "#b45309",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.border,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.text,
  },
  statLabel: {
    fontSize: 10,
    color: theme.textMuted,
    fontWeight: "600",
  },
  impactCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  impactText: {
    flex: 1,
    fontSize: 13,
    color: "#166534",
    fontWeight: "500",
  },
  menuCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.text,
  },

  // Section
  sectionTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: -8,
  },

  // Info card
  infoCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  infoIcon: {
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    color: theme.text,
    fontSize: 14,
    fontWeight: "500",
  },
  emptyInfo: {
    color: theme.textMuted,
    fontSize: 13,
    padding: 16,
    textAlign: "center",
  },

  // Edit button
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: theme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  editBtnText: {
    color: theme.text,
    fontSize: 15,
    fontWeight: "600",
  },

  // Sign out
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    backgroundColor: theme.destructiveBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.destructiveBorder,
  },
  signOutText: {
    color: theme.destructive,
    fontSize: 15,
    fontWeight: "600",
  },
});