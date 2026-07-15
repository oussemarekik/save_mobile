import { useMutation, useQueryClient } from "@tanstack/react-query";
import { offersApi } from "@/lib/api-client";
import { invalidateOfferQueries, providerOffersKey } from "@/lib/offer-queries";
import { useAuth } from "@/hooks/use-auth";

export function useDeleteOffer() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: number) => offersApi.delete(Number(id)),
    onMutate: async (deletedId) => {
      const ownerKey = providerOffersKey(user?.id);
      await queryClient.cancelQueries({ queryKey: ["/offers/owner"] });

      const previousOwnerOffers = queryClient.getQueryData<any[]>(ownerKey);
      queryClient.setQueryData<any[]>(ownerKey, (old) =>
        (old ?? []).filter((offer) => Number(offer.id) !== Number(deletedId))
      );

      return { previousOwnerOffers, ownerKey };
    },
    onError: (_error, _id, context) => {
      if (context?.previousOwnerOffers !== undefined) {
        queryClient.setQueryData(context.ownerKey, context.previousOwnerOffers);
      }
    },
    onSettled: async () => {
      await invalidateOfferQueries(queryClient);
    },
  });
}
