import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-shop";
import { useLanguage } from "@/context/LanguageContext";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { ProfileImage } from "@/components/ProfileImage";
import { formatPrice } from "@/utils/formatPrice";
import {
  APP_VERSION,
  BUILD_NUMBER,
  co2SavedFromMeals,
  waterSavedFromMeals,
} from "@/lib/constants";
import { useHeaderTopPadding, useTabScreenContentInsets } from "@/lib/screen-insets";
import { theme } from "@/lib/theme";
import {
  User,
  Settings,
  LogOut,
  ChevronRight,
  Heart,
  HelpCircle,
  Leaf,
  MessageCircle,
  Bell,
  CreditCard,
  Phone,
  MapPin,
  ShoppingBag,
} from "lucide-react-native";

export default function Profile() {
  const router = useRouter();
  const { user, logoutAsync, isAuthenticated } = useAuth();
  const { data: orders, isLoading } = useOrders();
  const { t } = useLanguage();
  const headerTop = useHeaderTopPadding();
  const contentInsets = useTabScreenContentInsets();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const collectedOrders =
    orders?.filter((o: any) => o.status === "confirmed" && o.collectedAt) || [];
  const mealsSaved = collectedOrders.length;
  const co2Saved = co2SavedFromMeals(mealsSaved);
  const waterSaved = waterSavedFromMeals(mealsSaved);
  const moneySaved = collectedOrders.reduce((sum: number, order: any) => {
    const original = Number(order.product?.originalPrice) || 0;
    const qty = Number(order.quantity) || 1;
    const total =
      order.totalPrice != null
        ? Number(order.totalPrice)
        : (Number(order.product?.price) || 0) * qty;
    const originalTotal = original * qty;
    if (original > 0 && originalTotal > total) return sum + (originalTotal - total);
    return sum;
  }, 0);

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
        router.replace("/(auth)/welcome");
      },
    });
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: headerTop }]}>
          <Text style={styles.headerTitle}>{t("profile.title")}</Text>
        </View>
        <View style={styles.centered}>
          <User color={theme.muted} size={64} />
          <Text style={styles.heading}>{t("auth.signInRequired")}</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/(auth)/signin")}
          >
            <Text style={styles.primaryButtonText}>{t("common.signIn")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: headerTop }]}>
          <Text style={styles.headerTitle}>{t("profile.title")}</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
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
    <>
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: headerTop }]}>
          <Text style={styles.headerTitle}>{t("profile.title")}</Text>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentInsets]}
          showsVerticalScrollIndicator={false}
        >
          {/* User info */}
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
                {t("profile.customer") || "Customer"}
              </Text>
            </View>
          </View>

          {/* Impact stats */}
          <View style={styles.statsGrid}>
            <StatCard
              icon={<ShoppingBag color={theme.primaryDark} size={20} />}
              value={String(mealsSaved)}
              label={t("profile.mealsSaved") || "Meals Saved"}
              color={theme.primaryBg}
            />
            <StatCard
              icon={<Leaf color={theme.infoDark} size={20} />}
              value={co2Saved.toFixed(1)}
              label={t("profile.co2Saved") || "CO₂ Saved"}
              color={theme.infoBg}
            />
            <StatCard
              icon={<Heart color={theme.warningDark} size={20} />}
              value={formatPrice(moneySaved)}
              label={t("profile.moneySaved") || "Money Saved"}
              color={theme.warningBg}
            />
          </View>

          {mealsSaved > 0 && (
            <View style={styles.impactCard}>
              <Leaf color={theme.primaryDark} size={20} />
              <Text style={styles.impactText}>
                {t("profile.impact_summary", {
                  co2: co2Saved.toFixed(1),
                  water: waterSaved.toLocaleString(),
                })}
              </Text>
            </View>
          )}

          {/* Settings menu */}
          <Text style={styles.sectionTitle}>{t("profile.account") || "Account"}</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon={<User color={theme.muted} size={18} />}
              label={t("profile.accountDetails") || "Account Details"}
              onPress={() => router.push("/account-details" as any)}
            />
            <MenuItem
              icon={<CreditCard color={theme.muted} size={18} />}
              label={t("profile.paymentMethods") || "Payment Methods"}
              onPress={() => router.push("/payment-methods" as any)}
            />
            <MenuItem
              icon={<Bell color={theme.muted} size={18} />}
              label={t("notifications.title") || "Notifications"}
              onPress={() => router.push("/notifications" as any)}
            />
            <MenuItem
              icon={<Settings color={theme.muted} size={18} />}
              label={t("profile.preferences") || t("common.preferences") || "Preferences"}
              onPress={() => router.push("/preferences" as any)}
            />
            <MenuItem
              icon={<HelpCircle color={theme.muted} size={18} />}
              label={t("profile.helpSupport") || "Help & Support"}
              onPress={() => router.push("/help-support" as any)}
            />
            <MenuItem
              icon={<MessageCircle color={theme.muted} size={18} />}
              label={t("contact.title") || "Contact"}
              onPress={() => router.push("/contact" as any)}
            />
            <MenuItem
              icon={<Leaf color={theme.muted} size={18} />}
              label={t("impact.title") || "Impact"}
              onPress={() => router.push("/impact" as any)}
              isLast
            />
          </View>

          {/* Personal info */}
          <Text style={styles.sectionTitle}>
            {t("profile.personal_information") || "Personal information"}
          </Text>
          <View style={styles.infoCard}>
            {user?.username ? (
              <InfoRow
                icon={<User color={theme.muted} size={18} />}
                label={t("profile.name") || "Name"}
                value={user.username}
              />
            ) : null}
            {user?.phoneNumber ? (
              <InfoRow
                icon={<Phone color={theme.muted} size={18} />}
                label={t("profile.phone") || "Phone"}
                value={String(user.phoneNumber)}
              />
            ) : null}
            {user?.location ? (
              <InfoRow
                icon={<MapPin color={theme.muted} size={18} />}
                label={t("profile.address") || "Address"}
                value={user.location}
                isLast
              />
            ) : null}
            {!user?.username && !user?.phoneNumber && !user?.location ? (
              <Text style={styles.emptyInfo}>
                {t("profile.no_personal_info") || "No personal information yet"}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <LogOut color={theme.destructive} size={20} />
            <Text style={styles.signOutText}>{t("common.signOut")}</Text>
          </TouchableOpacity>

          <Text style={styles.version}>
            {t("profile.version") || "Version"} {APP_VERSION} (Build {BUILD_NUMBER})
          </Text>
        </ScrollView>
      </View>
      {confirmDialog}
    </>
  );
}

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: color }]}>
      {icon}
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  isLast,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, isLast && { borderBottomWidth: 0 }]}
      onPress={onPress}
    >
      <View style={styles.menuItemLeft}>
        {icon}
        <Text style={styles.menuItemText}>{label}</Text>
      </View>
      <ChevronRight color={theme.muted} size={18} />
    </TouchableOpacity>
  );
}

function InfoRow({
  icon,
  label,
  value,
  isLast,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

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
    gap: 12,
  },
  heading: {
    color: theme.foreground,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },

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

  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },

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

  sectionTitle: {
    color: theme.foreground,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: -8,
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
  version: {
    fontSize: 11,
    color: theme.muted,
    textAlign: "center",
    marginTop: 8,
  },
});
