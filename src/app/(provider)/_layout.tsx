import React from "react";
import { View, ActivityIndicator, Platform } from "react-native";
import { Tabs, Redirect, useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/context/LanguageContext";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { useSystemBottomInset } from "@/lib/screen-insets";

export default function ProviderLayout() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
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
  if (user?.role !== "PROVIDER" && user?.role !== "PENDING_PROVIDER") {
    return <Redirect href="/(client)/Home" />;
  }

  return (
    <View style={{ flex: 1 }}>
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
          name="dashboard"
          options={{
            title: t("nav.home") || "Home",
            tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="publish"
          options={{
            title: t("nav.publish") || "Publish",
            tabBarIcon: ({ color }) => <Ionicons name="add-circle-outline" size={26} color={color} />,
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              router.push("/new-offer" as any);
            },
          }}
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
    </View>
  );
}
