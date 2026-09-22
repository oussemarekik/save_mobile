export type JsPlaceSuggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

export type JsPlaceDetails = {
  placeId: string;
  name: string;
  formattedAddress: string;
  latitude: number | null;
  longitude: number | null;
};

/**
 * The website Maps JS key is restricted to savetheplate.tn referrers.
 * Expo web (localhost:8081, Expo Go, etc.) is not allowed, so we never
 * load maps.googleapis.com here. Suggestions come from the backend instead.
 */
export async function fetchJsPlaceSuggestions(
  _query: string,
  _language = "fr"
): Promise<JsPlaceSuggestion[]> {
  return [];
}

export async function fetchJsPlaceDetails(
  _placeId: string
): Promise<JsPlaceDetails | null> {
  return null;
}
