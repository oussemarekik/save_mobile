import Constants from "expo-constants";

export const APP_NAME = "Save The Plate";
export const WEBSITE_URL = "https://savetheplate.tn";
export const API_URL =
  (process.env.EXPO_PUBLIC_API_URL || "https://savetheplate.tn/api").replace(/\/$/, "");

export const LEGAL_PAGES = {
  privacy: `${WEBSITE_URL}/privacy`,
  terms: `${WEBSITE_URL}/terms`,
  "data-deletion": `${WEBSITE_URL}/data-deletion`,
  help: `${WEBSITE_URL}`,
} as const;

export const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";
export const BUILD_NUMBER =
  Constants.expoConfig?.ios?.buildNumber ??
  Constants.expoConfig?.android?.versionCode?.toString() ??
  "1";
