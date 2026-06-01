import { Tabs, Redirect } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { Ionicons } from "@expo/vector-icons";

export default function ProviderLayout() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Redirect href="/(auth)/signin" />;
  if (user?.role !== "PROVIDER") return <Redirect href="/(client)/Home" />;

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={24} color={color} />,
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
        name="offers"
        options={{
          title: "Offers",
          tabBarIcon: ({ color }) => <Ionicons name="pricetag-outline" size={24} color={color} />,
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