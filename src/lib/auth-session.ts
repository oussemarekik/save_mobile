import AsyncStorage from "@react-native-async-storage/async-storage";
import { AUTH_INTENT_ROLE_KEY } from "@/lib/authIntent";
import { tokenStorage } from "@/lib/token-storage";

/** Listeners notified when the session is invalidated (e.g. API 401). */
const sessionInvalidationListeners = new Set<() => void>();

export function onSessionInvalidated(listener: () => void): () => void {
  sessionInvalidationListeners.add(listener);
  return () => {
    sessionInvalidationListeners.delete(listener);
  };
}

function notifySessionInvalidated() {
  sessionInvalidationListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore listener errors
    }
  });
}

export async function clearAuthSession(): Promise<void> {
  await tokenStorage.remove();
  // Intent may already be cleared by tokenStorage.remove; ensure AsyncStorage is clean.
  await AsyncStorage.removeItem(AUTH_INTENT_ROLE_KEY);
}

/**
 * Clears tokens + auth intent and notifies React auth state.
 * Use for logout and API 401 handling so UI does not stay "logged in".
 */
export async function invalidateAuthSession(): Promise<void> {
  await clearAuthSession();
  notifySessionInvalidated();
}
