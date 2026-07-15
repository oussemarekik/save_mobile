import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";

export default function Callback() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Ionicons name="close-circle-outline" size={64} color={theme.destructive} />
      <Text style={styles.title}>Verification Unsupported</Text>
      <Text style={styles.message}>
        Magic link sign-in is not supported. Please sign in with email and password.
      </Text>
      <TouchableOpacity style={styles.button} onPress={() => router.replace("/(auth)/signin")}>
        <Text style={styles.buttonText}>Back to Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.destructive,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    color: theme.muted,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    backgroundColor: theme.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
