import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

const DEFAULT_API_BASE_URL = "https://savetheplate.tn/api";

function devServerHost(): string | null {
  const expoGo = Constants.expoGoConfig as { debuggerHost?: string } | null;
  const hostUri = Constants.expoConfig?.hostUri || expoGo?.debuggerHost || "";
  const host = hostUri.split(":")[0]?.trim();
  if (!host || host === "localhost" || host === "127.0.0.1") return null;
  return host;
}

/**
 * On a phone, "localhost" is the phone itself, so the Mac's backend is unreachable.
 * In dev, rewrite localhost to the same host Expo uses for Metro.
 * Web and the iOS simulator keep localhost. The Android emulator uses 10.0.2.2.
 */
export function resolveApiBaseUrl(): string {
  const configured = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");
  if (Platform.OS === "web" || !__DEV__) return configured;

  let parsed: URL;
  try {
    parsed = new URL(configured);
  } catch {
    return configured;
  }

  const isLoopback = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (!isLoopback) return configured;

  if (Platform.OS === "android" && Device.isDevice === false) {
    parsed.hostname = "10.0.2.2";
    return parsed.toString().replace(/\/$/, "");
  }

  // iOS simulator shares the computer's localhost.
  if (Device.isDevice === false) return configured;

  const host = devServerHost();
  if (!host) return configured;

  parsed.hostname = host;
  return parsed.toString().replace(/\/$/, "");
}

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * Uploaded files are served differently depending on how we reach the API:
 * - Direct Nest (`http://host:3001`) → `/storage/...`
 * - Production nginx (`https://savetheplate.tn/api`) → `/store/...` at the site root (not under `/api`)
 *
 * Offer records often store `absoluteUrl` with a leftover `localhost` host and/or `/store/`
 * even when the app talks to Nest directly — rewrite those to a reachable URL.
 */
export function resolveStorageAssetUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const apiBase = API_BASE_URL.replace(/\/$/, "");
  const viaNginxApiPrefix = /\/api$/i.test(apiBase);
  const assetBase = viaNginxApiPrefix ? apiBase.replace(/\/api$/i, "") : apiBase;
  const filePrefix = viaNginxApiPrefix ? "/store/" : "/storage/";

  const storageMatch =
    trimmed.match(/\/(?:store|storage)\/(.+?)(?:\?.*)?$/i) ||
    trimmed.match(/^(?:store|storage)\/(.+?)(?:\?.*)?$/i);
  if (storageMatch) {
    // The /storage route (and nginx's /store → /storage proxy) only serves files at the
    // top of the store folder. Subfolders such as profile-images/ are only reachable
    // through the static /store mount on the API itself.
    if (storageMatch[1].includes("/")) return `${apiBase}/store/${storageMatch[1]}`;
    return `${assetBase}${filePrefix}${storageMatch[1]}`;
  }

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  if (trimmed.startsWith("/")) return `${assetBase}${trimmed}`;

  return `${assetBase}${filePrefix}${trimmed}`;
}

if (__DEV__) {
  console.log("[API] Base URL:", API_BASE_URL);
}
