import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api-client";

type AppRouter = ReturnType<typeof useRouter>;

const EXPO_PUSH_TOKEN_KEY = "expoPushToken";

// Only configure the foreground handler on native — this module is not loaded on web
// (see push-notifications.web.ts).
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

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

let syncInFlight: Promise<void> | null = null;
let lastSyncAt = 0;

/** Re-register existing permission silently after login (no new prompt if already granted). */
export async function syncPushRegistrationIfEnabled(): Promise<void> {
  if (!isNativePushSupported()) return;
  if (syncInFlight) return syncInFlight;
  if (Date.now() - lastSyncAt < 60_000) return;

  syncInFlight = (async () => {
    try {
      const settings = await notificationsApi.getSettings();
      lastSyncAt = Date.now();
      if (!settings.pushEnabled) return;

      const permission = await Notifications.getPermissionsAsync();
      if (permission.status !== "granted") return;

      await registerForPushNotifications();
    } catch {
      // Silent — push is optional and should never block auth
    } finally {
      syncInFlight = null;
    }
  })();

  return syncInFlight;
}

const ORDER_RELATED_TYPES = new Set([
  "ORDER_CONFIRMED",
  "ORDER_CANCELLED",
  "ORDER_EXPIRED",
  "NEW_ORDER",
]);

function getNotificationData(
  notification: Notifications.Notification
): Record<string, unknown> | undefined {
  return notification.request.content.data as Record<string, unknown> | undefined;
}

function shouldRefreshOrders(data: Record<string, unknown> | undefined): boolean {
  if (!data) return false;
  const type = typeof data.type === "string" ? data.type : undefined;
  if (type && ORDER_RELATED_TYPES.has(type)) return true;
  // Backend historically sent { orderId } without type — still refresh orders.
  return data.orderId != null;
}

/** Resolve deep-link path from a notification payload. */
export function getPushNotificationRoute(
  data: Record<string, unknown> | undefined
): string {
  if (!data) return "/notifications";

  const type = typeof data.type === "string" ? data.type : undefined;
  const orderId = data.orderId != null ? String(data.orderId) : null;

  if (orderId && type === "NEW_ORDER") {
    return "/(provider)/orders";
  }
  if (orderId || (type && ORDER_RELATED_TYPES.has(type))) {
    return "/(client)/orders";
  }
  return "/notifications";
}

function navigateFromNotification(
  router: AppRouter,
  notification: Notifications.Notification
) {
  const route = getPushNotificationRoute(getNotificationData(notification));
  router.push(route as any);
}

/**
 * Listen for foreground / tapped push notifications and refresh related queries.
 * Especially needed so the client Orders screen updates when a provider scans a QR.
 */
export function usePushNotificationQuerySync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (Platform.OS === "web") return;

    const refreshFromNotification = (notification: Notifications.Notification) => {
      const data = getNotificationData(notification);

      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });

      if (shouldRefreshOrders(data)) {
        queryClient.invalidateQueries({ queryKey: ["/orders"] });
        queryClient.invalidateQueries({ queryKey: ["/orders/provider"] });
      }
    };

    const received = Notifications.addNotificationReceivedListener(refreshFromNotification);
    const response = Notifications.addNotificationResponseReceivedListener((res) => {
      refreshFromNotification(res.notification);
    });

    return () => {
      received.remove();
      response.remove();
    };
  }, [queryClient]);
}

/**
 * Navigate on notification tap (including cold start via getLastNotificationResponseAsync).
 * Mount once from root `_layout.tsx`.
 */
export function usePushNotificationNavigation() {
  const router = useRouter();
  const handledColdStart = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const responseSub = Notifications.addNotificationResponseReceivedListener((res) => {
      navigateFromNotification(router, res.notification);
    });

    if (!handledColdStart.current) {
      handledColdStart.current = true;
      Notifications.getLastNotificationResponseAsync()
        .then((last) => {
          if (last?.notification) {
            navigateFromNotification(router, last.notification);
          }
        })
        .catch(() => {
          // Ignore cold-start lookup failures
        });
    }

    return () => {
      responseSub.remove();
    };
  }, [router]);
}
