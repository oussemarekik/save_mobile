import { ActivityIndicator, View, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/hooks/use-auth";

export default function Index() {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!isAuthenticated) return <Redirect href="/(auth)/signin" />;

  if (user?.role === "PROVIDER" || user?.role === "PENDING_PROVIDER") {
    return <Redirect href="/(provider)/dashboard" />;
  }

  return <Redirect href="/(client)/Home" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
});
