import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { usersApi } from "@/lib/api-client";
import { useLanguage } from "@/context/LanguageContext";
import { theme } from "@/lib/theme";
import { googleMapsSearchUrl } from "@/lib/maps-link";
import Toast from "react-native-toast-message";

export type SelectedPlace = {
  placeId?: string;
  name?: string;
  formattedAddress?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export function generateMapsLink(
  locationName: string,
  businessName?: string,
  latitude?: number | null,
  longitude?: number | null,
  placeId?: string
) {
  return googleMapsSearchUrl(locationName, businessName, latitude, longitude, placeId);
}

type Suggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  name?: string;
  formattedAddress?: string;
  latitude?: number | null;
  longitude?: number | null;
};

type LocationAutocompleteProps = {
  value: string;
  onChange: (value: string, place?: SelectedPlace) => void;
  placeholder?: string;
  /** "underline" matches the auth (sign-in) stepped forms */
  variant?: "default" | "underline";
  /** Only commit when a place suggestion is selected (no free-text address). */
  exactPlaceOnly?: boolean;
  /** Show a button that fills the address from the device GPS. */
  enableCurrentLocation?: boolean;
  /** When enabled and value is empty, try once to fill from current GPS. */
  autoDetectWhenEmpty?: boolean;
};

export function LocationAutocomplete({
  value,
  onChange,
  placeholder,
  variant = "default",
  exactPlaceOnly = false,
  enableCurrentLocation = false,
  autoDetectWhenEmpty = false,
}: LocationAutocompleteProps) {
  const { t, language } = useLanguage();
  const [searchValue, setSearchValue] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const selectingRef = useRef(false);
  const autoDetectTriedRef = useRef(false);

  useEffect(() => {
    setSearchValue(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const applyPlace = (locationName: string, place: SelectedPlace) => {
    setSearchValue(locationName);
    onChange(locationName, place);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const fillFromCurrentLocation = async (silent = false) => {
    if (isDetectingLocation) return;
    setIsDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (!silent) {
          Toast.show({
            type: "error",
            text1: t("common.error"),
            text2:
              t("account_details.location_permission_denied") ||
              "Location permission is required to detect your address.",
          });
        }
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const geo = await usersApi.reverseGeocode(lat, lng);
      const address =
        geo.formattedAddress?.trim() ||
        geo.locationName?.trim() ||
        [geo.city, geo.state].filter((part) => part && part !== "Unknown").join(", ");

      if (!address) {
        if (!silent) {
          Toast.show({
            type: "error",
            text1: t("common.error"),
            text2:
              t("account_details.location_detect_failed") ||
              "Could not resolve your current address.",
          });
        }
        return;
      }

      applyPlace(address, {
        name: geo.city && geo.city !== "Unknown" ? geo.city : address,
        formattedAddress: address,
        latitude: geo.latitude ?? lat,
        longitude: geo.longitude ?? lng,
      });
    } catch {
      if (!silent) {
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2:
            t("account_details.location_detect_failed") ||
            "Could not resolve your current address.",
        });
      }
    } finally {
      setIsDetectingLocation(false);
    }
  };

  useEffect(() => {
    if (!enableCurrentLocation || !autoDetectWhenEmpty) return;
    if (autoDetectTriedRef.current) return;
    if (value.trim()) return;
    autoDetectTriedRef.current = true;
    void fillFromCurrentLocation(true);
    // Only attempt once when the field starts empty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableCurrentLocation, autoDetectWhenEmpty, value]);

  const fetchSuggestions = async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    try {
      const response = await usersApi.placesAutocomplete(trimmed, language);
      if (requestId !== requestIdRef.current) return;
      setSuggestions(response.suggestions || []);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setSuggestions([]);
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  };

  const handleTextChange = (next: string) => {
    setSearchValue(next);
    setShowSuggestions(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(next);
    }, 300);
  };

  const handleSelect = async (suggestion: Suggestion) => {
    selectingRef.current = true;
    const fallback = suggestion.description || suggestion.mainText;
    setSearchValue(fallback);
    setShowSuggestions(false);
    setSuggestions([]);

    if (
      suggestion.latitude != null &&
      suggestion.longitude != null &&
      Number.isFinite(suggestion.latitude) &&
      Number.isFinite(suggestion.longitude)
    ) {
      applyPlace(suggestion.formattedAddress || fallback, {
        placeId: suggestion.placeId,
        name: suggestion.name || suggestion.mainText,
        formattedAddress: suggestion.formattedAddress || fallback,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
      });
      setTimeout(() => {
        selectingRef.current = false;
      }, 400);
      return;
    }

    setIsLoading(true);
    try {
      const place = await usersApi.placeDetails(suggestion.placeId, language);
      const locationName = place.formattedAddress || place.name || fallback;
      applyPlace(locationName, {
        placeId: place.placeId || suggestion.placeId,
        name: place.name,
        formattedAddress: place.formattedAddress,
        latitude: place.latitude,
        longitude: place.longitude,
      });
    } catch {
      applyPlace(fallback, { placeId: suggestion.placeId, name: suggestion.mainText });
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        selectingRef.current = false;
      }, 400);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (selectingRef.current) return;
      setShowSuggestions(false);
      if (exactPlaceOnly) {
        // Keep the last confirmed place address; discard free-typed text.
        if (searchValue !== value) setSearchValue(value);
        return;
      }
      if (searchValue.trim() && searchValue !== value) {
        onChange(searchValue);
      }
    }, 150);
  };

  const clearValue = () => {
    setSearchValue("");
    setSuggestions([]);
    setShowSuggestions(false);
    onChange("");
  };

  const isUnderline = variant === "underline";
  const iconColor = isUnderline ? "#5C6B63" : theme.muted;

  return (
    <View style={isUnderline ? styles.underlineBlock : undefined}>
      {enableCurrentLocation ? (
        <TouchableOpacity
          style={[
            styles.currentLocationButton,
            isUnderline && styles.currentLocationButtonUnderline,
          ]}
          onPress={() => void fillFromCurrentLocation(false)}
          disabled={isDetectingLocation}
          activeOpacity={0.7}
        >
          {isDetectingLocation ? (
            <ActivityIndicator
              size="small"
              color={isUnderline ? "#004225" : theme.primary}
            />
          ) : (
            <Ionicons
              name="navigate-outline"
              size={16}
              color={isUnderline ? "#004225" : theme.primary}
            />
          )}
          <Text
            style={[
              styles.currentLocationText,
              isUnderline && styles.currentLocationTextUnderline,
            ]}
          >
            {isDetectingLocation
              ? t("account_details.detecting_location") || "Detecting location..."
              : t("account_details.use_current_location") ||
                "Use my current location"}
          </Text>
        </TouchableOpacity>
      ) : null}
      <View
        style={[
          styles.inputWrapper,
          isUnderline && styles.inputWrapperUnderline,
        ]}
      >
        <Ionicons
          name="search-outline"
          size={18}
          color={iconColor}
          style={styles.leadingIcon}
        />
        <TextInput
          style={[styles.input, isUnderline && styles.inputUnderline]}
          value={searchValue}
          onChangeText={handleTextChange}
          onFocus={() => {
            setShowSuggestions(true);
            if (searchValue.trim().length >= 2 && suggestions.length === 0) {
              fetchSuggestions(searchValue);
            }
          }}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={isUnderline ? "#9AA59E" : "#999"}
          autoCapitalize="sentences"
        />
        {isLoading || isDetectingLocation ? (
          <ActivityIndicator
            size="small"
            color={isUnderline ? "#004225" : theme.primary}
            style={styles.trailingIcon}
          />
        ) : searchValue ? (
          <TouchableOpacity
            onPress={clearValue}
            style={styles.trailingIcon}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={18} color={iconColor} />
          </TouchableOpacity>
        ) : (
          <Ionicons
            name="location-outline"
            size={18}
            color={iconColor}
            style={styles.trailingIcon}
          />
        )}
      </View>

      {showSuggestions &&
      (isLoading || suggestions.length > 0 || searchValue.trim().length >= 2) ? (
        <View
          style={[styles.dropdown, isUnderline && styles.dropdownUnderline]}
        >
          {isLoading && suggestions.length === 0 ? (
            <Text style={styles.muted}>
              {t("business_signup.location_searching") || "Searching..."}
            </Text>
          ) : suggestions.length > 0 ? (
            <ScrollView
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              style={styles.dropdownScroll}
            >
              {suggestions.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion.placeId}
                  style={styles.suggestion}
                  onPressIn={() => {
                    selectingRef.current = true;
                  }}
                  delayPressIn={0}
                  onPress={() => handleSelect(suggestion)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={isUnderline ? "#5C6B63" : theme.muted}
                    style={{ marginTop: 2 }}
                  />
                  <View style={styles.suggestionText}>
                    <Text
                      style={[
                        styles.mainText,
                        isUnderline && styles.mainTextUnderline,
                      ]}
                      numberOfLines={1}
                    >
                      {suggestion.mainText || suggestion.description}
                    </Text>
                    {suggestion.secondaryText ? (
                      <Text style={styles.secondaryText} numberOfLines={2}>
                        {suggestion.secondaryText}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.muted}>
              {t("business_signup.location_empty") ||
                "No locations found. Try typing the address manually."}
            </Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  underlineBlock: {
    marginBottom: 22,
  },
  currentLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    marginBottom: 10,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  currentLocationButtonUnderline: {
    marginBottom: 8,
  },
  currentLocationText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.primary,
  },
  currentLocationTextUnderline: {
    color: "#004225",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.backgroundGradient,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputWrapperUnderline: {
    backgroundColor: "transparent",
    borderWidth: 0,
    borderRadius: 0,
    borderBottomWidth: 2,
    borderBottomColor: "#C8CFC9",
    paddingHorizontal: 0,
    minHeight: 48,
  },
  leadingIcon: { marginRight: 8 },
  trailingIcon: { marginLeft: 8 },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: theme.foreground,
  },
  inputUnderline: {
    fontSize: 18,
    color: "#004225",
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
  },
  dropdown: {
    marginTop: 6,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    overflow: "hidden",
  },
  dropdownUnderline: {
    backgroundColor: "#FEFBF6",
    borderColor: "#C8CFC9",
  },
  dropdownScroll: { maxHeight: 280 },
  suggestion: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  suggestionText: { flex: 1, minWidth: 0 },
  mainText: { fontSize: 14, fontWeight: "600", color: "#111" },
  mainTextUnderline: { color: "#004225" },
  secondaryText: { fontSize: 12, color: theme.muted, marginTop: 2 },
  muted: { fontSize: 13, color: theme.muted, padding: 12 },
});
