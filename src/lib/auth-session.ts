import AsyncStorage from "@react-native-async-storage/async-storage";
import { AUTH_INTENT_ROLE_KEY } from "@/lib/authIntent";

const AUTH_STORAGE_KEYS = ["accessToken", "refreshToken", AUTH_INTENT_ROLE_KEY];

export async function clearAuthSession(): Promise<void> {
  await AsyncStorage.multiRemove(AUTH_STORAGE_KEYS);
}
