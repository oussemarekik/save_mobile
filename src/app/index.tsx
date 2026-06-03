import { Redirect } from "expo-router";
import { useAuth } from "@/hooks/use-auth";

export default function Index() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Redirect href="/(auth)/signin" />;
  if (user?.role === "PROVIDER") return <Redirect href="/dashboard" />;
  return <Redirect href="/(client)/Home" />;
}