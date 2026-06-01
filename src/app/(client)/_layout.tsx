import { Tabs, Redirect } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { Ionicons } from "@expo/vector-icons";

export default function ClientLayout() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Redirect href="/(auth)/signin" />;
  if (user?.role === "PROVIDER") return <Redirect href="/(provider)/ProviderDashboard" />;

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: "Browse",
          tabBarIcon: ({ color }) => <Ionicons name="search-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color }) => <Ionicons name="receipt-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}