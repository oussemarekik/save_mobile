import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { theme } from "@/lib/theme";

/** Shows its children to signed-in businesses only; everyone else is sent to their own home. */
export function ProviderGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.primaryDark} />
      </View>
    );
  }

  const isProvider = user?.role === "PROVIDER" || user?.role === "PENDING_PROVIDER";
  if (!isAuthenticated || !isProvider) return <Redirect href="/" />;

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.backgroundGradient,
  },
});
