import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
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
import { LocationMap } from "@/components/LocationMap";
import { ProfileImage } from "@/components/ProfileImage";
import { readCoordinates } from "@/lib/maps-link";
import { formatPrice } from "@/utils/formatPrice";
import { useHeaderTopPadding, useTabScreenContentInsets } from "@/lib/screen-insets";
import { theme } from "@/lib/theme";

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
// ProviderProfile
// ---------------------------------------------------------------------------
export default function ProviderProfile() {
  const { user, logoutAsync, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const headerTop = useHeaderTopPadding();
  const contentInsets = useTabScreenContentInsets();
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
        router.replace("/(auth)/welcome");
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
      <View style={[styles.header, { paddingTop: headerTop }]}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push("/(provider)/dashboard")}
        >
          <ArrowLeft color={theme.foreground} size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("profile.title")}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, contentInsets]}
        showsVerticalScrollIndicator={false}
      >
        {isPendingProvider && <ProviderPendingBanner />}

        <ProfileCompletionBanner
          profile={user}
          onEditProfile={() => router.push("/account-details" as any)}
        />

        {/* User Info Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <ProfileImage
              uri={user?.profileImage}
              style={styles.avatarImage}
              fallback={<Text style={styles.avatarInitials}>{initials}</Text>}
            />
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
            icon={<Store color={theme.primaryDark} size={20} />}
            value={statsLoading ? "..." : String(stats.totalOffers)}
            label={t("provider.profile.active_offers") || "Active Offers"}
            color={theme.primaryBg}
          />
          <StatCard
            icon={<Heart color={theme.infoDark} size={20} />}
            value={statsLoading ? "..." : String(stats.totalMealsSaved)}
            label={t("provider.profile.meals_saved") || "Meals Saved"}
            color={theme.infoBg}
          />
          <StatCard
            icon={<User color={theme.warningDark} size={20} />}
            value={statsLoading ? "..." : formatPrice(stats.revenue)}
            label={t("provider.profile.total_revenue") || "Revenue"}
            color={theme.warningBg}
          />
        </View>

        {/* Environmental impact */}
        {stats.totalMealsSaved > 0 && (
          <View style={styles.impactCard}>
            <Leaf color={theme.primaryDark} size={20} />
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
          {(() => {
            const place = readCoordinates(user?.latitude, user?.longitude, user?.mapsLink);
            if (!place) return null;
            return (
              <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                <LocationMap
                  latitude={place.latitude}
                  longitude={place.longitude}
                  label={user?.location || undefined}
                  height={160}
                />
              </View>
            );
          })()}
          {user?.phoneNumber && (
            <InfoRow icon={<Phone color={theme.muted} size={18} />} label={t("profile.phone")} value={String(user.phoneNumber)} />
          )}
          {!user?.username && !user?.location && !user?.phoneNumber && (
            <Text style={styles.emptyInfo}>{t("profile.no_business_info")}</Text>
          )}
        </View>

        {/* Edit button */}
        <TouchableOpacity style={styles.editBtn} onPress={() => router.push("/account-details" as any)}>
          <Settings color={theme.foreground} size={20} />
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
        <Text style={[styles.infoValue, isLink && { color: theme.primaryDark }]}>{value}</Text>
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
    backgroundColor: theme.backgroundGradient,
  },
  centered: {
    flex: 1,
    backgroundColor: theme.backgroundGradient,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  heading: {
    color: theme.foreground,
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
    paddingBottom: 16,
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerTitle: {
    color: theme.foreground,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },

  // Scroll — vertical insets come from useTabScreenContentInsets
  scrollContent: {
    paddingHorizontal: 16,
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
    backgroundColor: theme.primaryBg,
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
    color: theme.foreground,
    fontSize: 18,
    fontWeight: "700",
  },
  profileEmail: {
    color: theme.muted,
    fontSize: 13,
  },
  profileBadge: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  ratingText: {
    color: theme.warningDark,
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
    color: theme.foreground,
  },
  statLabel: {
    fontSize: 10,
    color: theme.muted,
    fontWeight: "600",
  },
  impactCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: theme.primaryBg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.primaryBorder,
  },
  impactText: {
    flex: 1,
    fontSize: 13,
    color: theme.primaryDark,
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
    color: theme.foreground,
  },

  // Section
  sectionTitle: {
    color: theme.foreground,
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
    color: theme.muted,
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    color: theme.foreground,
    fontSize: 14,
    fontWeight: "500",
  },
  emptyInfo: {
    color: theme.muted,
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
    color: theme.foreground,
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
    borderColor: "#fecaca",
  },
  signOutText: {
    color: theme.destructive,
    fontSize: 15,
    fontWeight: "600",
  },
});