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
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { usersApi, storageApi, buildImageUrl } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/context/LanguageContext";
import { LocationAutocomplete, generateMapsLink, type SelectedPlace } from "@/components/LocationAutocomplete";
import { pickImageFromLibrary, type PickedImage } from "@/lib/pick-image";
import { safeGoBack } from "@/lib/navigation";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";

const PRIMARY = "#16a34a";

export default function AccountDetails() {
  const router = useRouter();
  const { t } = useLanguage();
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

  const syncFromMapsLink = async (mapsLink: string) => {
    const trimmed = mapsLink.trim();
    if (!trimmed) return;
    try {
      const data = await usersApi.extractLocation(trimmed);
      if (data?.locationName) {
        setForm((f) => ({
          ...f,
          mapsLink,
          username: data.locationName!,
          location: data.locationName!,
          latitude: data.latitude ?? f.latitude,
          longitude: data.longitude ?? f.longitude,
        }));
      }
    } catch {
      // Non-blocking: user can still edit fields manually
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>{t("auth.signInRequired")}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push("/(auth)/signin")}>
          <Text style={styles.primaryButtonText}>{t("common.signIn")}</Text>
        </TouchableOpacity>
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
      safeGoBack(
        router,
        user.role === "PROVIDER" || user.role === "PENDING_PROVIDER"
          ? "/(provider)/profile"
          : "/(client)/profile"
      );
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
              router.replace("/(auth)/signin");
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            safeGoBack(
              router,
              user.role === "PROVIDER" || user.role === "PENDING_PROVIDER"
                ? "/(provider)/profile"
                : "/(client)/profile"
            )
          }
        >
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("account_details.title")}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>
            {t("account_details.profile_image") || t("provider.profile.edit_dialog.profile_image")}
          </Text>
          {isBusiness ? (
            <Text style={styles.hint}>
              {t("account_details.profile_image_hint") ||
                t("provider.profile.edit_dialog.upload_logo")}
            </Text>
          ) : null}
          <View style={styles.photoRow}>
            <View style={styles.avatar}>
              {previewUri ? (
                <Image source={{ uri: previewUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarInitials}>{initials}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={handlePickProfileImage}
              disabled={isLoading || uploadingImage}
            >
              {uploadingImage ? (
                <ActivityIndicator color={PRIMARY} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={18} color={PRIMARY} />
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
        <Field label={t("account_details.email")} value={user.email} editable={false} />
        <Field
          label={t("account_details.display_name")}
          value={form.username}
          onChangeText={(username) => setForm((f) => ({ ...f, username }))}
          placeholder={t("account_details.display_name_placeholder")}
        />
        <View style={styles.field}>
          <Text style={styles.label}>{t("account_details.location")}</Text>
          <LocationAutocomplete
            value={form.location}
            onChange={(locationName, place?: SelectedPlace) => {
              setForm((f) => {
                const lat = place?.latitude ?? null;
                const lng = place?.longitude ?? null;
                const mapsLink = locationName.trim()
                  ? generateMapsLink(locationName.trim(), f.username, lat, lng, place?.placeId)
                  : f.mapsLink;
                return {
                  ...f,
                  location: locationName,
                  latitude: lat,
                  longitude: lng,
                  mapsLink,
                };
              });
            }}
            placeholder={
              t("business_signup.location_search_placeholder") ||
              t("account_details.location_placeholder")
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
        <Field
          label={t("account_details.maps_link")}
          value={form.mapsLink}
          onChangeText={(mapsLink) => {
            setForm((f) => ({ ...f, mapsLink }));
            syncFromMapsLink(mapsLink);
          }}
          placeholder={t("account_details.maps_placeholder")}
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.disabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>{t("account_details.save_changes")}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>{t("account_details.danger_zone")}</Text>
          <Text style={styles.dangerText}>{t("account_details.danger_desc")}</Text>
          <TouchableOpacity
            style={[styles.deleteButton, isDeleting && styles.disabled]}
            onPress={handleDeleteAccount}
            disabled={isDeleting}
          >
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
        placeholderTextColor="#999"
        editable={editable}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#111" },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: "700" },
  field: { gap: 8 },
  hint: { fontSize: 12, color: "#888", marginTop: -4 },
  photoRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#d1fae5",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarInitials: { fontSize: 28, fontWeight: "800", color: PRIMARY },
  photoButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  photoButtonText: { color: PRIMARY, fontWeight: "700", fontSize: 14 },
  label: { fontSize: 14, fontWeight: "600", color: "#333" },
  input: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#111",
  },
  inputDisabled: { color: "#888", backgroundColor: "#fafafa" },
  primaryButton: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  disabled: { opacity: 0.6 },
  dangerZone: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    gap: 8,
  },
  dangerTitle: { fontSize: 16, fontWeight: "700", color: "#991b1b" },
  dangerText: { fontSize: 13, color: "#b91c1c", lineHeight: 18 },
  deleteButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#ef4444",
    alignItems: "center",
  },
  deleteButtonText: { color: "#fff", fontWeight: "700" },
});
