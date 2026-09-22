// src/components/OAuthButtons.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as Facebook from "expo-auth-session/providers/facebook";
import { ResponseType } from "expo-auth-session";
import { authApi, usersApi } from "@/lib/api-client";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { getPostAuthRedirect } from "@/lib/redirect-utils";
import { readAuthIntentRole } from "@/lib/authIntent";
import { sanitizeErrorMessage } from "@/utils/errorUtils";
import { useAuth } from "@/hooks/use-auth";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;

const hasGoogleConfig = !!(
  GOOGLE_WEB_CLIENT_ID || GOOGLE_IOS_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID
);

async function completeSocialSignIn(options: {
  authenticate: () => Promise<unknown>;
  refreshAuth: () => Promise<void>;
  router: ReturnType<typeof useRouter>;
}) {
  const { authenticate, refreshAuth, router } = options;

  await authenticate();
  await refreshAuth();
  const userData = await authApi.getUserByToken();
  const intentRole = await readAuthIntentRole();

  // Mirror web completeSocialAuth: never force CLIENT when intent is PROVIDER.
  if (
    (!userData.role || userData.role === "NONE") &&
    intentRole !== "PROVIDER"
  ) {
    try {
      await usersApi.setRole("CLIENT");
    } catch {
      // continue — redirect utils will send them to role selection if needed
    }
  }

  const updated = await authApi.getUserByToken();
  Toast.show({ type: "success", text1: "Signed in", text2: "Welcome back!" });
  router.replace(getPostAuthRedirect(updated, intentRole) as any);
}

function extractGoogleCredential(response: {
  authentication?: { accessToken?: string | null; idToken?: string | null } | null;
  params?: Record<string, string>;
}): string | null {
  // Prefer access token (works across web/iOS/Android client audiences via userinfo).
  return (
    response.authentication?.accessToken ||
    response.params?.access_token ||
    response.authentication?.idToken ||
    response.params?.id_token ||
    null
  );
}

function extractFacebookAccessToken(response: {
  authentication?: { accessToken?: string | null } | null;
  params?: Record<string, string>;
}): string | null {
  return (
    response.authentication?.accessToken ||
    response.params?.access_token ||
    null
  );
}

export function GoogleOAuthButton() {
  if (!hasGoogleConfig) {
    return <GoogleOAuthButtonUnavailable />;
  }
  return <GoogleOAuthButtonConfigured />;
}

function GoogleOAuthButtonUnavailable() {
  const handlePress = () => {
    Toast.show({
      type: "info",
      text1: "Google sign-in unavailable",
      text2: "Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your environment",
    });
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress} activeOpacity={0.85}>
      <View style={styles.iconContainer}>
        <Text style={styles.googleG}>G</Text>
      </View>
      <Text style={styles.buttonText}>Continue with Google</Text>
    </TouchableOpacity>
  );
}

