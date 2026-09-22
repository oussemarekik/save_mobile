import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usersApi } from "@/lib/api-client";
import { useLanguage } from "@/context/LanguageContext";
import { theme } from "@/lib/theme";

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
  if (latitude && longitude) {
    const query = businessName
      ? `${encodeURIComponent(businessName)} ${latitude},${longitude}`
      : `${latitude},${longitude}`;
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }
  const query = businessName
    ? `${encodeURIComponent(businessName)} ${encodeURIComponent(locationName)}`
    : encodeURIComponent(locationName);
  if (placeId) {
    return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${placeId}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
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
};

export function LocationAutocomplete({
  value,
  onChange,
  placeholder,
}: LocationAutocompleteProps) {
  const { t, language } = useLanguage();
  const [searchValue, setSearchValue] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const selectingRef = useRef(false);

  useEffect(() => {
    setSearchValue(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

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

  const applyPlace = (locationName: string, place: SelectedPlace) => {
    setSearchValue(locationName);
    onChange(locationName, place);
    setShowSuggestions(false);
    setSuggestions([]);
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

  return (
    <View>
      <View style={styles.inputWrapper}>
        <Ionicons name="search-outline" size={18} color="#888" style={styles.leadingIcon} />
        <TextInput
          style={styles.input}
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
          placeholderTextColor="#999"
          autoCapitalize="sentences"
        />
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.primary} style={styles.trailingIcon} />
        ) : searchValue ? (
          <TouchableOpacity onPress={clearValue} style={styles.trailingIcon} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="#888" />
          </TouchableOpacity>
        ) : (
          <Ionicons name="location-outline" size={18} color="#888" style={styles.trailingIcon} />
        )}
      </View>

      {showSuggestions && (isLoading || suggestions.length > 0 || searchValue.trim().length >= 2) ? (
        <View style={styles.dropdown}>
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
                  <Ionicons name="location-outline" size={16} color={theme.muted} style={{ marginTop: 2 }} />
                  <View style={styles.suggestionText}>
                    <Text style={styles.mainText} numberOfLines={1}>
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
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  leadingIcon: { marginRight: 8 },
  trailingIcon: { marginLeft: 8 },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: "#111",
  },
  dropdown: {
    marginTop: 6,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    overflow: "hidden",
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
  secondaryText: { fontSize: 12, color: theme.muted, marginTop: 2 },
  muted: { fontSize: 13, color: theme.muted, padding: 12 },
});
