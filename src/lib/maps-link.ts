export function hasCoordinates(
  latitude?: number | null,
  longitude?: number | null
): latitude is number {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

/** Google Maps search URL. Coordinates are the query so the pin is exact. */
export function googleMapsSearchUrl(
  locationName: string,
  businessName?: string,
  latitude?: number | null,
  longitude?: number | null,
  placeId?: string
): string {
  const params = new URLSearchParams({ api: "1" });
  if (hasCoordinates(latitude, longitude)) {
    params.set("query", `${latitude},${longitude}`);
  } else {
    const text = [businessName?.trim(), locationName.trim()].filter(Boolean).join(" ");
    params.set("query", text || locationName);
  }
  if (placeId && !placeId.startsWith("osm:")) {
    params.set("query_place_id", placeId);
  }
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

export function readCoordinates(
  latitude?: number | null,
  longitude?: number | null,
  mapsLink?: string | null
): { latitude: number; longitude: number } | null {
  if (hasCoordinates(latitude, longitude)) {
    return { latitude, longitude: longitude as number };
  }
  if (!mapsLink) return null;
  const match = mapsLink.match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!hasCoordinates(lat, lng)) return null;
  return { latitude: lat, longitude: lng };
}
