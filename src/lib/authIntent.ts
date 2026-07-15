import AsyncStorage from "@react-native-async-storage/async-storage";

export type AuthIntentRole = "CLIENT" | "PROVIDER";

export const AUTH_INTENT_ROLE_KEY = "auth-intent-role";

export function normalizeAuthIntentRole(v: string | null | undefined): AuthIntentRole | null {
  const upper = String(v || "").trim().toUpperCase();
  if (upper === "CLIENT" || upper === "PROVIDER") return upper;
  return null;
}

export async function readAuthIntentRole(): Promise<AuthIntentRole | null> {
  try {
    const value = await AsyncStorage.getItem(AUTH_INTENT_ROLE_KEY);
    return normalizeAuthIntentRole(value);
  } catch {
    return null;
  }
}

export async function writeAuthIntentRole(role: AuthIntentRole | null): Promise<void> {
  try {
    if (!role) {
      await AsyncStorage.removeItem(AUTH_INTENT_ROLE_KEY);
      return;
    }
    await AsyncStorage.setItem(AUTH_INTENT_ROLE_KEY, role);
  } catch {
    // ignore storage failures
  }
}
