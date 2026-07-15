import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, Link, useLocalSearchParams, Redirect } from "expo-router";
import { authApi, usersApi } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { getPostAuthRedirect } from "@/lib/redirect-utils";
import { readAuthIntentRole } from "@/lib/authIntent";
import { GoogleOAuthButton, FacebookOAuthButton } from "@/components/OAuthButtons";
import { useLanguage } from "@/context/LanguageContext";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { ApiError, sanitizeErrorMessage } from "@/utils/errorUtils";

type ViewMode = "main" | "verify" | "forgot" | "reset";

export default function SignIn() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { user, isLoading: authLoading, refreshAuth } = useAuth();
  const { t } = useLanguage();

  const [view, setView] = useState<ViewMode>("main");
  const [isSignUp, setIsSignUp] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [postAuthRedirect, setPostAuthRedirect] = useState<string | null>(null);

  const [signUpEmail, setSignUpEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verifyingCode, setVerifyingCode] = useState(false);

  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  useEffect(() => {
    if (mode === "signup") setIsSignUp(true);
  }, [mode]);

  useEffect(() => {
    if (authLoading || !user?.role || user.role === "NONE") {
      setPostAuthRedirect(null);
      return;
    }
    let cancelled = false;
    readAuthIntentRole().then((intentRole) => {
      if (cancelled) return;
      const dest = getPostAuthRedirect(user, intentRole);
      setPostAuthRedirect(dest === "/(auth)/signin" ? null : dest);
    });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id, user?.role]);

  if (authLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (postAuthRedirect) {
    return <Redirect href={postAuthRedirect as any} />;
  }

  const showError = (message: string) => {
    Toast.show({ type: "error", text1: t("common.error"), text2: message });
  };

  const showSuccess = (message: string) => {
    Toast.show({ type: "success", text1: t("common.success"), text2: message });
  };

  const handleSignIn = async () => {
    if (!email.includes("@")) {
      showError(t("signin.error_email_required"));
      return;
    }
    if (!password) {
      showError(t("signin.error_password_required"));
      return;
    }

    setSubmitting(true);
    try {
      await authApi.login(email.trim(), password);
      const userData = await authApi.getUserByToken();

      if (!userData.role || userData.role === "NONE") {
        try {
          await usersApi.setRole("CLIENT");
        } catch {
          // continue with redirect
        }
      }

      await refreshAuth();
      const updated = await authApi.getUserByToken();
      const intentRole = await readAuthIntentRole();
      showSuccess(t("signin.sign_in"));
      router.replace(getPostAuthRedirect(updated, intentRole) as any);
    } catch (error: any) {
      showError(
        sanitizeErrorMessage(error, {
          action: "sign in",
          defaultMessage: t("signin.error_invalid_credentials"),
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async () => {
    if (!email.includes("@")) {
      showError(t("signin.error_email_required"));
      return;
    }
    if (!username.trim()) {
      showError(t("signin.error_username_required"));
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
      showError(t("signin.error_terms"));
      return;
    }

    setSubmitting(true);
    try {
      const response = await authApi.register(email.trim(), username.trim(), password);
      const emailVerified = response.user?.emailVerified !== false;

      if (response.user && response.user.emailVerified === false) {
        setSignUpEmail(email.trim());
        setView("verify");
        try {
          await authApi.sendVerificationEmail(email.trim());
          showSuccess(t("signin.verification_sent"));
        } catch {
          showError(t("signin.error_verification_email_failed"));
        }
        return;
      }

      const intentRole = await readAuthIntentRole();
      const targetRole = intentRole === "PROVIDER" ? "PROVIDER" : "CLIENT";
      await usersApi.setRole(targetRole);
      await refreshAuth();
      router.replace(
        targetRole === "PROVIDER" ? "/(provider)/dashboard" : "/(client)/Home"
      );
    } catch (error: any) {
      if (error instanceof ApiError && error.status === 409) {
        showError(t("signin.error_account_exists"));
        setIsSignUp(false);
        setPassword("");
        setUsername("");
        setConfirmPassword("");
        return;
      }
      const msg = sanitizeErrorMessage(error, {
        action: "sign up",
        defaultMessage: t("signin.error_signup_failed"),
      });
      if (msg.toLowerCase().includes("already exists")) {
        showError(t("signin.error_account_exists"));
        setIsSignUp(false);
        setPassword("");
        setUsername("");
        setConfirmPassword("");
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
      const response = await authApi.verifyEmailCode(signUpEmail, verificationCode.trim());
      if (!response.verified) throw new Error(t("signin.error_verify_code"));

      const userData = await authApi.getUserByToken();
      const role = userData.role;

      if (!role || role === "NONE") {
        const intentRole = await readAuthIntentRole();
        const targetRole = intentRole === "PROVIDER" ? "PROVIDER" : "CLIENT";
        await usersApi.setRole(targetRole);
        await refreshAuth();
        router.replace(
          targetRole === "PROVIDER" ? "/(provider)/dashboard" : "/(client)/Home"
        );
        return;
      }

      const intentRole = await readAuthIntentRole();
      await refreshAuth();
      router.replace(getPostAuthRedirect(userData, intentRole) as any);
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
    const emailToSend = signUpEmail || email;
    if (!emailToSend) {
      showError(t("signin.error_email_required"));
      return;
    }
    setSubmitting(true);
    try {
      await authApi.sendVerificationEmail(emailToSend);
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

  const handleExploreWithoutVerification = async () => {
    try {
      await usersApi.setRole("CLIENT");
      await refreshAuth();
      router.replace("/(client)/Home");
    } catch {
      router.replace("/(client)/Home");
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail.includes("@")) {
      showError(t("signin.error_email_required"));
      return;
    }
    setSubmitting(true);
    try {
      const response = await authApi.forgotPassword(forgotPasswordEmail.trim());
      if (response.sent) {
        setView("reset");
        showSuccess(t("signin.forgot_password_success"));
      } else {
        throw new Error(t("signin.forgot_password_error"));
      }
    } catch (error: any) {
      showError(
        sanitizeErrorMessage(error, {
          action: "send reset code",
          defaultMessage: t("signin.forgot_password_error"),
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (resetCode.length !== 6) {
      showError(t("signin.reset_password_invalid_code"));
      return;
    }
    if (newPassword.length < 8) {
      showError(t("signin.error_password_short"));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showError(t("signin.reset_password_mismatch"));
      return;
    }

    setSubmitting(true);
    try {
      const response = await authApi.resetPassword(
        forgotPasswordEmail.trim(),
        resetCode.trim(),
        newPassword
      );
      if (response.reset) {
        showSuccess(t("signin.reset_password_success"));
        setView("main");
        setIsSignUp(false);
        setResetCode("");
        setNewPassword("");
        setConfirmNewPassword("");
      } else {
        throw new Error(t("signin.reset_password_error"));
      }
    } catch (error: any) {
      showError(
        sanitizeErrorMessage(error, {
          action: "reset password",
          defaultMessage: t("signin.reset_password_error"),
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderMain = () => (
    <>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, !isSignUp && styles.toggleBtnActive]}
          onPress={() => setIsSignUp(false)}
        >
          <Text style={[styles.toggleText, !isSignUp && styles.toggleTextActive]}>
            {t("signin.sign_in")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, isSignUp && styles.toggleBtnActive]}
          onPress={() => setIsSignUp(true)}
        >
          <Text style={[styles.toggleText, isSignUp && styles.toggleTextActive]}>
            {t("signin.sign_up")}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t("signin.email_label")}</Text>
        <InputField
          icon="mail-outline"
          value={email}
          onChangeText={setEmail}
          placeholder={t("signin.email_placeholder")}
          keyboardType="email-address"
        />
      </View>

      {isSignUp && (
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t("signin.username_label")}</Text>
          <InputField
            icon="person-outline"
            value={username}
            onChangeText={setUsername}
            placeholder={t("signin.username_placeholder")}
          />
        </View>
      )}

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t("signin.password_label")}</Text>
        <InputField
          icon="lock-closed-outline"
          value={password}
          onChangeText={setPassword}
          placeholder={
            isSignUp ? t("signin.password_placeholder_signup") : t("signin.password_placeholder_signin")
          }
          secure
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword(!showPassword)}
        />
        {isSignUp && <Text style={styles.hint}>{t("signin.password_hint")}</Text>}
      </View>

      {isSignUp && (
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t("signin.confirm_password_label")}</Text>
          <InputField
            icon="lock-closed-outline"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t("signin.confirm_password_placeholder")}
            secure
          />
        </View>
      )}

      {isSignUp && (
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
            {t("signin.terms_accept")}{" "}
            <Text
              style={styles.termsLink}
              onPress={() => router.push("/legal/terms" as any)}
            >
              {t("signin.terms_link")}
            </Text>{" "}
            {t("signin.terms_and")}{" "}
            <Text
              style={styles.termsLink}
              onPress={() => router.push("/legal/privacy" as any)}
            >
              {t("signin.privacy_link")}
            </Text>
          </Text>
        </TouchableOpacity>
      )}

      {!isSignUp && (
        <TouchableOpacity onPress={() => { setForgotPasswordEmail(email); setView("forgot"); }}>
          <Text style={styles.forgotLink}>{t("signin.forgot_password")}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.primaryButton, submitting && styles.disabled]}
        onPress={isSignUp ? handleSignUp : handleSignIn}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>
            {isSignUp ? t("signin.sign_up") : t("signin.sign_in")}
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{t("signin.or_continue_with")}</Text>
        <View style={styles.dividerLine} />
      </View>

      <GoogleOAuthButton />
      <View style={{ height: 12 }} />
      <FacebookOAuthButton />

      <View style={styles.section}>
        <Text style={styles.mutedText}>{t("landing.for_business")}</Text>
        <Link href="/(auth)/ProviderSignup" asChild>
          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{t("landing.register_business")}</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </>
  );

  const renderVerify = () => (
    <>
      <Text style={styles.viewTitle}>{t("signin.verify_email_title")}</Text>
      <Text style={styles.viewDesc}>
        {t("signin.verify_email_desc")} <Text style={styles.emailHighlight}>{signUpEmail}</Text>
      </Text>
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t("signin.verification_code_label")}</Text>
        <TextInput
          style={styles.codeInput}
          value={verificationCode}
          onChangeText={(v) => setVerificationCode(v.replace(/\D/g, "").slice(0, 6))}
          placeholder={t("signin.verification_code_placeholder")}
          keyboardType="number-pad"
          maxLength={6}
        />
        <Text style={styles.hint}>{t("signin.verification_code_hint")}</Text>
      </View>
      <TouchableOpacity
        style={[styles.primaryButton, verifyingCode && styles.disabled]}
        onPress={handleVerifyCode}
        disabled={verifyingCode}
      >
        {verifyingCode ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>{t("signin.verify_button")}</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={handleResendCode} disabled={submitting} style={styles.linkBtn}>
        <Text style={styles.linkText}>{submitting ? t("signin.sending") : t("signin.resend_code")}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleExploreWithoutVerification} style={styles.linkBtn}>
        <Text style={styles.mutedLink}>{t("signin.explore_platform") || "Explore the platform"}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setView("main")} style={styles.linkBtn}>
        <Text style={styles.linkText}>{t("signin.back_to_signin")}</Text>
      </TouchableOpacity>
    </>
  );

  const renderForgot = () => (
    <>
      <Text style={styles.viewTitle}>{t("signin.forgot_password_title")}</Text>
      <Text style={styles.viewDesc}>{t("signin.forgot_password_desc")}</Text>
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t("signin.forgot_password_email_label")}</Text>
        <InputField
          icon="mail-outline"
          value={forgotPasswordEmail}
          onChangeText={setForgotPasswordEmail}
          placeholder={t("signin.forgot_password_email_placeholder")}
          keyboardType="email-address"
        />
      </View>
      <TouchableOpacity
        style={[styles.primaryButton, submitting && styles.disabled]}
        onPress={handleForgotPassword}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>{t("signin.forgot_password_send") || "Send reset code"}</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setView("main")} style={styles.linkBtn}>
        <Text style={styles.linkText}>{t("signin.back_to_signin")}</Text>
      </TouchableOpacity>
    </>
  );

  const renderReset = () => (
    <>
      <Text style={styles.viewTitle}>{t("signin.reset_password_title")}</Text>
      <Text style={styles.viewDesc}>{t("signin.reset_password_desc")}</Text>
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t("signin.reset_password_code_label")}</Text>
        <TextInput
          style={styles.codeInput}
          value={resetCode}
          onChangeText={(v) => setResetCode(v.replace(/\D/g, "").slice(0, 6))}
          placeholder={t("signin.reset_password_code_placeholder")}
          keyboardType="number-pad"
          maxLength={6}
        />
      </View>
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t("signin.reset_password_new_label")}</Text>
        <InputField
          icon="lock-closed-outline"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder={t("signin.reset_password_new_placeholder")}
          secure
        />
      </View>
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t("signin.reset_password_confirm_label")}</Text>
        <InputField
          icon="lock-closed-outline"
          value={confirmNewPassword}
          onChangeText={setConfirmNewPassword}
          placeholder={t("signin.reset_password_confirm_placeholder")}
          secure
        />
      </View>
      <TouchableOpacity
        style={[styles.primaryButton, submitting && styles.disabled]}
        onPress={handleResetPassword}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>{t("signin.reset_password_button")}</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setView("forgot")} style={styles.linkBtn}>
        <Text style={styles.linkText}>{t("signin.request_new_code")}</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>
            {isSignUp ? t("signin.welcome_new") : t("signin.welcome_back")}
          </Text>
          <Text style={styles.subtitle}>
            {isSignUp ? t("signin.description_new") : t("signin.description_back")}
          </Text>
        </View>

        {view === "main" && renderMain()}
        {view === "verify" && renderVerify()}
        {view === "forgot" && renderForgot()}
        {view === "reset" && renderReset()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InputField({
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secure,
  showPassword,
  onTogglePassword,
}: {
  icon: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  secure?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
}) {
  return (
    <View style={styles.inputWrapper}>
      <Ionicons name={icon as any} size={20} color="#888" style={styles.inputIcon} />
      <TextInput
        style={[styles.input, secure && onTogglePassword && { paddingRight: 44 }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#888"
        keyboardType={keyboardType}
        autoCapitalize="none"
        secureTextEntry={secure && !showPassword}
      />
      {secure && onTogglePassword && (
        <TouchableOpacity onPress={onTogglePassword} style={styles.eyeIcon}>
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={20}
            color="#888"
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 48 },
  header: { alignItems: "center", marginBottom: 24 },
  title: { fontSize: 28, fontWeight: "800", color: "#111", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 15, color: "#888", textAlign: "center", lineHeight: 22 },
  viewTitle: { fontSize: 22, fontWeight: "800", color: "#111", marginBottom: 8, textAlign: "center" },
  viewDesc: { fontSize: 14, color: "#888", textAlign: "center", marginBottom: 24, lineHeight: 20 },
  emailHighlight: { color: theme.primary, fontWeight: "700" },
  toggleRow: { flexDirection: "row", backgroundColor: "#f5f5f5", borderRadius: 12, padding: 4, marginBottom: 24 },
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 10 },
  toggleBtnActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 15, fontWeight: "600", color: "#888" },
  toggleTextActive: { color: theme.primary },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#111", marginBottom: 8 },
  hint: { fontSize: 12, color: "#888", marginTop: 6 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: "#111" },
  codeInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingVertical: 16,
    fontSize: 28,
    textAlign: "center",
    letterSpacing: 8,
    fontWeight: "700",
    color: "#111",
  },
  eyeIcon: { position: "absolute", right: 12 },
  forgotLink: { color: theme.primary, fontSize: 14, fontWeight: "600", marginBottom: 16, textAlign: "right" },
  termsRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 16 },
  termsText: { flex: 1, fontSize: 13, color: "#555", lineHeight: 20 },
  termsLink: { color: theme.primary, fontWeight: "700", textDecorationLine: "underline" },
  primaryButton: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  disabled: { opacity: 0.6 },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 24, gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e0e0e0" },
  dividerText: { fontSize: 11, color: "#888", fontWeight: "500" },
  section: { marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: "#e0e0e0", gap: 12 },
  mutedText: { fontSize: 13, color: "#888", textAlign: "center" },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    alignItems: "center",
  },
  secondaryButtonText: { fontSize: 15, fontWeight: "600", color: "#111" },
  linkBtn: { marginTop: 16, alignItems: "center" },
  linkText: { color: theme.primary, fontSize: 14, fontWeight: "600" },
  mutedLink: { color: "#888", fontSize: 13, textAlign: "center" },
});
