import { useMutation, useQueryClient } from "@tanstack/react-query";
import { offersApi } from "@/lib/api-client";
import { invalidateOfferQueries, providerOffersKey } from "@/lib/offer-queries";
import { useAuth } from "@/hooks/use-auth";

const MUTATION_KEY = ["offer-quantity"] as const;

/** Sets how many units of an offer are left, updating the provider's list right away. */
export function useUpdateOfferQuantity() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationKey: MUTATION_KEY,
    // Quick taps are sent one after the other so the last one wins on the server too
    scope: { id: "offer-quantity" },
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) =>
      offersApi.updateQuantity(id, quantity),
    onMutate: async ({ id, quantity }) => {
      const ownerKey = providerOffersKey(user?.id);
      await queryClient.cancelQueries({ queryKey: ["/offers/owner"] });

      const previousOffers = queryClient.getQueryData<any[]>(ownerKey);
      queryClient.setQueryData<any[]>(ownerKey, (old) =>
        (old ?? []).map((offer) => (Number(offer.id) === id ? { ...offer, quantity } : offer))
      );

      return { previousOffers, ownerKey };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousOffers !== undefined) {
        queryClient.setQueryData(context.ownerKey, context.previousOffers);
      }
    },
    onSettled: async () => {
      // While taps are still in flight, a refetch would bring back an older quantity
      if (queryClient.isMutating({ mutationKey: MUTATION_KEY }) > 1) return;
      await invalidateOfferQueries(queryClient);
    },
  });
}
