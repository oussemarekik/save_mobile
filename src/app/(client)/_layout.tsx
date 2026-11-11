import { Tabs, Redirect } from "expo-router";
import { View, ActivityIndicator, Platform } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/context/LanguageContext";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { useSystemBottomInset } from "@/lib/screen-insets";

export default function ClientLayout() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const { t } = useLanguage();
  const systemBottom = useSystemBottomInset();
  const tabBarPaddingBottom = Platform.OS === "android" ? systemBottom : Math.max(systemBottom, 0);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!isAuthenticated) return <Redirect href="/(auth)/signin" />;
  if (!user?.role || user.role === "NONE") {
    return <Redirect href="/(auth)/signin" />;
  }
  if (user.role === "PROVIDER" || user.role === "PENDING_PROVIDER") {
    return <Redirect href="/(provider)/dashboard" />;
  }
  if (user.role !== "CLIENT") {
    return <Redirect href="/(auth)/signin" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.muted,
          tabBarStyle: {
            borderTopColor: theme.border,
            backgroundColor: "#fff",
            paddingBottom: tabBarPaddingBottom,
            height: 56 + tabBarPaddingBottom,
          },
        }}
      >
      <Tabs.Screen
        name="Home"
        options={{
          title: t("nav.home") || "Home",
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Browse"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t("nav.orders") || "Orders",
          tabBarIcon: ({ color }) => <Ionicons name="bag-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("nav.profile") || "Profile",
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
