import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/context/LanguageContext";
import { offersApi } from "@/lib/api-client";
import { providerOffersKey } from "@/lib/offer-queries";
import { theme } from "@/lib/theme";
import { OfferWizard } from "@/components/provider/OfferWizard";
import { ProviderGate } from "@/components/provider/ProviderGate";

/**
 * Edits one of the provider's offers. With `relaunch=1` it only asks for a new
 * pickup slot and quantity, to put an ended offer back on sale.
 *
 * Like `new-offer`, it sits outside the provider tabs so it can actually open.
 */
export default function EditOffer() {
  return (
    <ProviderGate>
      <EditOfferScreen />
    </ProviderGate>
  );
}

function EditOfferScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id?: string | string[]; relaunch?: string | string[] }>();
  const offerId = Number(Array.isArray(params.id) ? params.id[0] : params.id);
  const relaunch = (Array.isArray(params.relaunch) ? params.relaunch[0] : params.relaunch) === "1";

  const { data: offers, isLoading } = useQuery({
    queryKey: providerOffersKey(user?.id),
    queryFn: () => offersApi.getByOwner(user?.id || 0),
    enabled: !!user?.id && typeof user.id === "number",
  });
  const offer = offers?.find((candidate: any) => Number(candidate.id) === offerId);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primaryDark} />
      </View>
    );
  }

  if (!offer) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>{t("provider_offers.not_found")}</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.dismissTo("/(provider)/dashboard")}>
          <Text style={styles.buttonText}>{t("provider_offers.back_to_dashboard")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <OfferWizard key={`${offer.id}-${relaunch}`} mode={relaunch ? "relaunch" : "edit"} offer={offer} />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
    backgroundColor: theme.backgroundGradient,
  },
  message: { fontSize: 17, fontWeight: "600", color: theme.primaryDark, textAlign: "center" },
  button: { backgroundColor: theme.primaryDark, borderRadius: 28, height: 52, paddingHorizontal: 28, justifyContent: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
