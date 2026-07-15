import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useLanguage } from "@/context/LanguageContext";
import { useProducts } from "@/hooks/use-shop";
import { ScreenHeader } from "@/components/ScreenHeader";
import { theme } from "@/lib/theme";

export default function MapScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const { data: products, isLoading } = useProducts();
  const [region, setRegion] = useState({
    latitude: 36.8065,
    longitude: 10.1815,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
  });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setRegion((r) => ({
          ...r,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        }));
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <ScreenHeader title={t("common.show_map") || "Map"} />
      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <MapView style={styles.map} region={region} provider={PROVIDER_GOOGLE}>
          {products?.map((p: any) => {
            const lat = p.store?.latitude;
            const lng = p.store?.longitude;
            if (!lat || !lng) return null;
            return (
              <Marker
                key={p.id}
                coordinate={{ latitude: lat, longitude: lng }}
                title={p.name}
                description={p.store?.name}
                onCalloutPress={() => router.push(`/product/${p.id}` as any)}
              />
            );
          })}
        </MapView>
      )}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>{t("common.back") || "Back"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  map: { flex: 1 },
  backBtn: {
    position: "absolute",
    bottom: 32,
    alignSelf: "center",
    backgroundColor: theme.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  backText: { color: "#fff", fontWeight: "700" },
});
