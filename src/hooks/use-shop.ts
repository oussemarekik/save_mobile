import { useQuery, useMutation, useQueryClient, type MutateOptions } from "@tanstack/react-query";
import {
  offersApi,
  ordersApi,
  favoritesApi,
  transformOfferToProduct,
  transformOrder,
  groupOffersByOwner,
} from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";

// ─── Constants ───────────────────────────────────────────────────────────────

const FAVORITES_QUERY_KEY = ["favorites"];

// ─── Stores ──────────────────────────────────────────────────────────────────

export function useStores() {
  const { data: offers, isLoading, isError } = useQuery({
    queryKey: ["/offers"],
    queryFn: () => offersApi.getAll(),
    retry: 1,
  });

  const stores = offers ? groupOffersByOwner(offers) : [];

  return { data: stores, isLoading, isError };
}

export function useStore(id: number) {
  const { data: offers, isLoading, isError } = useQuery({
    queryKey: ["/offers"],
    queryFn: () => offersApi.getAll(),
    retry: 1,
  });

  const storeOffers = offers?.filter((offer: any) => offer.ownerId === id) || [];
  const store = storeOffers.length > 0
    ? groupOffersByOwner(storeOffers)[0]
    : null;

  return { data: store, isLoading, isError };
}

// ─── Products ─────────────────────────────────────────────────────────────────

export function useProducts() {
  const { data: offers, isLoading, isError, refetch } = useQuery({
    queryKey: ["/offers"],
    queryFn: () => offersApi.getAll(),
    retry: 1,
    refetchOnWindowFocus: true,
  });

  const products = offers ? offers.map(transformOfferToProduct) : [];

  return { data: products, isLoading, isError, refetch };
}

export function useProduct(id: number) {
  const { data: offer, isLoading, isError } = useQuery({
    queryKey: [`/offers/${id}`],
    queryFn: () => offersApi.getById(id),
    retry: 1,
  });

  const product = offer ? transformOfferToProduct(offer) : null;

  return { data: product, isLoading, isError };
}

// ─── Orders ───────────────────────────────────────────────────────────────────

function orderAwaitingPickup(order: any): boolean {
  if (!order) return false;
  // Pending = reserved, waiting for QR scan. Confirmed without collectedAt = same.
  return (
    order.status === "pending" ||
    (order.status === "confirmed" && !order.collectedAt)
  );
}

export function useOrders() {
  const { data: orders, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["/orders"],
    queryFn: async () => {
      const backendOrders = await ordersApi.getAll();
      return backendOrders?.map(transformOrder).filter(Boolean) || [];
    },
    retry: 1,
    // Keep Orders in sync when a provider scans the pickup QR (web or mobile).
    // Poll only while something is still awaiting collection.
    refetchInterval: (query) => {
      const list = query.state.data as any[] | undefined;
      if (!list?.some(orderAwaitingPickup)) return false;
      return 3000;
    },
    refetchOnWindowFocus: true,
  });

  return { data: orders || [], isLoading, isError, refetch, isFetching };
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: { productId: number; quantity: number }) => {
      return ordersApi.create({
        offerId: data.productId,
        quantity: data.quantity,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/offers"] });
      queryClient.invalidateQueries({ queryKey: [`/offers/${variables.productId}`] });
    },
  });

  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
  };
}

// ─── Favorites (provider / business IDs) ──────────────────────────────────────

export function useFavorites() {
  const { isAuthenticated } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: FAVORITES_QUERY_KEY,
    queryFn: async () => {
      const result = await favoritesApi.list();
      return result.providerIds || [];
    },
    enabled: isAuthenticated,
    retry: 1,
  });

  return { data: data ?? [], isLoading: isAuthenticated ? isLoading : false, isError };
}

type ToggleFavoriteVariables = { providerId: number; favorite: boolean };
type ToggleFavoriteOptions = MutateOptions<
  boolean,
  Error,
  ToggleFavoriteVariables,
  { previous: number[] }
>;

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ providerId, favorite }: ToggleFavoriteVariables) => {
      if (favorite) {
        await favoritesApi.add(providerId);
      } else {
        await favoritesApi.remove(providerId);
      }
      return favorite;
    },
    onMutate: async ({ providerId, favorite }) => {
      await queryClient.cancelQueries({ queryKey: FAVORITES_QUERY_KEY });
      const previous = queryClient.getQueryData<number[]>(FAVORITES_QUERY_KEY) || [];
      const others = previous.filter((id) => id !== providerId);
      queryClient.setQueryData(FAVORITES_QUERY_KEY, favorite ? [...others, providerId] : others);
      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(FAVORITES_QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY });
    },
  });

  // Decide add vs. remove at tap time: onMutate updates the cached list before
  // mutationFn runs, so reading the cache there gives the opposite answer.
  const nextState = (providerId: number): ToggleFavoriteVariables => {
    const current = queryClient.getQueryData<number[]>(FAVORITES_QUERY_KEY) || [];
    return { providerId, favorite: !current.includes(providerId) };
  };

  return {
    mutate: (providerId: number, options?: ToggleFavoriteOptions) =>
      mutation.mutate(nextState(providerId), options),
    mutateAsync: (providerId: number, options?: ToggleFavoriteOptions) =>
      mutation.mutateAsync(nextState(providerId), options),
    isPending: mutation.isPending,
    isError: mutation.isError,
  };
}
