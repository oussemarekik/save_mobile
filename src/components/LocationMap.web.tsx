import React, { createElement } from "react";
import { View, Text, Pressable, StyleSheet, Linking } from "react-native";
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
  const src = `https://maps.google.com/maps?q=${latitude},${longitude}&z=16&output=embed`;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => Linking.openURL(url)}
        style={[styles.mapFrame, { height }]}
        accessibilityRole="button"
        accessibilityLabel={label || actionLabel || "Map"}
      >
        {createElement("iframe", {
          title: label || "Map",
          src,
          loading: "lazy",
          referrerPolicy: "no-referrer-when-downgrade",
          style: {
            border: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          },
        })}
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
