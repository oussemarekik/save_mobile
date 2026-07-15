import React, { useState, useEffect } from "react";
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
} from "react-native";
import { useRouter, Link, Redirect } from "expo-router";
import { authApi, usersApi, tokenStorage } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/context/LanguageContext";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import Toast from "react-native-toast-message";
import { sanitizeErrorMessage } from "@/utils/errorUtils";
import { writeAuthIntentRole } from "@/lib/authIntent";

function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, "");
}

function generateMapsLink(locationName: string, businessName?: string): string {
  const query = businessName
    ? `${encodeURIComponent(businessName)} ${encodeURIComponent(locationName)}`
    : encodeURIComponent(locationName);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export default function ProviderSignup() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, isLoading: authLoading, refreshAuth } = useAuth();

  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    writeAuthIntentRole("PROVIDER");
  }, []);

  const [formData, setFormData] = useState({
    businessName: "",
    location: "",
    mapsLink: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });

  const updateField = (name: keyof typeof formData, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "location" && value.trim()) {
        next.mapsLink = generateMapsLink(value.trim(), prev.businessName);
      }
      if (name === "businessName" && prev.location.trim()) {
        next.mapsLink = generateMapsLink(prev.location.trim(), value.trim());
      }
      return next;
    });
    setErrorMessage("");
  };

  const validateForm = () => {
    const normalizedPhone = normalizePhoneNumber(formData.phoneNumber);

    if (!formData.businessName.trim()) {
      setErrorMessage("Business name is required. Please enter your business name.");
      return false;
    }
    if (formData.businessName.trim().length < 2) {
      setErrorMessage("Business name must be at least 2 characters long.");
      return false;
    }
    if (formData.businessName.trim().length > 100) {
      setErrorMessage("Business name is too long. Please enter a maximum of 100 characters.");
      return false;
    }
    if (!formData.location.trim()) {
      setErrorMessage("Business location is required. Please enter your business address.");
      return false;
    }
    if (formData.location.trim().length < 5) {
      setErrorMessage("Location is too short. Please enter a complete address.");
      return false;
    }
    if (!formData.email.trim()) {
      setErrorMessage("Email is required for business account creation.");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setErrorMessage("Invalid email format. Please enter a valid email address.");
      return false;
    }
    if (!normalizedPhone) {
      setErrorMessage("Phone number is required. Please enter your business phone number.");
      return false;
    }
    if (normalizedPhone.length < 8) {
      setErrorMessage("Phone number is too short. Please enter at least 8 digits.");
      return false;
    }
    if (normalizedPhone.length > 15) {
      setErrorMessage("Phone number is too long. Please enter maximum 15 digits.");
      return false;
    }
    if (formData.password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return false;
    }
    if (formData.password.length > 128) {
      setErrorMessage("Password is too long. Maximum 128 characters.");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match. Please confirm your password carefully.");
      return false;
    }
    if (!termsAccepted) {
      setErrorMessage(t("business_signup.error_terms"));
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrorMessage("");

    let createdUser = false;
    let hadToken = false;

    try {
      const normalizedPhone = normalizePhoneNumber(formData.phoneNumber);
      const phoneForBackend =
        normalizedPhone.length > 10 ? normalizedPhone.slice(-10) : normalizedPhone;

      const signupResponse = await authApi.registerBusiness({
        email: formData.email.trim(),
        phoneNumber: phoneForBackend,
        password: formData.password,
        username: formData.businessName.trim(),
        location: formData.location.trim(),
        mapsLink: formData.mapsLink.trim(),
      });

      if (!signupResponse.accessToken) throw new Error("Invalid response from server");

      createdUser = true;
      hadToken = true;

      await usersApi.setRole("PROVIDER");
      await usersApi.updateDetails({
        phoneNumber: phoneForBackend,
        mapsLink: formData.mapsLink.trim(),
        location: formData.location.trim(),
      });

      const authedUser = await refreshAuth();
      setShowSuccess(true);

      setTimeout(() => {
        if (
          authedUser?.role === "PROVIDER" ||
          authedUser?.role === "PENDING_PROVIDER"
        ) {
          router.replace("/(provider)/dashboard");
        } else {
          router.replace("/");
        }
      }, 2000);
    } catch (err: any) {
      if (createdUser && hadToken) {
        try {
          await tokenStorage.remove();
          await authApi.cleanupPartialSignup();
        } catch {
          // best-effort cleanup
        }
      }
      const msg = sanitizeErrorMessage(err, {
        action: "create business account",
        defaultMessage: t("business_signup.error_generic"),
      });
      setErrorMessage(msg);
      Toast.show({ type: "error", text1: t("common.error"), text2: msg });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  if (showSuccess) {
    return (
      <View style={styles.centered}>
        <Ionicons name="checkmark-circle" size={72} color={theme.primary} />
        <Text style={styles.successTitle}>{t("business_signup.success_title")}</Text>
        <Text style={styles.successMessage}>{t("business_signup.success_message")}</Text>
        <ActivityIndicator color={theme.primary} style={{ marginTop: 16 }} />
      </View>
    );
  }

  if (user?.role === "PROVIDER" || user?.role === "PENDING_PROVIDER") {
    return <Redirect href="/(provider)/dashboard" />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>{t("business_signup.title")}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.subtitle}>{t("business_signup.subtitle")}</Text>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Field
          label={t("business_signup.business_name")}
          value={formData.businessName}
          onChangeText={(v) => updateField("businessName", v)}
          placeholder={t("business_signup.business_name_placeholder")}
        />
        <Field
          label="Business Location"
          value={formData.location}
          onChangeText={(v) => updateField("location", v)}
          placeholder="123 Main St, Tunis"
        />
        {formData.mapsLink ? (
          <Text style={styles.mapsPreview} numberOfLines={2}>
            Maps: {formData.mapsLink}
          </Text>
        ) : null}
        <Field
          label={t("business_signup.email")}
          value={formData.email}
          onChangeText={(v) => updateField("email", v)}
          placeholder={t("business_signup.email_placeholder")}
          keyboardType="email-address"
        />
        <Field
          label={t("business_signup.phone")}
          value={formData.phoneNumber}
          onChangeText={(v) => updateField("phoneNumber", v)}
          placeholder={t("business_signup.phone_placeholder")}
          keyboardType="phone-pad"
        />
        <Field
          label={t("business_signup.password")}
          value={formData.password}
          onChangeText={(v) => updateField("password", v)}
          placeholder={t("business_signup.password_placeholder")}
          secure
        />
        <Field
          label={t("business_signup.confirm_password")}
          value={formData.confirmPassword}
          onChangeText={(v) => updateField("confirmPassword", v)}
          placeholder={t("business_signup.confirm_password")}
          secure
        />

        <TouchableOpacity
          style={styles.termsRow}
          onPress={() => setTermsAccepted(!termsAccepted)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={termsAccepted ? "checkbox" : "square-outline"}
            size={22}
            color={termsAccepted ? theme.primary : "#888"}
          />
          <Text style={styles.termsText}>
            {t("business_signup.terms_accept")}{" "}
            <Text
              style={styles.termsLink}
              onPress={() => router.push("/legal/terms" as any)}
            >
              {t("business_signup.terms_link")}
            </Text>{" "}
            {t("business_signup.terms_and")}{" "}
            <Text
              style={styles.termsLink}
              onPress={() => router.push("/legal/privacy" as any)}
            >
              {t("business_signup.privacy_link")}
            </Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.disabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>{t("business_signup.submit")}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.signInRow}>
          <Text style={styles.signInMuted}>{t("business_signup.already_have_account")}</Text>
          <Link href="/(auth)/signin" asChild>
            <TouchableOpacity>
              <Text style={styles.signInLink}>{t("business_signup.sign_in_here")}</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <View style={styles.benefitsBox}>
          <Text style={styles.benefitsTitle}>{t("business_signup.benefits_title")}</Text>
          <Text style={styles.benefitItem}>• {t("business_signup.benefit1")}</Text>
          <Text style={styles.benefitItem}>• {t("business_signup.benefit2")}</Text>
          <Text style={styles.benefitItem}>• {t("business_signup.benefit3")}</Text>
          <Text style={styles.benefitItem}>• {t("business_signup.benefit4")}</Text>
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
  keyboardType,
  secure,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  secure?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#999"
        keyboardType={keyboardType}
        secureTextEntry={secure}
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  loadingText: { marginTop: 12, color: theme.muted },
  successTitle: { fontSize: 24, fontWeight: "800", color: "#111", marginTop: 16, textAlign: "center" },
  successMessage: { fontSize: 15, color: theme.muted, marginTop: 8, textAlign: "center", lineHeight: 22 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { fontSize: 20, fontWeight: "800", color: "#111", flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  subtitle: { fontSize: 14, color: theme.muted, marginBottom: 20, lineHeight: 20 },
  errorBox: {
    backgroundColor: theme.destructiveBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: { color: theme.destructive, fontSize: 14, lineHeight: 20 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8 },
  input: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#111",
  },
  mapsPreview: { fontSize: 11, color: theme.muted, marginTop: -8, marginBottom: 12 },
  termsRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 20 },
  termsText: { flex: 1, fontSize: 13, color: "#555", lineHeight: 20 },
  termsLink: { color: theme.primary, fontWeight: "700", textDecorationLine: "underline" },
  submitBtn: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  disabled: { opacity: 0.6 },
  signInRow: { marginTop: 20, alignItems: "center", gap: 4 },
  signInMuted: { fontSize: 14, color: theme.muted },
  signInLink: { fontSize: 14, color: theme.primary, fontWeight: "700" },
  benefitsBox: {
    marginTop: 28,
    padding: 16,
    backgroundColor: theme.primaryBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.primaryBorder,
  },
  benefitsTitle: { fontWeight: "700", fontSize: 15, marginBottom: 10, color: "#111" },
  benefitItem: { fontSize: 13, color: "#444", lineHeight: 22 },
});
