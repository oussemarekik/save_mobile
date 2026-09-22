import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/context/LanguageContext";
import { offersApi } from "@/lib/api-client";
import { invalidateOfferQueries } from "@/lib/offer-queries";
import { ScreenHeader } from "@/components/ScreenHeader";
import { theme } from "@/lib/theme";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { safeGoBack } from "@/lib/navigation";

type RescuePackSize = "small" | "medium" | "large";

const RESCUE_PACK_OPTIONS: Record<RescuePackSize, { price: number; itemsKey: string; descKey: string }> = {
  small: { price: 5, itemsKey: "create_magic_box.size_small_items", descKey: "create_magic_box.size_small_desc" },
  medium: { price: 7, itemsKey: "create_magic_box.size_medium_items", descKey: "create_magic_box.size_medium_desc" },
  large: { price: 10, itemsKey: "create_magic_box.size_large_items", descKey: "create_magic_box.size_large_desc" },
};

export default function CreateMagicBox() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [selectedSize, setSelectedSize] = useState<RescuePackSize>("small");
  const [quantity, setQuantity] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [pickupDate, setPickupDate] = useState(new Date().toISOString().slice(0, 10));
  const [pickupStartTime, setPickupStartTime] = useState("17:00");
  const [pickupEndTime, setPickupEndTime] = useState("18:00");
  const [loading, setLoading] = useState(false);

  const selected = RESCUE_PACK_OPTIONS[selectedSize];

  const handleSubmit = async () => {
    if (!quantity || parseFloat(quantity) <= 0) {
      Toast.show({ type: "error", text1: t("create_magic_box.error_quantity_toast") || "Quantity is required" });
      return;
    }
    if (!pickupDate) {
      Toast.show({ type: "error", text1: t("create_magic_box.error_date_toast") || "Pickup date is required" });
      return;
    }

    const startDateTime = new Date(`${pickupDate}T${pickupStartTime}`);
    const endDateTime = new Date(`${pickupDate}T${pickupEndTime}`);

    if (startDateTime >= endDateTime) {
      Toast.show({ type: "error", text1: t("create_magic_box.error_time_order_toast") || "End time must be after start time" });
      return;
    }
    if (endDateTime <= new Date()) {
      Toast.show({ type: "error", text1: t("create_magic_box.error_future_time_toast") || "Pickup must be in the future" });
      return;
    }

    setLoading(true);
    try {
      const imagesPayload = JSON.stringify([{ url: "/defaultBag.png" }]);
      const payload: Record<string, unknown> = {
        title: `${selectedSize.charAt(0).toUpperCase() + selectedSize.slice(1)} Rescue Pack`,
        description: `${t(selected.descKey)}. Contains ${t(selected.itemsKey)} of rescued food items.`,
        price: selected.price,
        expirationDate: endDateTime.toISOString(),
        pickupStartTime: startDateTime.toISOString(),
        pickupEndTime: endDateTime.toISOString(),
        latitude: 0,
        longitude: 0,
        images: imagesPayload,
        quantity: parseFloat(quantity),
      };

      if (originalPrice.trim()) {
        const parsed = parseFloat(originalPrice.trim());
        if (!isNaN(parsed) && parsed > 0) payload.originalPrice = parsed;
      }

      await offersApi.create(payload as Parameters<typeof offersApi.create>[0]);
      await invalidateOfferQueries(queryClient);
      Toast.show({ type: "success", text1: t("create_magic_box.success_created") || "Rescue Pack created!" });
      router.replace("/(provider)/dashboard");
    } catch (error: any) {
      Toast.show({ type: "error", text1: t("create_magic_box.error_create_failed") || "Failed to create rescue pack", text2: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t("create_magic_box.title") || "Create Rescue Pack"} onBack={() => safeGoBack(router, "/(provider)/dashboard")} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.subtitle}>{t("create_magic_box.subtitle")}</Text>

        <View style={styles.sizeGrid}>
          {(Object.keys(RESCUE_PACK_OPTIONS) as RescuePackSize[]).map((size) => (
            <TouchableOpacity
              key={size}
              style={[styles.sizeCard, selectedSize === size && styles.sizeCardActive]}
              onPress={() => setSelectedSize(size)}
            >
              <Ionicons name="gift-outline" size={24} color={selectedSize === size ? theme.primary : theme.muted} />
              <Text style={styles.sizeLabel}>{t(`create_magic_box.size_${size}`) || size}</Text>
              <Text style={styles.sizePrice}>{RESCUE_PACK_OPTIONS[size].price} dt</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Field label={t("create_magic_box.available_quantity") || "Quantity"} value={quantity} onChangeText={setQuantity} keyboardType="number-pad" />
        <Field
          label={`${t("create_magic_box.original_price") || "Original Price"} ${t("create_magic_box.original_price_optional") || "(Optional)"}`}
          value={originalPrice}
          onChangeText={setOriginalPrice}
          keyboardType="decimal-pad"
        />
        <Field label={t("create_magic_box.pickup_date") || "Pickup Date"} value={pickupDate} onChangeText={setPickupDate} placeholder="YYYY-MM-DD" />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label={t("create_magic_box.start_time") || "Start Time"} value={pickupStartTime} onChangeText={setPickupStartTime} placeholder="17:00" />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Field label={t("create_magic_box.end_time") || "End Time"} value={pickupEndTime} onChangeText={setPickupEndTime} placeholder="18:00" />
          </View>
        </View>

        <Text style={styles.footer}>{t("create_magic_box.footer")}</Text>

        <TouchableOpacity style={styles.submit} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>
              {(t("create_magic_box.create_button") || "Create {size} Rescue Pack").replace("{size}", selectedSize)}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Field({ label, value, onChangeText, keyboardType, placeholder }: {
  label: string; value: string; onChangeText: (v: string) => void; keyboardType?: any; placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.backgroundGradient },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  subtitle: { fontSize: 14, color: theme.muted, marginBottom: 4 },
  sizeGrid: { flexDirection: "row", gap: 10, marginBottom: 8 },
  sizeCard: {
    flex: 1,
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: theme.border,
    backgroundColor: "#fff",
    gap: 4,
  },
  sizeCardActive: { borderColor: theme.primary, backgroundColor: "#f0fdf4" },
  sizeLabel: { fontWeight: "700", fontSize: 13, color: theme.foreground, textTransform: "capitalize" },
  sizePrice: { fontSize: 12, color: theme.primary, fontWeight: "600" },
  field: { gap: 6 },
  label: { fontWeight: "600", color: theme.foreground, fontSize: 13 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 14, fontSize: 15 },
  row: { flexDirection: "row" },
  footer: { fontSize: 13, color: theme.muted, textAlign: "center", marginTop: 8 },
  submit: { backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  submitText: { color: "#fff", fontWeight: "700" },
});
