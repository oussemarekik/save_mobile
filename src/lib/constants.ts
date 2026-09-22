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

/**
 * Environmental impact factors based on food-waste LCA benchmarks
 * (Too Good To Go / Mérieux NutriSciences | Blonk, 2024).
 * 1 meal ≈ 1 kg food; rescuing 1 kg avoids ~2.7 kg CO₂e.
 */
export const KG_CO2E_PER_MEAL = 2.7;
export const LITERS_WATER_PER_MEAL = 1500;

export function co2SavedFromMeals(meals: number): number {
  return meals * KG_CO2E_PER_MEAL;
}

export function waterSavedFromMeals(meals: number): number {
  return meals * LITERS_WATER_PER_MEAL;
}
