import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Dimensions,
  Linking,
  Image,
} from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "expo-router";

import {
  User,
  MapPin,
  Phone,
  Settings,
  LogOut,
  ArrowLeft,
  X,
  Store,
} from "lucide-react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

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
  const { user, logout, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showEditModal, setShowEditModal] = useState(false);

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          logout();
          toast({ title: "Signed out", description: "You've been signed out successfully" });
          router.replace("/signin");
        },
      },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.centered}>
        <Text style={styles.heading}>Sign in required</Text>
      </View>
    );
  }

  if (user?.role !== "PROVIDER" && user?.role !== "PENDING_PROVIDER") {
    return (
      <View style={styles.centered}>
        <Store color={theme.muted} size={64} />
        <Text style={[styles.heading, { marginTop: 16 }]}>Provider account required</Text>
      </View>
    );
  }

  const displayName = user?.username || user?.email || "Provider";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push("/(provider)/dashboard")}
        >
          <ArrowLeft color={theme.text} size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
            <Text style={styles.profileBadge}>Provider Account</Text>
          </View>
        </View>

        {/* Business Information */}
        <Text style={styles.sectionTitle}>Business Information</Text>
        <View style={styles.infoCard}>
          {user?.username && (
            <InfoRow icon={<Store color={theme.muted} size={18} />} label="Business Name" value={user.username} />
          )}
          {user?.location && (
            <InfoRow icon={<MapPin color={theme.muted} size={18} />} label="Address" value={user.location} />
          )}
          {user?.phoneNumber && (
            <InfoRow icon={<Phone color={theme.muted} size={18} />} label="Phone" value={String(user.phoneNumber)} />
          )}
          {user?.mapsLink && (
            <InfoRow
              icon={<MapPin color={theme.muted} size={18} />}
              label="Google Maps"
              value="View on Maps"
              onPress={() => Linking.openURL(user.mapsLink)}
              isLink
            />
          )}
          {!user?.username && !user?.location && !user?.phoneNumber && !user?.mapsLink && (
            <Text style={styles.emptyInfo}>No business information added yet.</Text>
          )}
        </View>

        {/* Edit button */}
        <TouchableOpacity style={styles.editBtn} onPress={() => setShowEditModal(true)}>
          <Settings color={theme.text} size={20} />
          <Text style={styles.editBtnText}>Edit Business Information</Text>
        </TouchableOpacity>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <LogOut color={theme.destructive} size={20} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Modal */}
      <EditProfileModal
        visible={showEditModal}
        user={user}
        onClose={() => setShowEditModal(false)}
        onSuccess={() => {
          setShowEditModal(false);
          queryClient.invalidateQueries({ queryKey: ["/auth/get-user-by-token"] });
        }}
      />
    </View>
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
// EditProfileModal
// ---------------------------------------------------------------------------
function EditProfileModal({
  visible,
  user,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  user: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const slideAnim = useState(new Animated.Value(SCREEN_HEIGHT))[0];

  const [form, setForm] = useState({
    username: user?.username || "",
    location: user?.location || "",
    phoneNumber: user?.phoneNumber?.toString() || "",
    mapsLink: user?.mapsLink || "",
  });

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 150,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const set = (key: string) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const updateData: any = {};
      if (form.username.trim()) updateData.username = form.username.trim();
      if (form.location.trim()) updateData.location = form.location.trim();
      if (form.phoneNumber.trim()) updateData.phoneNumber = form.phoneNumber.trim();
      if (form.mapsLink.trim()) updateData.mapsLink = form.mapsLink.trim();

      await usersApi.updateDetails(updateData);
      toast({ title: "Profile updated!", description: "Your business information has been saved" });
      onSuccess();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update profile" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Edit Business Profile</Text>
                <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
                  <X color={theme.text} size={20} />
                </TouchableOpacity>
              </View>

              {/* Business Name */}
              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <Store color={theme.textMuted} size={14} />
                  <Text style={styles.label}>Business Name</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={form.username}
                  onChangeText={set("username")}
                  placeholder="Your business name"
                  placeholderTextColor={theme.muted}
                />
              </View>

              {/* Address */}
              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <MapPin color={theme.textMuted} size={14} />
                  <Text style={styles.label}>Address</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={form.location}
                  onChangeText={set("location")}
                  placeholder="123 Main St, City, State ZIP"
                  placeholderTextColor={theme.muted}
                />
              </View>

              {/* Phone */}
              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <Phone color={theme.textMuted} size={14} />
                  <Text style={styles.label}>Phone Number</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={form.phoneNumber}
                  onChangeText={set("phoneNumber")}
                  placeholder="+1 (555) 123-4567"
                  placeholderTextColor={theme.muted}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Maps Link */}
              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <MapPin color={theme.textMuted} size={14} />
                  <Text style={styles.label}>Google Maps Link</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={form.mapsLink}
                  onChangeText={set("mapsLink")}
                  placeholder="https://maps.google.com/..."
                  placeholderTextColor={theme.muted}
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.hint}>Help customers find your location easily</Text>
              </View>

              {/* Buttons */}
              <View style={styles.btnRow}>
                <TouchableOpacity style={[styles.btnSecondary, { flex: 1 }]} onPress={onClose}>
                  <Text style={styles.btnSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <View style={{ width: 12 }} />
                <TouchableOpacity
                  style={[styles.btnPrimary, { flex: 1 }, isLoading && styles.btnDisabled]}
                  onPress={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={theme.primaryForeground} size="small" />
                  ) : (
                    <Text style={styles.btnPrimaryText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={{ height: 32 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
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

  // Bottom sheet
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: theme.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_HEIGHT * 0.92,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  sheetTitle: {
    color: theme.text,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  // Form
  field: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  label: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "500",
  },
  input: {
    backgroundColor: theme.secondary,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: theme.text,
    fontSize: 15,
  },
  hint: {
    color: theme.textMuted,
    fontSize: 12,
    marginTop: 4,
  },

  // Buttons
  btnRow: {
    flexDirection: "row",
    marginTop: 8,
  },
  btnPrimary: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: {
    color: theme.primaryForeground,
    fontWeight: "700",
    fontSize: 15,
  },
  btnSecondary: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: theme.secondary,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondaryText: {
    color: theme.text,
    fontWeight: "500",
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});