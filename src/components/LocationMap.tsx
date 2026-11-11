import React from "react";
import { View, Text, Pressable, StyleSheet, Linking } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { googleMapsSearchUrl } from "@/lib/maps-link";

type LocationMapProps = {
  latitude: number;
  longitude: number;
  label?: string;
  mapsUrl?: string;
  height?: number;
  actionLabel?: string;
};

export function LocationMap({
  latitude,
  longitude,
  label,
  mapsUrl,
  height = 180,
  actionLabel,
}: LocationMapProps) {
  const url =
    mapsUrl || googleMapsSearchUrl(label || "", undefined, latitude, longitude);

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => Linking.openURL(url)}
        style={[styles.mapFrame, { height }]}
        accessibilityRole="button"
        accessibilityLabel={label || actionLabel || "Map"}
      >
        <MapView
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
          initialRegion={{
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          liteMode
        >
          <Marker
            coordinate={{ latitude, longitude }}
            title={label}
          />
        </MapView>
        {actionLabel ? (
          <View style={styles.chip} pointerEvents="none">
            <Text style={styles.chipText}>{actionLabel}</Text>
          </View>
        ) : null}
      </Pressable>
      {label ? (
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16, width: "100%", alignSelf: "stretch" },
  mapFrame: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E7E4DC",
  },
  chip: {
    position: "absolute",
    alignSelf: "center",
    bottom: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  chipText: { fontSize: 14, fontWeight: "600", color: "#111" },
  label: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: "#5C6B63",
  },
});
