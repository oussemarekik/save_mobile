import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  const { data: offers, isLoading, isError } = useQuery({
    queryKey: ["/offers"],
    queryFn: () => offersApi.getAll(),
    retry: 1,
  });

  const products = offers ? offers.map(transformOfferToProduct) : [];

  return { data: products, isLoading, isError };
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

export function useOrders() {
  const { data: orders, isLoading, isError } = useQuery({
    queryKey: ["/orders"],
    queryFn: async () => {
      const backendOrders = await ordersApi.getAll();
      return backendOrders?.map(transformOrder).filter(Boolean) || [];
    },
    retry: 1,
  });

  return { data: orders || [], isLoading, isError };
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/offers"] });
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

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (providerId: number) => {
      const current =
        (queryClient.getQueryData<number[]>(FAVORITES_QUERY_KEY) as number[] | undefined) || [];
      const isFavorited = current.includes(providerId);

      if (isFavorited) {
        await favoritesApi.remove(providerId);
        return current.filter((id) => id !== providerId);
      }

      await favoritesApi.add(providerId);
      return [...current, providerId];
    },
    onMutate: async (providerId) => {
      await queryClient.cancelQueries({ queryKey: FAVORITES_QUERY_KEY });
      const previous = queryClient.getQueryData<number[]>(FAVORITES_QUERY_KEY) || [];
      const isFavorited = previous.includes(providerId);
      queryClient.setQueryData(
        FAVORITES_QUERY_KEY,
        isFavorited ? previous.filter((id) => id !== providerId) : [...previous, providerId]
      );
      return { previous };
    },
    onError: (_err, _providerId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(FAVORITES_QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
  };
}
