import { OfferWizard } from "@/components/provider/OfferWizard";
import { ProviderGate } from "@/components/provider/ProviderGate";

/**
 * Step-by-step creation of a new offer.
 *
 * Lives outside the provider tabs on purpose: expo-router sends any tab hidden
 * with `href: null` straight back to the first tab, so it could never open there.
 */
export default function NewOffer() {
  return (
    <ProviderGate>
      <OfferWizard mode="create" />
    </ProviderGate>
  );
}
