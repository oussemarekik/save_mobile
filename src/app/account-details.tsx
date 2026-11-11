import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { usersApi, storageApi, buildImageUrl } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/context/LanguageContext";
import { LocationAutocomplete, generateMapsLink, type SelectedPlace } from "@/components/LocationAutocomplete";
import { pickImageFromLibrary, type PickedImage } from "@/lib/pick-image";
import { ProfileImage } from "@/components/ProfileImage";
import { ScreenHeader } from "@/components/ScreenHeader";
import { safeGoBack } from "@/lib/navigation";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { useScreenBottomPadding } from "@/lib/screen-insets";

export default function AccountDetails() {
  const router = useRouter();
  const { t } = useLanguage();
  const bottomPad = useScreenBottomPadding();
  const { user, logoutAsync, isAuthenticated, refreshAuth } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const [profileImagePath, setProfileImagePath] = useState<string | null>(null);
  const [form, setForm] = useState({
    username: "",
    location: "",
    phoneNumber: "",
    mapsLink: "",
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const backFallback =
    user?.role === "PROVIDER" || user?.role === "PENDING_PROVIDER"
      ? "/(provider)/profile"
      : "/(client)/profile";

  useEffect(() => {
    if (!user) return;
    setForm({
      username: user.username ?? "",
      location: user.location ?? "",
      phoneNumber: user.phoneNumber ? String(user.phoneNumber) : "",
      mapsLink: user.mapsLink ?? "",
      latitude: (user as { latitude?: number | null }).latitude ?? null,
      longitude: (user as { longitude?: number | null }).longitude ?? null,
    });
    setProfileImagePath(user.profileImage ?? null);
    setPickedImage(null);
  }, [user]);

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title={t("account_details.title")} onBack={() => safeGoBack(router, "/")} />
        <View style={styles.centered}>
          <View style={styles.emptyIcon}>
            <Ionicons name="person-outline" size={28} color={theme.primaryDark} />
          </View>
          <Text style={styles.emptyTitle}>{t("auth.signInRequired")}</Text>
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

  const handleSave = async () => {
    const username = form.username.trim();
    if (!username) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: t("account_details.display_name_required"),
      });
      return;
    }

    setIsLoading(true);
    try {
      const payload: {
        username: string;
        location?: string;
        phoneNumber?: number;
        mapsLink?: string;
        latitude?: number | null;
        longitude?: number | null;
        profileImage?: string;
      } = { username };

      const location = form.location.trim();
      if (location) payload.location = location;

      const phoneDigits = form.phoneNumber.replace(/\D/g, "");
      if (phoneDigits) payload.phoneNumber = parseInt(phoneDigits, 10);

      const mapsLink = form.mapsLink.trim();
      if (mapsLink) payload.mapsLink = mapsLink;
      if (form.latitude != null) payload.latitude = form.latitude;
      if (form.longitude != null) payload.longitude = form.longitude;

      let nextProfileImage = profileImagePath;
      if (pickedImage) {
        setUploadingImage(true);
        const uploaded = await storageApi.upload([pickedImage]);
        const file = uploaded?.[0];
        let filename = file?.url || file?.path || file?.filename || "";
        if (
          filename &&
          !filename.startsWith("/") &&
          !filename.startsWith("http://") &&
          !filename.startsWith("https://")
        ) {
          filename = `/storage/${filename}`;
        }
        if (!filename) {
          throw new Error(t("account_details.upload_image_failed"));
        }
        nextProfileImage = filename;
        payload.profileImage = filename;
      } else if (nextProfileImage) {
        payload.profileImage = nextProfileImage;
      }

      await usersApi.updateProfile(payload);
      await refreshAuth();
      await queryClient.invalidateQueries({ queryKey: ["/auth/get-user-by-token"] });
      Toast.show({
        type: "success",
        text1: t("account_details.profile_updated"),
        text2: t("account_details.profile_updated_desc"),
      });
      safeGoBack(router, backFallback);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: error.message || t("account_details.update_failed"),
      });
    } finally {
      setUploadingImage(false);
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t("account_details.delete_confirm_title"),
      t("account_details.delete_confirm_message"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              await usersApi.deleteAccount(user.email);
              await logoutAsync();
              Toast.show({
                type: "success",
                text1: t("account_details.account_deleted"),
                text2: t("account_details.account_deleted_desc"),
              });
              router.replace("/(auth)/welcome");
            } catch (error: any) {
              Toast.show({
                type: "error",
                text1: t("common.error"),
                text2: error.message || t("account_details.delete_failed"),
              });
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const isBusiness = user.role === "PROVIDER" || user.role === "PENDING_PROVIDER";
  const previewUri = pickedImage?.uri || buildImageUrl(profileImagePath);
  const displayName = form.username.trim() || user.username || user.email;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handlePickProfileImage = async () => {
    const picked = await pickImageFromLibrary();
    if (picked) setPickedImage(picked);
  };

  const handleAddressChange = (locationName: string, place?: SelectedPlace) => {
    setForm((f) => {
      const address = place?.formattedAddress?.trim() || locationName.trim();
      const lat = place?.latitude ?? null;
      const lng = place?.longitude ?? null;
      const mapsLink = address
        ? generateMapsLink(address, f.username, lat, lng, place?.placeId)
        : "";
      return {
        ...f,
        location: address,
        latitude: address ? lat : null,
        longitude: address ? lng : null,
        mapsLink,
      };
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenHeader
        title={t("account_details.title")}
        onBack={() => safeGoBack(router, backFallback)}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="camera-outline" size={18} color={theme.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>
                {t("account_details.profile_image") ||
                  t("provider.profile.edit_dialog.profile_image")}
              </Text>
              {isBusiness ? (
                <Text style={styles.sectionDesc}>
                  {t("account_details.profile_image_hint") ||
                    t("provider.profile.edit_dialog.upload_logo")}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.photoRow}>
            <View style={styles.avatar}>
              <ProfileImage
                uri={previewUri}
                style={styles.avatarImage}
                fallback={<Text style={styles.avatarInitials}>{initials}</Text>}
              />
            </View>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={handlePickProfileImage}
              disabled={isLoading || uploadingImage}
              activeOpacity={0.85}
            >
              {uploadingImage ? (
                <ActivityIndicator color={theme.primaryDark} />
              ) : (
                <>
                  <Ionicons name="image-outline" size={18} color={theme.primaryDark} />
                  <Text style={styles.photoButtonText}>
                    {previewUri
                      ? t("account_details.change_photo")
                      : t("account_details.add_photo")}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: theme.blueBg }]}>
              <Ionicons name="person-outline" size={18} color={theme.infoDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>{t("profile.account") || "Account"}</Text>
              <Text style={styles.sectionDesc}>
                {t("account_details.profile_updated_desc") ||
                  "Update your personal information"}
              </Text>
            </View>
          </View>

          <Field label={t("account_details.email")} value={user.email} editable={false} />
          <Field
            label={t("account_details.display_name")}
            value={form.username}
            onChangeText={(username) => setForm((f) => ({ ...f, username }))}
            placeholder={t("account_details.display_name_placeholder")}
          />

          <View style={styles.field}>
            <Text style={styles.label}>{t("account_details.address") || "Address"}</Text>
            {!isBusiness ? (
              <Text style={styles.hint}>
                {t("account_details.address_hint") ||
                  "Use your current location, or search and select an exact place."}
              </Text>
            ) : null}
            <LocationAutocomplete
              value={form.location}
              exactPlaceOnly
              enableCurrentLocation={!isBusiness}
              onChange={handleAddressChange}
              placeholder={
                t("account_details.address_placeholder") ||
                t("business_signup.location_search_placeholder") ||
                "Search for your address..."
              }
            />
          </View>

          <Field
            label={t("account_details.phone_number")}
            value={form.phoneNumber}
            onChangeText={(phoneNumber) => setForm((f) => ({ ...f, phoneNumber }))}
            placeholder={t("account_details.phone_placeholder")}
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.disabled]}
          onPress={handleSave}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>{t("account_details.save_changes")}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.dangerCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: theme.destructiveBg }]}>
              <Ionicons name="warning-outline" size={18} color={theme.destructive} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: theme.destructive }]}>
                {t("account_details.danger_zone")}
              </Text>
              <Text style={styles.dangerText}>{t("account_details.danger_desc")}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.deleteButton, isDeleting && styles.disabled]}
            onPress={handleDeleteAccount}
            disabled={isDeleting}
            activeOpacity={0.85}
          >
            <Ionicons name="trash-outline" size={16} color={theme.destructive} />
            <Text style={styles.deleteButtonText}>
              {isDeleting ? t("account_details.deleting") : t("account_details.delete_account")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  editable?: boolean;
  keyboardType?: "default" | "phone-pad";
  autoCapitalize?: "none" | "sentences";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, !editable && styles.inputDisabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.mutedForeground}
        editable={editable}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.backgroundGradient,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.primaryBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.foreground,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontWeight: "700",
    fontSize: 16,
    color: theme.foreground,
  },
  sectionDesc: {
    fontSize: 13,
    color: theme.muted,
    marginTop: 2,
    lineHeight: 18,
  },
  field: {
    gap: 8,
  },
  hint: {
    fontSize: 12,
    color: theme.muted,
    lineHeight: 16,
    marginTop: -2,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.foreground,
  },
  input: {
    backgroundColor: theme.backgroundGradient,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: theme.foreground,
  },
  inputDisabled: {
    color: theme.muted,
    backgroundColor: "#F3F4F6",
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.primaryBg,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.primaryBorder,
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarInitials: {
    fontSize: 28,
    fontWeight: "800",
    color: theme.primaryDark,
  },
  photoButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.primaryBg,
    borderWidth: 1,
    borderColor: theme.primaryBorder,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  photoButtonText: {
    color: theme.primaryDark,
    fontWeight: "700",
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: theme.primaryDark,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  disabled: { opacity: 0.6 },
  dangerCard: {
    backgroundColor: theme.destructiveBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
    gap: 14,
  },
  dangerText: {
    fontSize: 13,
    color: theme.destructive,
    lineHeight: 18,
    marginTop: 2,
    opacity: 0.9,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  deleteButtonText: {
    color: theme.destructive,
    fontWeight: "700",
    fontSize: 14,
  },
});
