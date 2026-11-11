import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useLanguage } from "@/context/LanguageContext";
import { useProducts } from "@/hooks/use-shop";
import { ScreenHeader } from "@/components/ScreenHeader";
import { theme } from "@/lib/theme";
import { safeGoBack } from "@/lib/navigation";
import { readCoordinates } from "@/lib/maps-link";
import { isOfferExpired } from "@/utils/offerUtils";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TUNIS = {
  latitude: 36.8065,
  longitude: 10.1815,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

type StorePin = {
  key: string;
  storeId: number;
  name: string;
  latitude: number;
  longitude: number;
  offers: { id: number; name: string }[];
};

/**
 * One pin per store location. Offers of the same store share the same
 * coordinates, so one marker per offer would stack them and hide all but one.
 */
function toStorePins(products: any[]): StorePin[] {
  const pins = new Map<string, StorePin>();
  for (const p of products) {
    if (!(p.quantity > 0) || isOfferExpired(p.expirationDate)) continue;
    const lat = p.store?.latitude;
    const lng = p.store?.longitude;
    const place = readCoordinates(
      lat != null ? Number(lat) : null,
      lng != null ? Number(lng) : null,
      p.store?.mapsLink
    );
    if (!place) continue;
    const storeId = Number(p.store?.id ?? p.storeId);
    const key = `${storeId}:${place.latitude.toFixed(5)},${place.longitude.toFixed(5)}`;
    const pin = pins.get(key);
    if (pin) {
      pin.offers.push({ id: p.id, name: p.name });
    } else {
      pins.set(key, {
        key,
        storeId,
        name: p.store?.name || p.name,
        latitude: place.latitude,
        longitude: place.longitude,
        offers: [{ id: p.id, name: p.name }],
      });
    }
  }
  return Array.from(pins.values());
}

/** Region that frames every pin, so no offer starts off-screen. */
function regionFor(pins: StorePin[]) {
  if (pins.length === 0) return TUNIS;
  const lats = pins.map((p) => p.latitude);
  const lngs = pins.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.05),
    longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.05),
  };
}

export default function MapScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: products, isLoading } = useProducts();
  const [showUserLocation, setShowUserLocation] = useState(false);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync()
      .then(({ status }) => setShowUserLocation(status === "granted"))
      .catch(() => {});
  }, []);

  const pins = toStorePins(products || []);

  const offerCountLabel = (count: number) =>
    count === 1
      ? t("client.home.offer_one") || "1 offre"
      : t("client.home.offer_many", { count }) || `${count} offres`;

  return (
    <View style={styles.container}>
      <ScreenHeader title={t("common.show_map") || "Map"} />
      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.map}>
          {/* No `provider`: Apple Maps on iOS, Google Maps on Android. Google Maps
              on iOS needs the Google Maps SDK in the native build, which Expo Go
              and this project's builds do not include. */}
          <MapView
            style={StyleSheet.absoluteFill}
            initialRegion={regionFor(pins)}
            showsUserLocation={showUserLocation}
          >
            {pins.map((pin) => (
              <Marker
                key={pin.key}
                coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
                title={pin.name}
                description={pin.offers.length === 1 ? pin.offers[0].name : offerCountLabel(pin.offers.length)}
                onCalloutPress={() =>
                  router.push(
                    (pin.offers.length === 1 ? `/product/${pin.offers[0].id}` : `/business/${pin.storeId}`) as any
                  )
                }
              />
            ))}
          </MapView>
          {pins.length === 0 ? (
            <View style={styles.emptyBanner} pointerEvents="none">
              <Text style={styles.emptyText}>{t("common.no_results") || "No offers with location found."}</Text>
            </View>
          ) : null}
        </View>
      )}
      <TouchableOpacity style={[styles.backBtn, { bottom: Math.max(insets.bottom, 16) + 8 }]} onPress={() => safeGoBack(router, "/(client)/Home")}>
        <Text style={styles.backText}>{t("common.back") || "Back"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  map: { flex: 1 },
  emptyBanner: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyText: { fontSize: 14, color: theme.muted },
  backBtn: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: theme.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  backText: { color: "#fff", fontWeight: "700" },
});
