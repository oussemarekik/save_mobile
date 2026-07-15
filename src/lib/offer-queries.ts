import { QueryClient } from "@tanstack/react-query";

/** Query keys for provider-owned offers */
export const providerOffersKey = (userId?: number) =>
  userId ? (["/offers/owner", userId] as const) : (["/offers/owner"] as const);

/** Invalidate all offer-related caches after create/update/delete */
export async function invalidateOfferQueries(queryClient: QueryClient) {
  const keys = [["/offers"], ["/offers/owner"]] as const;
  await Promise.all(
    keys.map(async (queryKey) => {
      await queryClient.invalidateQueries({ queryKey });
      await queryClient.refetchQueries({ queryKey, type: "active" });
    })
  );
}
