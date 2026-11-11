import { ActivityIndicator, View, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { theme } from "@/lib/theme";

export default function Index() {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!isAuthenticated) return <Redirect href="/(auth)/welcome" />;

  // Incomplete role — finish onboarding / role selection
  if (!user?.role || user.role === "NONE") {
    return <Redirect href="/(auth)/signin" />;
  }

  // Unverified email with no role path already handled; block unverified NONE was above.
  // If somehow still NONE+unverified they stay on signin.

  if (user.role === "PROVIDER" || user.role === "PENDING_PROVIDER") {
    return <Redirect href="/(provider)/dashboard" />;
  }

  if (user.role === "CLIENT") {
    return <Redirect href="/(client)/Home" />;
  }

  return <Redirect href="/(auth)/signin" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
});
