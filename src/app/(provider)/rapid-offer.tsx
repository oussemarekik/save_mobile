import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/context/LanguageContext";
import { offersApi } from "@/lib/api-client";
import { invalidateOfferQueries } from "@/lib/offer-queries";
import { ScreenHeader } from "@/components/ScreenHeader";
import { theme } from "@/lib/theme";
import Toast from "react-native-toast-message";
import { sanitizeErrorMessage } from "@/utils/errorUtils";

function defaultPickupStartTime(): string {
  const start = new Date(Date.now() + 60 * 60 * 1000);
  start.setMinutes(0, 0, 0);
  return start.toISOString();
}

export default function RapidOffer() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !price.trim()) return;
    const parsedPrice = parseFloat(price);
    const parsedQuantity = parseInt(quantity, 10) || 1;
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      Toast.show({ type: "error", text1: t("common.error"), text2: t("offer_card.price_label") || "Enter a valid price" });
      return;
    }
    setLoading(true);
    try {
      await offersApi.createRapid({
        title: title.trim(),
        price: parsedPrice,
        quantity: parsedQuantity,
        pickupStartTime: defaultPickupStartTime(),
      });
      await invalidateOfferQueries(queryClient);
      Toast.show({ type: "success", text1: t("provider.rapid_offer.success") || "Offer created!" });
      router.replace("/(provider)/dashboard");
    } catch (error: unknown) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: sanitizeErrorMessage(error, {
          defaultMessage: t("provider.rapid_offer.error") || "Failed to create offer.",
        }),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t("provider.rapid_offer.title") || "Rapid Offer"} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label={t("offer_card.title_label") || "Title"} value={title} onChangeText={setTitle} />
        <Field label={`${t("offer_card.price_label") || "Price"} (dt)`} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
        <Field label={t("offer_card.quantity_label") || "Quantity"} value={quantity} onChangeText={setQuantity} keyboardType="number-pad" />
        <TouchableOpacity style={styles.submit} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t("common.save") || "Save"}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Field({ label, value, onChangeText, keyboardType }: any) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChangeText} keyboardType={keyboardType} placeholderTextColor={theme.muted} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.backgroundGradient },
  content: { padding: 16, gap: 12 },
  field: { gap: 6 },
  label: { fontWeight: "600", color: theme.foreground },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 14, fontSize: 15 },
  submit: { backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  submitText: { color: "#fff", fontWeight: "700" },
});
