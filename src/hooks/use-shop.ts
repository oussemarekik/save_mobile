import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  offersApi,
  ordersApi,
  transformOfferToProduct,
  transformOrder,
  groupOffersByOwner,
} from "@/lib/api-client";

// ─── Constants ───────────────────────────────────────────────────────────────

const FAVORITES_KEY = "favorites";
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

// ─── Favorites ────────────────────────────────────────────────────────────────

export function useFavorites() {
  const { data, isLoading, isError } = useQuery({
    queryKey: FAVORITES_QUERY_KEY,
    queryFn: async () => {
      const raw = await AsyncStorage.getItem(FAVORITES_KEY);
      return raw ? (JSON.parse(raw) as number[]) : [];
    },
  });

  return { data: data ?? [], isLoading, isError };
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (productId: number) => {
      const raw = await AsyncStorage.getItem(FAVORITES_KEY);
      const favorites: number[] = raw ? JSON.parse(raw) : [];
      const index = favorites.indexOf(productId);

      if (index > -1) {
        favorites.splice(index, 1);
      } else {
        favorites.push(productId);
      }

      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      return favorites;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY });
    },
  });

  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
  };
}