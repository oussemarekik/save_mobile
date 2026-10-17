import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { LanguageProvider } from "@/context/LanguageContext";
import Toast from "react-native-toast-message";
import "@/lib/push-notifications";

export default function RootLayout() {
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(client)" />
          <Stack.Screen name="(provider)" />
          <Stack.Screen name="product/[id]" />
          <Stack.Screen name="business/[id]" />
          <Stack.Screen name="search" />
          <Stack.Screen name="map" />
          <Stack.Screen name="account-details" />
          <Stack.Screen name="payment-methods" />
          <Stack.Screen name="preferences" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="impact" />
          <Stack.Screen name="contact" />
          <Stack.Screen name="help-support" />
          <Stack.Screen name="legal/[page]" />
          <Stack.Screen name="+not-found" />
        </Stack>
        <Toast />
      </QueryClientProvider>
    </LanguageProvider>
  );
}
