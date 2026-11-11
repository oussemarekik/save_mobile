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
  Pressable,
} from "react-native";
import { useRouter, useLocalSearchParams, Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authApi, usersApi } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { getPostAuthRedirect } from "@/lib/redirect-utils";
import { clearAuthIntentRole, readAuthIntentRole } from "@/lib/authIntent";
import { useLanguage } from "@/context/LanguageContext";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { ApiError, sanitizeErrorMessage } from "@/utils/errorUtils";

type ViewMode = "email" | "password" | "signup" | "verify" | "forgot" | "reset";

/** Too Good To Go–style auth palette */
const GREEN = "#004225";
const CREAM = "#F7F5F0";
const MUTED = "#5C6B63";
const LINE = "#C8CFC9";

export default function SignIn() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { user, isLoading: authLoading, refreshAuth } = useAuth();
  const { t } = useLanguage();

  const [view, setView] = useState<ViewMode>(mode === "signup" ? "email" : "email");
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
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    if (mode === "signup") {
      setIsSignUp(true);
      setView("email");
    }
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
        <ActivityIndicator size="large" color={GREEN} />
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

  const handleEmailContinue = () => {
    if (!email.includes("@")) {
      showError(t("signin.error_email_required"));
      return;
    }
    if (isSignUp) {
      setView("signup");
    } else {
      setView("password");
    }
  };

  const handleSignIn = async () => {
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
          // continue
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
      await refreshAuth();

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

      // Consumer signup form always becomes CLIENT — do not inherit stale PROVIDER intent.
      await usersApi.setRole("CLIENT");
      await clearAuthIntentRole();
      await refreshAuth();
      router.replace("/(client)/Home");
    } catch (error: any) {
      if (error instanceof ApiError && error.status === 409) {
        showError(t("signin.error_account_exists"));
        setIsSignUp(false);
        setPassword("");
        setUsername("");
        setConfirmPassword("");
        setView("password");
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
        setView("password");
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
    const intentRole = await readAuthIntentRole();
    if (intentRole === "PROVIDER") {
      showError(t("signin.explore_provider_blocked"));
      return;
    }
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
      const status = error?.status;
      const backendMessage =
        typeof error?.body === "object" &&
        error?.body !== null &&
        "message" in error.body
          ? String((error.body as { message?: string }).message || "")
          : typeof error?.message === "string"
            ? error.message
            : "";
      const noAccount =
        status === 404 || /no account|does not exist/i.test(backendMessage);

      showError(
        noAccount
          ? t("signin.forgot_password_no_account") ||
              "No account found with this email address."
          : sanitizeErrorMessage(error, {
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
        setEmail(forgotPasswordEmail.trim());
        setPassword("");
        setIsSignUp(false);
        setView("password");
        setResetCode("");
        setNewPassword("");
        setConfirmNewPassword("");
        setShowNewPassword(false);
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

  const goBack = () => {
    if (view === "password" || view === "signup") {
      setView("email");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      return;
    }
    if (view === "verify") {
      setView("signup");
      return;
    }
    if (view === "forgot") {
      setView("password");
      return;
    }
    if (view === "reset") {
      setView("forgot");
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace("/(auth)/welcome");
  };

  const busy = view === "verify" ? verifyingCode : submitting;

  const onPrimary = () => {
    if (view === "email") return handleEmailContinue();
    if (view === "password") return handleSignIn();
    if (view === "signup") return handleSignUp();
    if (view === "verify") return handleVerifyCode();
    if (view === "forgot") return handleForgotPassword();
    if (view === "reset") return handleResetPassword();
  };

  const primaryLabel =
    view === "email"
      ? t("common.continue") || "Continue"
      : view === "password"
        ? t("signin.sign_in")
        : view === "signup"
          ? t("signin.sign_up")
          : view === "verify"
            ? t("signin.verify_button")
            : view === "forgot"
              ? t("signin.forgot_password_send") || "Send reset code"
              : t("signin.reset_password_button");

  const headline =
    view === "email"
      ? isSignUp
        ? t("signin.tgtg_email_signup") || "What's your email?"
        : t("signin.tgtg_email_login") || "What's your email?"
      : view === "password"
        ? t("signin.tgtg_password") || "Enter your password"
        : view === "signup"
          ? t("signin.tgtg_create") || "Create your account"
          : view === "verify"
            ? t("signin.verify_email_title")
            : view === "forgot"
              ? t("signin.forgot_password_title")
              : t("signin.reset_password_title");

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
                {isSignUp
                  ? t("signin.description_new")
                  : t("signin.tgtg_email_helper") ||
                    "We'll use this to find your account."}
              </Text>
              <UnderlineInput
                value={email}
                onChangeText={setEmail}
                placeholder={t("signin.email_placeholder")}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                autoFocus
                returnKeyType="next"
                onSubmitEditing={handleEmailContinue}
              />
              <TouchableOpacity
                style={styles.switchHit}
                onPress={() => {
                  setIsSignUp(!isSignUp);
                  setPassword("");
                  setConfirmPassword("");
                  setUsername("");
                }}
              >
                <Text style={styles.switchText}>
                  {isSignUp ? t("signin.have_account") : t("signin.no_account")}{" "}
                  <Text style={styles.switchLink}>
                    {isSignUp ? t("signin.sign_in") : t("signin.sign_up")}
                  </Text>
                </Text>
              </TouchableOpacity>
            </>
          )}

          {view === "password" && (
            <>
              <Text style={styles.helper}>
                {email}
              </Text>
              <UnderlineInput
                value={password}
                onChangeText={setPassword}
                placeholder={t("signin.password_placeholder_signin")}
                secure
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
                autoComplete="password"
                textContentType="password"
                autoFocus
                returnKeyType="go"
                onSubmitEditing={handleSignIn}
              />
              <TouchableOpacity
                onPress={() => {
                  setForgotPasswordEmail(email);
                  setView("forgot");
                }}
                style={styles.forgotHit}
              >
                <Text style={styles.forgotText}>
                  {t("signin.forgot_password") || "Forgot password?"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {view === "signup" && (
            <>
              <Text style={styles.helper}>{email}</Text>
              <UnderlineInput
                value={username}
                onChangeText={setUsername}
                placeholder={t("signin.username_placeholder")}
                autoComplete="username"
                textContentType="username"
                autoFocus
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
                <View style={[styles.checkbox, termsAccepted && styles.checkboxOn]}>
                  {termsAccepted ? (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  ) : null}
                </View>
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
              </Pressable>
            </>
          )}

          {view === "verify" && (
            <>
              <Text style={styles.helper}>
                {t("signin.verify_email_desc")}{" "}
                <Text style={styles.emphasis}>{signUpEmail}</Text>
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
              <TouchableOpacity onPress={handleResendCode} disabled={submitting}>
                <Text style={styles.forgotText}>
                  {submitting ? t("signin.sending") : t("signin.resend_code")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleExploreWithoutVerification}>
                <Text style={styles.mutedLink}>
                  {t("signin.explore_platform") || "Explore the platform"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {view === "forgot" && (
            <>
              <Text style={styles.helper}>{t("signin.forgot_password_desc")}</Text>
              <UnderlineInput
                value={forgotPasswordEmail}
                onChangeText={setForgotPasswordEmail}
                placeholder={t("signin.forgot_password_email_placeholder")}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                autoFocus
              />
            </>
          )}

          {view === "reset" && (
            <>
              <Text style={styles.helper}>
                {t("signin.reset_password_desc")}{" "}
                <Text style={styles.emphasis}>{forgotPasswordEmail}</Text>
              </Text>
              <UnderlineInput
                value={resetCode}
                onChangeText={(v) => setResetCode(v.replace(/\D/g, "").slice(0, 6))}
                placeholder={t("signin.reset_password_code_placeholder")}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                maxLength={6}
                center
                autoFocus
              />
              <UnderlineInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder={t("signin.reset_password_new_placeholder")}
                secure
                showPassword={showNewPassword}
                onTogglePassword={() => setShowNewPassword(!showNewPassword)}
                textContentType="newPassword"
              />
              <UnderlineInput
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                placeholder={t("signin.reset_password_confirm_placeholder")}
                secure
                showPassword={showNewPassword}
                onTogglePassword={() => setShowNewPassword(!showNewPassword)}
                textContentType="newPassword"
              />
              <TouchableOpacity onPress={() => setView("forgot")}>
                <Text style={styles.forgotText}>{t("signin.request_new_code")}</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
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
        autoCapitalize="none"
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
  },
  forgotHit: {
    alignSelf: "flex-start",
    marginTop: -8,
  },
  forgotText: {
    fontSize: 15,
    fontWeight: "700",
    color: GREEN,
    marginTop: 4,
  },
  mutedLink: {
    marginTop: 18,
    fontSize: 14,
    color: MUTED,
    textAlign: "center",
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
