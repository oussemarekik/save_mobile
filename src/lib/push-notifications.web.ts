/**
 * Web stub — expo-notifications is not supported on web and importing it
 * logs noisy console warnings (push token listener, etc.).
 */

export async function getStoredExpoPushToken(): Promise<string | null> {
  return null;
}

export function isNativePushSupported(): boolean {
  return false;
}

export async function registerForPushNotifications(): Promise<string | null> {
  return null;
}

export async function unregisterPushNotifications(): Promise<void> {
  // no-op on web
}

export async function syncPushRegistrationIfEnabled(): Promise<void> {
  // no-op on web
}

export function usePushNotificationQuerySync(): void {
  // no-op on web
}

export function getPushNotificationRoute(
  _data?: Record<string, unknown>
): string {
  return "/notifications";
}

export function usePushNotificationNavigation(): void {
  // no-op on web
}
