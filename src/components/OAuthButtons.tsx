// src/components/OAuthButtons.tsx
import React from "react";
import { TouchableOpacity, Text, View, StyleSheet, ActivityIndicator } from "react-native";
import { useState } from "react";
import { authApi } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";

export function GoogleOAuthButton() {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const handleGoogle = async () => {
    Toast.show({ type: "info", text1: "Coming soon", text2: "Google sign-in will be available soon" });
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handleGoogle}
      disabled={isLoading}
      activeOpacity={0.85}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#555" />
      ) : (
        <>
          {/* Google G logo */}
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
  const [isLoading, setIsLoading] = useState(false);

  const handleFacebook = async () => {
    Toast.show({ type: "info", text1: "Coming soon", text2: "Facebook sign-in will be available soon" });
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