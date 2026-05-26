import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { offersApi, ordersApi, transformOfferToProduct, transformOrder, groupOffersByOwner } from "@/lib/api-client";
import type { Product, Store } from "@/lib/mock-data";

// Stores (grouped by owner from offers)
export function useStores() {
  const { data: offers, isLoading, isError } = useQuery({
    queryKey: ["/offers"],
    queryFn: () => offersApi.getAll(),
    retry: 1,
  });

  const stores = offers ? groupOffersByOwner(offers) : [];

  return {
    data: stores,
    isLoading,
    isError,
  };
}

export function useStore(id: number) {
  const { data: offers, isLoading, isError } = useQuery({
    queryKey: ["/offers"],
    queryFn: () => offersApi.getAll(),
    retry: 1,
  });

  // Find store by owner ID
  const storeOffers = offers?.filter((offer: any) => offer.ownerId === id) || [];
  const store = storeOffers.length > 0 
    ? groupOffersByOwner(storeOffers)[0]
    : null;

  return {
    data: store,
    isLoading,
    isError,
  };
}

// Products (offers from NestJS)
export function useProducts() {
  const { data: offers, isLoading, isError } = useQuery({
    queryKey: ["/offers"],
    queryFn: () => offersApi.getAll(),
    retry: 1,
  });

  // Transform all offers to products (don't filter by quantity - let UI handle sold-out display)
  const products = offers 
    ? offers.map(transformOfferToProduct)
    : [];

  return {
    data: products,
    isLoading,
    isError,
  };
}

export function useProduct(id: number) {
  const { data: offer, isLoading, isError } = useQuery({
    queryKey: [`/offers/${id}`],
    queryFn: () => offersApi.getById(id),
    retry: 1,
  });

  const product = offer ? transformOfferToProduct(offer) : null;

  return {
    data: product,
    isLoading,
    isError,
  };
}

// Orders
export function useOrders() {
  const { data: orders, isLoading, isError } = useQuery({
    queryKey: ["/orders"],
    queryFn: async () => {
      const backendOrders = await ordersApi.getAll();
      // Transform backend orders (with offer) to frontend format (with product)
      return backendOrders?.map(transformOrder).filter(Boolean) || [];
    },
    retry: 1,
    enabled: !!localStorage.getItem("accessToken"), // Only fetch if authenticated
  });

  return {
    data: orders || [],
    isLoading,
    isError,
  };
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: { productId: number; quantity: number }) => {
      // Map productId (which is offerId in NestJS) to offerId
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

// Favorites - uses localStorage (client-side only)
export function useFavorites() {
  const favorites = typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem("favorites") || "[]")
    : [];
  
  return {
    data: favorites,
    isLoading: false,
  };
}

export function useToggleFavorite() {
  return {
    mutate: (productId: number) => {
      if (typeof window === 'undefined') return [];
      
      const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
      const index = favorites.indexOf(productId);
      
      if (index > -1) {
        favorites.splice(index, 1);
      } else {
        favorites.push(productId);
      }
      
      localStorage.setItem("favorites", JSON.stringify(favorites));
      return favorites;
    },
    isPending: false,
  };
}
