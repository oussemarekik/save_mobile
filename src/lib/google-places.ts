const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export type PlaceSuggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

export type PlaceDetailsResult = {
  placeId: string;
  name: string;
  formattedAddress: string;
  latitude: number | null;
  longitude: number | null;
};

export async function googlePlacesAutocomplete(
  input: string,
  language = "fr"
): Promise<PlaceSuggestion[]> {
  const query = input.trim();
  if (!GOOGLE_MAPS_API_KEY || query.length < 2) return [];

  const params = new URLSearchParams({
    input: query,
    key: GOOGLE_MAPS_API_KEY,
    language,
    components: "country:tn",
  });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`
  );
  if (!res.ok) return [];

  const data = await res.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") return [];

  return (data.predictions || [])
    .filter((prediction: { place_id?: string }) => prediction.place_id)
    .map(
      (prediction: {
        place_id: string;
        description?: string;
        structured_formatting?: { main_text?: string; secondary_text?: string };
      }) => ({
        placeId: prediction.place_id,
        description: prediction.description || "",
        mainText:
          prediction.structured_formatting?.main_text || prediction.description || "",
        secondaryText: prediction.structured_formatting?.secondary_text || "",
      })
    );
}

export async function googlePlaceDetails(
  placeId: string,
  language = "fr"
): Promise<PlaceDetailsResult | null> {
  const id = placeId.trim();
  if (!GOOGLE_MAPS_API_KEY || !id) return null;

  const params = new URLSearchParams({
    place_id: id,
    key: GOOGLE_MAPS_API_KEY,
    language,
    fields: "place_id,name,formatted_address,geometry",
  });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`
  );
  if (!res.ok) return null;

  const data = await res.json();
  if (data.status !== "OK" || !data.result) return null;

  const result = data.result;
  const lat = result.geometry?.location?.lat;
  const lng = result.geometry?.location?.lng;

  return {
    placeId: result.place_id || id,
    name: result.name || "",
    formattedAddress: result.formatted_address || result.name || "",
    latitude: typeof lat === "number" ? lat : null,
    longitude: typeof lng === "number" ? lng : null,
  };
}