function GoogleOAuthButtonConfigured() {
  const [isLoading, setIsLoading] = useState(false);
  const handledRef = useRef<string | null>(null);
  const router = useRouter();
  const { refreshAuth } = useAuth();

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID,
    scopes: ["openid", "profile", "email"],
  });

  useEffect(() => {
    if (!response) return;

    if (response.type === "success") {
      const credential = extractGoogleCredential(response);
      const dedupeKey = credential || JSON.stringify(response.params);
      if (handledRef.current === dedupeKey) return;
      handledRef.current = dedupeKey;

      if (!credential) {
        Toast.show({
          type: "error",
          text1: "Google sign-in failed",
          text2: "No credential returned. Please try again.",
        });
        return;
      }

      (async () => {
        setIsLoading(true);
        try {
          await completeSocialSignIn({
            authenticate: () => authApi.googleAuth(credential),
            refreshAuth,
            router,
          });
        } catch (error: any) {
          handledRef.current = null;
          Toast.show({
            type: "error",
            text1: "Error",
            text2: sanitizeErrorMessage(error, {
              action: "sign in with Google",
              defaultMessage: "Unable to sign in with Google. Please try again.",
            }),
          });
        } finally {
          setIsLoading(false);
        }
      })();
    } else if (response.type === "error") {
      Toast.show({
        type: "error",
        text1: "Google sign-in failed",
        text2: response.error?.message || "Please try again",
      });
    }
  }, [response, refreshAuth, router]);

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => {
        handledRef.current = null;
        promptAsync();
      }}
      disabled={isLoading || !request}
      activeOpacity={0.85}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#555" />
      ) : (
        <>
          <View style={styles.iconContainer}>
            <Text style={styles.googleG}>G</Text>
          </View>
          <Text style={styles.buttonText}>Continue with Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export function FacebookOAuthButton() {
  if (!FACEBOOK_APP_ID) {
    return <FacebookOAuthButtonUnavailable />;
  }
  return <FacebookOAuthButtonConfigured />;
}

function FacebookOAuthButtonUnavailable() {
  const handlePress = () => {
    Toast.show({
      type: "info",
      text1: "Facebook sign-in unavailable",
      text2: "Set EXPO_PUBLIC_FACEBOOK_APP_ID in your environment",
    });
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress} activeOpacity={0.85}>
      <View style={[styles.iconContainer, styles.facebookIcon]}>
        <Text style={styles.facebookF}>f</Text>
      </View>
      <Text style={styles.buttonText}>Continue with Facebook</Text>
    </TouchableOpacity>
  );
}

function FacebookOAuthButtonConfigured() {
  const [isLoading, setIsLoading] = useState(false);
  const handledRef = useRef<string | null>(null);
  const router = useRouter();
  const { refreshAuth } = useAuth();

  // Implicit token flow → POST /auth/facebook { accessToken } (no backend redirect URI).
  const [request, response, promptAsync] = Facebook.useAuthRequest({
    clientId: FACEBOOK_APP_ID!,
    responseType: ResponseType.Token,
    scopes: ["public_profile", "email"],
  });

  useEffect(() => {
    if (!response) return;

    if (response.type === "success") {
      const accessToken = extractFacebookAccessToken(response);
      const dedupeKey = accessToken || JSON.stringify(response.params);
      if (handledRef.current === dedupeKey) return;
      handledRef.current = dedupeKey;

      if (!accessToken) {
        Toast.show({
          type: "error",
          text1: "Facebook sign-in failed",
          text2: "No access token returned. Please try again.",
        });
        return;
      }

      (async () => {
        setIsLoading(true);
        try {
          await completeSocialSignIn({
            authenticate: () => authApi.facebookAuth(accessToken),
            refreshAuth,
            router,
          });
        } catch (error: any) {
          handledRef.current = null;
          Toast.show({
            type: "error",
            text1: "Error",
            text2: sanitizeErrorMessage(error, {
              action: "sign in with Facebook",
              defaultMessage:
                "Unable to sign in with Facebook. Please try again.",
            }),
          });
        } finally {
          setIsLoading(false);
        }
      })();
    } else if (response.type === "error") {
      Toast.show({
        type: "error",
        text1: "Facebook sign-in failed",
        text2: response.error?.message || "Please try again",
      });
    }
  }, [response, refreshAuth, router]);

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => {
        handledRef.current = null;
        promptAsync();
      }}
      disabled={isLoading || !request}
      activeOpacity={0.85}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#555" />
      ) : (
        <>
          <View style={[styles.iconContainer, styles.facebookIcon]}>
            <Text style={styles.facebookF}>f</Text>
          </View>
          <Text style={styles.buttonText}>Continue with Facebook</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  googleG: {
    fontSize: 14,
    fontWeight: "800",
    color: "#4285F4",
  },
  facebookIcon: {
    backgroundColor: "#1877F2",
    borderColor: "#1877F2",
  },
  facebookF: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
});
