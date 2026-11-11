import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { AUTH_INTENT_ROLE_KEY } from "@/lib/authIntent";

const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";

const isSSR = typeof window === "undefined";
const useSecureStore = Platform.OS !== "web";

async function secureGet(key: string): Promise<string | null> {
  if (isSSR) return null;
  if (!useSecureStore) {
    return AsyncStorage.getItem(key);
  }
  try {
    const secure = await SecureStore.getItemAsync(key);
    if (secure) return secure;

    // One-time migration from legacy AsyncStorage tokens.
    const legacy = await AsyncStorage.getItem(key);
    if (legacy) {
      await SecureStore.setItemAsync(key, legacy);
      await AsyncStorage.removeItem(key);
      return legacy;
    }
    return null;
  } catch {
    return AsyncStorage.getItem(key);
  }
}

async function secureSet(key: string, value: string): Promise<void> {
  if (isSSR) return;
  if (!useSecureStore) {
    await AsyncStorage.setItem(key, value);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
    await AsyncStorage.removeItem(key);
  } catch {
    await AsyncStorage.setItem(key, value);
  }
}

async function secureRemove(key: string): Promise<void> {
  if (isSSR) return;
  if (useSecureStore) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // ignore
    }
  }
  await AsyncStorage.removeItem(key);
}

/**
 * Access/refresh tokens live in SecureStore on native (migrated from AsyncStorage).
 * Auth intent stays in AsyncStorage (non-secret preference).
 * Note: backend has no /auth/refresh endpoint yet — refresh is stored for future use.
 */
export const tokenStorage = {
  get: (): Promise<string | null> => secureGet(ACCESS_KEY),
  set: (token: string): Promise<void> => secureSet(ACCESS_KEY, token),
  getRefresh: (): Promise<string | null> => secureGet(REFRESH_KEY),
  setRefresh: (token: string): Promise<void> => secureSet(REFRESH_KEY, token),
  remove: async (): Promise<void> => {
    await secureRemove(ACCESS_KEY);
    await secureRemove(REFRESH_KEY);
    await AsyncStorage.removeItem(AUTH_INTENT_ROLE_KEY);
  },
};
