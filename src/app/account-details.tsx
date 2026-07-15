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
import { usersApi } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/context/LanguageContext";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";

const PRIMARY = "#16a34a";

export default function AccountDetails() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, logoutAsync, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState({
    username: "",
    location: "",
    phoneNumber: "",
    mapsLink: "",
  });

  useEffect(() => {
    if (!user) return;
    setForm({
      username: user.username ?? "",
      location: user.location ?? "",
      phoneNumber: user.phoneNumber ? String(user.phoneNumber) : "",
      mapsLink: user.mapsLink ?? "",
    });
  }, [user]);

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
      } = { username };

      const location = form.location.trim();
      if (location) payload.location = location;

      const phoneDigits = form.phoneNumber.replace(/\D/g, "");
      if (phoneDigits) payload.phoneNumber = parseInt(phoneDigits, 10);

      const mapsLink = form.mapsLink.trim();
      if (mapsLink) payload.mapsLink = mapsLink;

      await usersApi.updateProfile(payload);
      await queryClient.invalidateQueries({ queryKey: ["/auth/get-user-by-token"] });
      Toast.show({
        type: "success",
        text1: t("account_details.profile_updated"),
        text2: t("account_details.profile_updated_desc"),
      });
      router.back();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: error.message || t("account_details.update_failed"),
      });
    } finally {
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("account_details.title")}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label={t("account_details.email")} value={user.email} editable={false} />
        <Field
          label={t("account_details.display_name")}
          value={form.username}
          onChangeText={(username) => setForm((f) => ({ ...f, username }))}
          placeholder={t("account_details.display_name_placeholder")}
        />
        <Field
          label={t("account_details.location")}
          value={form.location}
          onChangeText={(location) => setForm((f) => ({ ...f, location }))}
          placeholder={t("account_details.location_placeholder")}
        />
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
          onChangeText={(mapsLink) => setForm((f) => ({ ...f, mapsLink }))}
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
