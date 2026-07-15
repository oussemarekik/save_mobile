// src/components/OAuthButtons.tsx
import React, { useEffect, useState } from "react";
import { TouchableOpacity, Text, View, StyleSheet, ActivityIndicator } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
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

const hasGoogleConfig = !!(
  GOOGLE_WEB_CLIENT_ID || GOOGLE_IOS_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID
);

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
  const router = useRouter();
  const { refreshAuth } = useAuth();

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === "success" && response.authentication?.idToken) {
      handleGoogleToken(response.authentication.idToken);
    } else if (response?.type === "error") {
      Toast.show({
        type: "error",
        text1: "Google sign-in failed",
        text2: response.error?.message || "Please try again",
      });
    }
  }, [response]);

  const handleGoogleToken = async (idToken: string) => {
    setIsLoading(true);
    try {
      const result = await authApi.googleAuth(idToken);
      await refreshAuth();
      const userData = await authApi.getUserByToken();

      if (!userData.role || userData.role === "NONE") {
        try {
          await usersApi.setRole("CLIENT");
        } catch {
          // continue
        }
      }

      const updated = await authApi.getUserByToken();
      const intentRole = await readAuthIntentRole();
      Toast.show({ type: "success", text1: "Signed in", text2: "Welcome back!" });
      router.replace(getPostAuthRedirect(updated, intentRole) as any);
    } catch (error: any) {
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
  };

  const handleGoogle = async () => {
    await promptAsync();
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handleGoogle}
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
  const [isLoading] = useState(false);

  const handleFacebook = async () => {
    Toast.show({
      type: "info",
      text1: "Coming soon",
      text2: "Facebook sign-in will be available in a future update",
    });
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handleFacebook}
      disabled={isLoading}
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
