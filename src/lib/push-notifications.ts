import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { notificationsApi } from "@/lib/api-client";

const EXPO_PUSH_TOKEN_KEY = "expoPushToken";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function getExpoProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    undefined
  );
}

export async function getStoredExpoPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(EXPO_PUSH_TOKEN_KEY);
}

async function storeExpoPushToken(token: string | null): Promise<void> {
  if (!token) {
    await AsyncStorage.removeItem(EXPO_PUSH_TOKEN_KEY);
    return;
  }
  await AsyncStorage.setItem(EXPO_PUSH_TOKEN_KEY, token);
}

export function isNativePushSupported(): boolean {
  if (Platform.OS === "web") return false;
  return Device.isDevice;
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!isNativePushSupported()) {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#059669",
    });
  }

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== "granted") {
    throw new Error("Push notification permission was denied");
  }

  const projectId = getExpoProjectId();
  if (!projectId) {
    throw new Error("Missing Expo projectId for push token registration");
  }

  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenResponse.data;
  if (!token) {
    throw new Error("Failed to get Expo push token");
  }

  await notificationsApi.registerExpoPushToken({
    token,
    platform: Platform.OS,
  });
  await storeExpoPushToken(token);
  await notificationsApi.updateSettings({ pushEnabled: true });

  return token;
}

export async function unregisterPushNotifications(): Promise<void> {
  const token = await getStoredExpoPushToken();
  if (!token) return;

  try {
    await notificationsApi.unregisterExpoPushToken(token);
  } catch {
    // Best-effort cleanup on logout / disable
  } finally {
    await storeExpoPushToken(null);
  }
}

/** Re-register existing permission silently after login (no new prompt if already granted). */
export async function syncPushRegistrationIfEnabled(): Promise<void> {
  if (!isNativePushSupported()) return;

  try {
    const settings = await notificationsApi.getSettings();
    if (!settings.pushEnabled) return;

    const permission = await Notifications.getPermissionsAsync();
    if (permission.status !== "granted") return;

    await registerForPushNotifications();
  } catch {
    // Silent — push is optional and should never block auth
  }
}
