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
  Pressable,
} from "react-native";
import { useRouter, Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authApi, usersApi, tokenStorage } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/context/LanguageContext";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { ApiError, sanitizeErrorMessage } from "@/utils/errorUtils";
import { clearAuthIntentRole, writeAuthIntentRole } from "@/lib/authIntent";
import {
  LocationAutocomplete,
  generateMapsLink,
  type SelectedPlace,
} from "@/components/LocationAutocomplete";
import { LocationMap } from "@/components/LocationMap";

/** Match sign-in (Too Good To Go–style) palette */
const GREEN = "#004225";
const CREAM = "#F7F5F0";
const MUTED = "#5C6B63";
const LINE = "#C8CFC9";

type ViewMode = "email" | "account" | "details" | "phone" | "verify" | "success";

function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, "");
}

export default function ProviderSignup() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { user, isLoading: authLoading, refreshAuth } = useAuth();

  const [view, setView] = useState<ViewMode>("email");
  const [submitting, setSubmitting] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [location, setLocation] = useState("");
  const [mapsLink, setMapsLink] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [placeId, setPlaceId] = useState("");

  useEffect(() => {
    writeAuthIntentRole("PROVIDER");
  }, []);

  const showError = (message: string) => {
    Toast.show({ type: "error", text1: t("common.error"), text2: message });
  };

  const showSuccess = (message: string) => {
    Toast.show({ type: "success", text1: t("common.success"), text2: message });
  };

  const handleLocationChange = (locationName: string, place?: SelectedPlace) => {
    const extractedBusinessName = place?.name?.trim() || "";
    const lat = place?.latitude ?? null;
    const lng = place?.longitude ?? null;
    const nextPlaceId = place?.placeId || "";

    setLocation(locationName);
    setLatitude(lat);
    setLongitude(lng);
    setPlaceId(nextPlaceId);

    const isLocationCleared = !locationName.trim();
    const wasBusinessNameFromLocation =
      businessName.trim() &&
      (businessName.trim() === location.trim() ||
        (!!extractedBusinessName && businessName.trim() === extractedBusinessName));

    let nextBusinessName = businessName;
    if (isLocationCleared) {
      nextBusinessName = "";
    } else if (!businessName.trim()) {
      nextBusinessName = extractedBusinessName;
    } else if (extractedBusinessName && wasBusinessNameFromLocation) {
      nextBusinessName = extractedBusinessName;
    }

    if (nextBusinessName !== businessName) {
      setBusinessName(nextBusinessName);
    }

    setMapsLink(
      locationName.trim()
        ? generateMapsLink(
            locationName.trim(),
            nextBusinessName,
            lat,
            lng,
            nextPlaceId
          )
        : ""
    );
  };

  const handleEmailContinue = () => {
    if (!email.includes("@")) {
      showError(t("signin.error_email_required"));
      return;
    }
    setView("account");
  };

  const handleAccountContinue = () => {
    if (!businessName.trim()) {
      showError(
        t("business_signup.error_business_name") ||
          "Business name is required."
      );
      return;
    }
    if (businessName.trim().length < 2) {
      showError(
        t("business_signup.error_business_name_short") ||
          "Business name must be at least 2 characters."
      );
      return;
    }
    if (password.length < 8) {
      showError(t("signin.error_password_short"));
      return;
    }
    if (!confirmPassword) {
      showError(t("signin.error_confirm_password_required"));
      return;
    }
    if (password !== confirmPassword) {
      showError(t("signin.error_password_mismatch"));
      return;
    }
    if (!termsAccepted) {
      showError(t("business_signup.error_terms"));
      return;
    }
    setView("details");
  };

  const handleLocationContinue = () => {
    if (!location.trim() || location.trim().length < 5) {
      showError(
        t("business_signup.error_location") ||
          "Please enter a complete business address."
      );
      return;
    }
    setView("phone");
  };

  const finishProviderOnboarding = async () => {
    await clearAuthIntentRole();
    const authedUser = await refreshAuth();
    setView("success");
    setTimeout(() => {
      if (
        authedUser?.role === "PROVIDER" ||
        authedUser?.role === "PENDING_PROVIDER"
      ) {
        router.replace("/(provider)/dashboard");
      } else {
        router.replace("/");
      }
    }, 1800);
  };

  const handleSubmit = async () => {
    if (!location.trim() || location.trim().length < 5) {
      showError(
        t("business_signup.error_location") ||
          "Please enter a complete business address."
      );
      setView("details");
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      showError(
        t("business_signup.error_phone_required") ||
          "Phone number is required."
      );
      return;
    }
    if (normalizedPhone.length < 8 || normalizedPhone.length > 15) {
      showError(t("business_signup.error_phone_invalid"));
      return;
    }

    setSubmitting(true);
    let createdUser = false;
    let hadToken = false;

    try {
      const phoneForBackend =
        normalizedPhone.length > 10
          ? normalizedPhone.slice(-10)
          : normalizedPhone;

      const nextMapsLink =
        mapsLink.trim() ||
        generateMapsLink(
          location.trim(),
          businessName.trim(),
          latitude,
          longitude,
          placeId
        );

      const signupResponse = await authApi.registerBusiness({
        email: email.trim(),
        phoneNumber: phoneForBackend,
        password,
        username: businessName.trim(),
        location: location.trim(),
        mapsLink: nextMapsLink,
        latitude,
        longitude,
      });

      if (!signupResponse.accessToken) {
        throw new Error("Invalid response from server");
      }

      createdUser = true;
      hadToken = true;

      if (
        signupResponse.user &&
        signupResponse.user.emailVerified === false
      ) {
        try {
          await authApi.sendVerificationEmail(email.trim());
          showSuccess(t("signin.verification_sent"));
        } catch {
          showError(t("signin.error_verification_email_failed"));
        }
        setView("verify");
        return;
      }

      await usersApi.setRole("PROVIDER");
      await usersApi.updateDetails({
        phoneNumber: phoneForBackend,
        mapsLink: nextMapsLink,
        location: location.trim(),
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
      });

      await finishProviderOnboarding();
    } catch (err: any) {
      if (createdUser && hadToken) {
        try {
          await authApi.cleanupPartialSignup();
        } catch {
          // best-effort
        }
        try {
          await tokenStorage.remove();
        } catch {
          // ignore
        }
      }

      if (err instanceof ApiError && err.status === 409) {
        showError(t("signin.error_account_exists"));
        router.push("/(auth)/signin");
        return;
      }

      const msg = sanitizeErrorMessage(err, {
        action: "create business account",
        defaultMessage: t("business_signup.error_generic"),
      });
      if (msg.toLowerCase().includes("already exists")) {
        showError(t("signin.error_account_exists"));
        router.push("/(auth)/signin");
      } else {
        showError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      showError("Please enter a valid 6-digit code.");
      return;
    }

    setVerifyingCode(true);
    try {
      const response = await authApi.verifyEmailCode(
        email.trim(),
        verificationCode.trim()
      );
      if (!response.verified) throw new Error(t("signin.error_verify_code"));

      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      const phoneForBackend =
        normalizedPhone.length > 10
          ? normalizedPhone.slice(-10)
          : normalizedPhone;
      const nextMapsLink =
        mapsLink.trim() ||
        generateMapsLink(
          location.trim(),
          businessName.trim(),
          latitude,
          longitude,
          placeId
        );

      await usersApi.setRole("PROVIDER");
      await usersApi.updateDetails({
        phoneNumber: phoneForBackend,
        mapsLink: nextMapsLink,
        location: location.trim(),
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
      });

      await finishProviderOnboarding();
    } catch (error: any) {
      showError(
        sanitizeErrorMessage(error, {
          action: "verify email code",
          defaultMessage: t("signin.error_verify_code"),
        })
      );
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleResendCode = async () => {
    if (!email.trim()) {
      showError(t("signin.error_email_required"));
      return;
    }
    setSubmitting(true);
    try {
      await authApi.sendVerificationEmail(email.trim());
      showSuccess(t("signin.verification_sent"));
    } catch (error: any) {
      showError(
        sanitizeErrorMessage(error, {
          action: "resend verification code",
          defaultMessage: t("signin.error_resend_code"),
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    if (view === "account") {
      setView("email");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      return;
    }
    if (view === "details") {
      setView("account");
      return;
    }
    if (view === "phone") {
      setView("details");
      return;
    }
    if (view === "verify") {
      setView("phone");
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace("/(auth)/welcome");
  };

  const busy = view === "verify" ? verifyingCode : submitting;

  const onPrimary = () => {
    if (view === "email") return handleEmailContinue();
    if (view === "account") return handleAccountContinue();
    if (view === "details") return handleLocationContinue();
    if (view === "phone") return handleSubmit();
    if (view === "verify") return handleVerifyCode();
  };

  const primaryLabel =
    view === "phone"
      ? t("business_signup.submit")
      : view === "verify"
        ? t("signin.verify_button")
        : t("common.continue") || "Continue";

  const headline =
    view === "email"
      ? t("business_signup.tgtg_email") || "What's your business email?"
      : view === "account"
        ? t("business_signup.tgtg_create") || "Create your provider account"
        : view === "details"
          ? t("business_signup.tgtg_details") || "Tell us about your business"
          : view === "phone"
            ? t("business_signup.tgtg_phone") || "What's your business phone number?"
            : view === "verify"
              ? t("signin.verify_email_title")
              : t("business_signup.success_title");

  if (authLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  if (user?.role === "PROVIDER" || user?.role === "PENDING_PROVIDER") {
    return <Redirect href="/(provider)/dashboard" />;
  }

  if (user?.role === "CLIENT") {
    return <Redirect href="/account-details" />;
  }

  if (view === "success") {
    return (
      <View style={[styles.root, styles.successWrap]}>
        <Ionicons name="checkmark-circle" size={72} color={GREEN} />
        <Text style={styles.successTitle}>
          {t("business_signup.success_title")}
        </Text>
        <Text style={styles.successMessage}>
          {t("business_signup.success_message")}
        </Text>
        <ActivityIndicator color={GREEN} style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.nav}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.navBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={28} color={GREEN} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Text style={styles.headline}>{headline}</Text>

          {view === "email" && (
            <>
              <Text style={styles.helper}>
                {t("business_signup.tgtg_email_helper") ||
                  "We'll use this for your provider account."}
              </Text>
              <UnderlineInput
                value={email}
                onChangeText={setEmail}
                placeholder={t("business_signup.email_placeholder")}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                autoFocus
                returnKeyType="next"
                onSubmitEditing={handleEmailContinue}
              />
              <TouchableOpacity
                style={styles.switchHit}
                onPress={() => router.push("/(auth)/signin")}
              >
                <Text style={styles.switchText}>
                  {t("business_signup.already_have_account")}{" "}
                  <Text style={styles.switchLink}>
                    {t("business_signup.sign_in_here")}
                  </Text>
                </Text>
              </TouchableOpacity>
            </>
          )}

          {view === "account" && (
            <>
              <Text style={styles.helper}>{email}</Text>
              <UnderlineInput
                value={businessName}
                onChangeText={(v) => {
                  setBusinessName(v);
                  if (location.trim()) {
                    setMapsLink(
                      generateMapsLink(
                        location.trim(),
                        v.trim(),
                        latitude,
                        longitude,
                        placeId
                      )
                    );
                  }
                }}
                placeholder={t("business_signup.business_name_placeholder")}
                autoComplete="organization"
                textContentType="organizationName"
                autoFocus
                autoCapitalize="words"
              />
              <UnderlineInput
                value={password}
                onChangeText={setPassword}
                placeholder={t("signin.password_placeholder_signup")}
                secure
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
                autoComplete="password-new"
                textContentType="newPassword"
              />
              <Text style={styles.hint}>{t("signin.password_hint")}</Text>
              <UnderlineInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t("signin.confirm_password_placeholder")}
                secure
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
                autoComplete="password-new"
                textContentType="newPassword"
              />
              <Pressable
                style={styles.termsRow}
                onPress={() => setTermsAccepted(!termsAccepted)}
              >
                <View
                  style={[styles.checkbox, termsAccepted && styles.checkboxOn]}
                >
                  {termsAccepted ? (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  ) : null}
                </View>
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
              </Pressable>
            </>
          )}

          {view === "details" && (
            <>
              <Text style={styles.helper}>
                {t("business_signup.tgtg_details_helper") ||
                  "Add your address so customers can find you."}
              </Text>
              <Text style={styles.fieldLabel}>
                {t("business_signup.address")}
              </Text>
              <LocationAutocomplete
                value={location}
                onChange={handleLocationChange}
                placeholder={
                  t("business_signup.location_search_placeholder") ||
                  "Search for your business location..."
                }
                variant="underline"
              />
              <Text style={styles.hint}>
                {t("business_signup.location_search_hint")}
              </Text>
              {latitude != null && longitude != null ? (
                <LocationMap
                  latitude={latitude}
                  longitude={longitude}
                  label={location}
                  mapsUrl={mapsLink}
                />
              ) : null}
            </>
          )}

          {view === "phone" && (
            <>
              <Text style={styles.helper}>
                {t("business_signup.tgtg_phone_helper") ||
                  "Customers use this number to reach you at pickup."}
              </Text>
              <Text style={styles.fieldLabel}>
                {t("business_signup.phone")}
              </Text>
              <UnderlineInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder={t("business_signup.phone_placeholder")}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                autoFocus
              />
            </>
          )}

          {view === "verify" && (
            <>
              <Text style={styles.helper}>
                {t("signin.verify_email_desc")}{" "}
                <Text style={styles.emphasis}>{email.trim()}</Text>
              </Text>
              <UnderlineInput
                value={verificationCode}
                onChangeText={(v) =>
                  setVerificationCode(v.replace(/\D/g, "").slice(0, 6))
                }
                placeholder={t("signin.verification_code_placeholder")}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                maxLength={6}
                center
                autoFocus
              />
              <TouchableOpacity
                onPress={handleResendCode}
                disabled={submitting}
              >
                <Text style={styles.forgotText}>
                  {submitting
                    ? t("signin.sending")
                    : t("signin.resend_code")}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <TouchableOpacity
            style={[styles.pill, busy && styles.pillDisabled]}
            onPress={onPrimary}
            disabled={busy}
            activeOpacity={0.88}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.pillText}>{primaryLabel}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function UnderlineInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secure,
  showPassword,
  onTogglePassword,
  autoComplete,
  textContentType,
  maxLength,
  center,
  autoFocus,
  returnKeyType,
  onSubmitEditing,
  autoCapitalize,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad";
  secure?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  autoComplete?: any;
  textContentType?: any;
  maxLength?: number;
  center?: boolean;
  autoFocus?: boolean;
  returnKeyType?: "next" | "go" | "done";
  onSubmitEditing?: () => void;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
      <TextInput
        style={[
          styles.input,
          center && styles.inputCenter,
          secure && onTogglePassword ? { paddingRight: 40 } : null,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9AA59E"
        keyboardType={keyboardType}
        autoCapitalize={
          autoCapitalize ??
          (keyboardType === "email-address" ? "none" : "sentences")
        }
        autoCorrect={false}
        secureTextEntry={secure && !showPassword}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={autoComplete}
        textContentType={textContentType}
        maxLength={maxLength}
        autoFocus={autoFocus}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
      />
      {secure && onTogglePassword ? (
        <TouchableOpacity
          onPress={onTogglePassword}
          style={styles.eye}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={22}
            color={MUTED}
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: CREAM,
  },
  flex: { flex: 1 },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CREAM,
  },
  successWrap: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: GREEN,
    marginTop: 16,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  successMessage: {
    fontSize: 16,
    color: MUTED,
    marginTop: 10,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
  },

  nav: {
    height: 52,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  navBack: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  scroll: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },

  headline: {
    fontSize: 32,
    fontWeight: "800",
    color: GREEN,
    letterSpacing: -0.6,
    lineHeight: 38,
    marginBottom: 10,
  },
  helper: {
    fontSize: 16,
    lineHeight: 22,
    color: MUTED,
    marginBottom: 28,
  },
  emphasis: {
    color: GREEN,
    fontWeight: "700",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: MUTED,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  inputWrap: {
    borderBottomWidth: 2,
    borderBottomColor: LINE,
    marginBottom: 22,
    minHeight: 48,
    justifyContent: "center",
  },
  inputWrapFocused: {
    borderBottomColor: GREEN,
  },
  input: {
    fontSize: 18,
    color: GREEN,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    paddingHorizontal: 0,
  },
  inputCenter: {
    textAlign: "center",
    letterSpacing: 8,
    fontWeight: "700",
    fontSize: 26,
  },
  eye: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },

  hint: {
    fontSize: 13,
    color: MUTED,
    marginTop: -14,
    marginBottom: 18,
    lineHeight: 18,
  },
  forgotText: {
    fontSize: 15,
    fontWeight: "700",
    color: GREEN,
    marginTop: 4,
  },

  switchHit: {
    marginTop: 8,
  },
  switchText: {
    fontSize: 15,
    color: MUTED,
  },
  switchLink: {
    color: GREEN,
    fontWeight: "700",
  },

  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: LINE,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxOn: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: MUTED,
    lineHeight: 20,
  },
  termsLink: {
    color: GREEN,
    fontWeight: "700",
    textDecorationLine: "underline",
  },

  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    backgroundColor: CREAM,
  },
  pill: {
    backgroundColor: GREEN,
    borderRadius: 28,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  pillDisabled: { opacity: 0.5 },
  pillText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});
