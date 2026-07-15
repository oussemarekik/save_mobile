import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { offersApi, ordersApi } from "@/lib/api-client";
import { providerOffersKey } from "@/lib/offer-queries";
import { getOfferStats } from "@/utils/offerUtils";

export function useProviderStats() {
  const { user, isAuthenticated } = useAuth();

  const { data: offers = [], isLoading: offersLoading } = useQuery({
    queryKey: providerOffersKey(user?.id),
    queryFn: () => offersApi.getByOwner(user?.id || 0),
    enabled: !!user?.id && isAuthenticated,
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["/orders/provider"],
    queryFn: () => ordersApi.getForProvider(),
    enabled: isAuthenticated,
  });

  const confirmedOrders = orders.filter((o: any) => o.status === "confirmed");
  const revenue = confirmedOrders.reduce((sum: number, order: any) => {
    const price = order.offer?.price || 0;
    return sum + (order.quantity || 0) * price;
  }, 0);
  const totalMealsSaved = confirmedOrders.reduce((sum: number, order: any) => sum + (order.quantity || 0), 0);
  const co2Saved = totalMealsSaved * 1.5;
  const waterSaved = totalMealsSaved * 1500;
  const totalItems = offers.reduce((sum: number, o: any) => sum + (o.quantity ?? 0), 0);

  return {
    offers,
    orders,
    isLoading: offersLoading || ordersLoading,
    offerStats: getOfferStats(offers),
    stats: {
      totalOffers: offers.length,
      totalItems,
      revenue,
      totalMealsSaved,
      co2Saved,
      waterSaved,
    },
  };
}
