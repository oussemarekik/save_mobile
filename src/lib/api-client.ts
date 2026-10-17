/**
 * API Client for NestJS Backend - React Native version
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { googlePlaceDetails, googlePlacesAutocomplete } from "@/lib/google-places";
import { ApiError, extractMessageFromApiBody } from "@/utils/errorUtils";
import { ensureUploadableUri, normalizeUploadFile } from "@/lib/upload-file";
import { FALLBACK_IMAGE } from "@/lib/asset-uri";

export { FALLBACK_IMAGE };

const DEFAULT_API_BASE_URL =
  Platform.select({
    web: "https://savetheplate.tn/api",
    ios: "https://savetheplate.tn/api",
    android: "https://savetheplate.tn/api",
    default: "https://savetheplate.tn/api",
  }) || "https://savetheplate.tn/api";

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");

// ─── Token Storage (AsyncStorage) ─────────────────────────────────────────────
const isSSR = typeof window === "undefined";

export const tokenStorage = {
  get: (): Promise<string | null> => {
    if (isSSR) return Promise.resolve(null);
    return AsyncStorage.getItem("accessToken");
  },
  set: (token: string): Promise<void> => {
    if (isSSR) return Promise.resolve();
    return AsyncStorage.setItem("accessToken", token);
  },
  remove: async (): Promise<void> => {
    if (isSSR) return;
    await AsyncStorage.removeItem("accessToken");
    await AsyncStorage.removeItem("refreshToken");
    await AsyncStorage.removeItem("auth-intent-role");
  },
  getRefresh: (): Promise<string | null> => {
    if (isSSR) return Promise.resolve(null);
    return AsyncStorage.getItem("refreshToken");
  },
  setRefresh: (token: string): Promise<void> => {
    if (isSSR) return Promise.resolve();
    return AsyncStorage.setItem("refreshToken", token);
  },
};

// ─── API Request ───────────────────────────────────────────────────────────────
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await tokenStorage.get();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;

  if (__DEV__) {
    console.log("[API] Request:", options.method || "GET", url);
    console.log("[API] Has token:", !!token);
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    if (response.status === 401) {
      await tokenStorage.remove();
    }

    let body: unknown = null;
    let rawText = "";

    try {
      rawText = await response.text();
      if (rawText) {
        try {
          body = JSON.parse(rawText);
        } catch {
          body = rawText;
        }
      }
    } catch {
      rawText = "";
    }

    const message = extractMessageFromApiBody(body ?? rawText, response.status);

    if (__DEV__) {
      console.error("[API] Error response:", { status: response.status, body: body ?? rawText });
    }

    if (response.status === 401) {
      throw new ApiError(
        message === "Something went wrong. Please try again."
          ? "Your session has expired. Please sign in again."
          : message,
        401,
        body
      );
    }

    throw new ApiError(message, response.status, body);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) return response.json();
  return response.text() as unknown as T;
}

// ─── Auth API ──────────────────────────────────────────────────────────────────
export const authApi = {
  register: async (email: string, username: string, password: string) => {
    const response = await apiRequest<{
      message: string; accessToken: string; refreshToken: string;
      user: { id: number; email: string; role: string; emailVerified?: boolean } | null;
      redirectTo: string;
    }>("/auth/signup", { method: "POST", body: JSON.stringify({ email, username, password }) });

    if (response.accessToken) {
      await tokenStorage.set(response.accessToken);
      if (response.refreshToken) await tokenStorage.setRefresh(response.refreshToken);
    }
    return response;
  },

  registerBusiness: async (payload: {
    email: string;
    username: string;
    password: string;
    phoneNumber: string;
    location: string;
    mapsLink?: string;
    latitude?: number | null;
    longitude?: number | null;
  }) => {
    const response = await apiRequest<{
      message: string; accessToken: string; refreshToken: string;
      user: { id: number; email: string; role: string; emailVerified?: boolean } | null;
      redirectTo: string;
    }>("/auth/signup", { method: "POST", body: JSON.stringify(payload) });

    if (response.accessToken) {
      await tokenStorage.set(response.accessToken);
      if (response.refreshToken) await tokenStorage.setRefresh(response.refreshToken);
    }
    return response;
  },

  login: async (email: string, password: string) => {
    const response = await apiRequest<{
      message: string; accessToken: string; refreshToken: string;
      user: { id: number; email: string; role: string } | null; redirectTo: string;
    }>("/auth/signin", { method: "POST", body: JSON.stringify({ email, password }) });

    if (response.accessToken) {
      await tokenStorage.set(response.accessToken);
      if (response.refreshToken) await tokenStorage.setRefresh(response.refreshToken);
    }
    return response;
  },

  getUserByToken: async () =>
    apiRequest<{
      id: number; email: string; username: string; role: string;
      profileImage?: string; location?: string; phoneNumber?: string; mapsLink?: string;
    }>("/auth/get-user-by-token"),

  googleAuth: async (idToken: string) => {
    const response = await apiRequest<{
      accessToken: string; refreshToken: string;
      user: { id: number; email: string; role: string };
    }>("/auth/google", { method: "POST", body: JSON.stringify({ token: idToken }) });

    if (response.accessToken) {
      await tokenStorage.set(response.accessToken);
      if (response.refreshToken) await tokenStorage.setRefresh(response.refreshToken);
    }
    return response;
  },

  facebookAuth: async (accessToken: string) => {
    const response = await apiRequest<{
      accessToken: string; refreshToken: string;
      user: { id: number; email: string; role: string };
    }>("/auth/facebook", { method: "POST", body: JSON.stringify({ accessToken }) });

    if (response.accessToken) {
      await tokenStorage.set(response.accessToken);
      if (response.refreshToken) await tokenStorage.setRefresh(response.refreshToken);
    }
    return response;
  },

  sendVerificationEmail: async (email: string) =>
    apiRequest<{ message: string; sent?: boolean }>("/auth/send-verification-email", {
      method: "POST", body: JSON.stringify({ email }),
    }),

  verifyEmailCode: async (email: string, code: string) =>
    apiRequest<{ verified: boolean; message?: string }>("/auth/verify-email-code", {
      method: "POST", body: JSON.stringify({ email, code }),
    }),

  forgotPassword: async (email: string) =>
    apiRequest<{ sent: boolean; message?: string }>("/auth/forgot-password", {
      method: "POST", body: JSON.stringify({ email }),
    }),

  resetPassword: async (email: string, code: string, newPassword: string) =>
    apiRequest<{ reset: boolean; message?: string }>("/auth/reset-password", {
      method: "POST", body: JSON.stringify({ email, code, newPassword }),
    }),

  cleanupPartialSignup: async () =>
    apiRequest<{ message: string }>("/auth/cleanup-partial-signup", { method: "DELETE" }),
};

// ─── Offers API ────────────────────────────────────────────────────────────────
export const offersApi = {
  getAll: async () => {
    const resp = await apiRequest<any>("/offers");
    if (!resp) return [];
    if (Array.isArray(resp)) return resp;
    if (Array.isArray(resp.data)) return resp.data;
    if (resp.data && Array.isArray(resp.data.data)) return resp.data.data;
    return [];
  },

  getById: async (id: number) => apiRequest<any>(`/offers/${id}`),

  getByOwner: async (ownerId: number) => {
    const resp = await apiRequest<any>(`/offers/owner/${ownerId}`);
    if (!resp) return [];
    if (Array.isArray(resp)) return resp;
    if (Array.isArray(resp.data)) return resp.data;
    if (resp.data && Array.isArray(resp.data.data)) return resp.data.data;
    return [];
  },

  create: async (data: {
    title: string; description?: string; price: number; originalPrice?: number;
    quantity: number; expirationDate: string; pickupStartTime: string;
    pickupEndTime: string; images?: string; foodType?: string; taste?: string;
  }) => apiRequest<any>("/offers", { method: "POST", body: JSON.stringify(data) }),

  update: async (id: number, data: Partial<{
    title: string; description: string; price: number; originalPrice: number;
    quantity: number; expirationDate: string; pickupStartTime: string;
    pickupEndTime: string; images: string; foodType: string; taste: string;
  }>) => apiRequest<any>(`/offers/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  updateQuantity: async (id: number, quantity: number) =>
    apiRequest<any>(`/offers/${id}/quantity`, { method: "PATCH", body: JSON.stringify({ quantity }) }),

  delete: async (id: number) =>
    apiRequest<{ message: string }>(`/offers/${id}`, { method: "DELETE" }),

  createRapid: async (data: { title: string; price: number; quantity: number; pickupStartTime?: string; originalPrice?: number }) =>
    apiRequest<any>("/offers/rapid-minimal", { method: "POST", body: JSON.stringify(data) }),
};

// ─── Orders API ────────────────────────────────────────────────────────────────
export const ordersApi = {
  getAll: async () => apiRequest<any[]>("/orders"),
  getById: async (id: number) => apiRequest<any>(`/orders/${id}`),
  getByUser: async (userId: number) => apiRequest<any[]>(`/orders/user/${userId}`),
  getForProvider: async () => apiRequest<any[]>("/orders/provider"),

  create: async (data: { offerId: number; quantity: number }) =>
    apiRequest<any>("/orders", { method: "POST", body: JSON.stringify(data) }),

  cancel: async (id: number) =>
    apiRequest<any>(`/orders/${id}/cancel`, { method: "POST" }),

  confirm: async (id: number) =>
    apiRequest<any>(`/orders/${id}/confirm`, { method: "POST" }),

  scan: async (qrCodeToken: string) =>
    apiRequest<any>("/orders/scan", { method: "POST", body: JSON.stringify({ qrCodeToken }) }),
};

// ─── Users API ─────────────────────────────────────────────────────────────────
export const usersApi = {
  getMe: async () => apiRequest<any>("/users/me"),

  updateProfile: async (data: {
    username?: string; location?: string; phoneNumber?: string | number;
    profileImage?: string; mapsLink?: string;
    latitude?: number | null; longitude?: number | null;
  }) => apiRequest<any>("/users/me", { method: "POST", body: JSON.stringify(data) }),

  setRole: async (role: "CLIENT" | "PROVIDER") =>
    apiRequest<{ message: string; redirectTo: string; role: string }>(
      "/users/set-role", { method: "POST", body: JSON.stringify({ role }) }
    ),

  getRole: async () => apiRequest<{ role: string; message: string }>("/users/get-role"),

  updateDetails: async (data: {
    username?: string; location?: string; longitude?: number;
    latitude?: number; phoneNumber?: string; mapsLink?: string;
  }) => apiRequest<any>("/users/update-details", { method: "POST", body: JSON.stringify(data) }),

  deleteAccount: async (email: string) =>
    apiRequest<{ message: string }>(`/users/${encodeURIComponent(email)}`, { method: "DELETE" }),

  search: async (name: string) => apiRequest<any[]>(`/users/search?name=${encodeURIComponent(name)}`),

  getProfile: async (id: string | number) => apiRequest<any>(`/users/profile/${id}`),

  reverseGeocode: async (lat: number, lon: number) =>
    apiRequest<{ city?: string; state?: string; locationName?: string }>(
      `/users/reverse-geocode?lat=${lat}&lon=${lon}`
    ),

  extractLocation: async (mapsLink: string) =>
    apiRequest<{ locationName?: string; latitude?: number; longitude?: number }>(
      "/users/extract-location",
      { method: "POST", body: JSON.stringify({ mapsLink }) }
    ),

  placesAutocomplete: async (query: string, language?: string) => {
    try {
      const params = new URLSearchParams({ q: query });
      if (language) params.set("language", language);
      return await apiRequest<{
        suggestions: Array<{
          placeId: string;
          description: string;
          mainText: string;
          secondaryText: string;
          name?: string;
          formattedAddress?: string;
          latitude?: number | null;
          longitude?: number | null;
        }>;
      }>(`/users/places-autocomplete?${params.toString()}`);
    } catch {
      const suggestions = await googlePlacesAutocomplete(query, language);
      return { suggestions };
    }
  },

  placeDetails: async (placeId: string, language?: string) => {
    try {
      const params = new URLSearchParams({ placeId });
      if (language) params.set("language", language);
      return await apiRequest<{
        placeId: string;
        name: string;
        formattedAddress: string;
        latitude: number | null;
        longitude: number | null;
      }>(`/users/place-details?${params.toString()}`);
    } catch {
      const place = await googlePlaceDetails(placeId, language);
      if (!place) throw new Error("Place not found");
      return place;
    }
  },
};

export const favoritesApi = {
  list: async () =>
    apiRequest<{ providerIds: number[] }>("/favorites"),

  check: async (providerId: number) =>
    apiRequest<{ favorited: boolean }>(`/favorites/${providerId}`),

  add: async (providerId: number) =>
    apiRequest<{ favorited: true; providerId: number }>(`/favorites/${providerId}`, {
      method: "POST",
    }),

  remove: async (providerId: number) =>
    apiRequest<{ favorited: false; providerId: number }>(`/favorites/${providerId}`, {
      method: "DELETE",
    }),
};

export const ratingsApi = {
  getProviderAverage: async (providerId: number) =>
    apiRequest<{ averageRating?: number; totalRatings?: number }>(
      `/ratings/provider/${providerId}/average`
    ),

  getByOrder: async (orderId: number) =>
    apiRequest<{
      id: number;
      orderId: number;
      providerId: number;
      rating: number;
      tags?: string[];
      comment?: string;
    } | null>(`/ratings/order/${orderId}`),

  create: async (data: {
    orderId: number;
    providerId: number;
    rating: number;
    tags?: string[];
    comment?: string;
  }) =>
    apiRequest("/ratings", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export type NotificationSettings = {
  orderConfirmed: boolean;
  orderReadyForPickup: boolean;
  newOffersFromFavorites: boolean;
  orderPending: boolean;
  orderCancelled: boolean;
  newOrder: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
};

export type AppNotification = {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
};

export const notificationsApi = {
  list: async (page = 1, limit = 20) =>
    apiRequest<{
      notifications: AppNotification[];
      total: number;
      page: number;
      totalPages: number;
    }>(`/notifications?page=${page}&limit=${limit}`),

  unreadCount: async () =>
    apiRequest<{ count: number }>("/notifications/unread-count"),

  markAsRead: async (id: number) =>
    apiRequest(`/notifications/${id}/read`, { method: "PUT" }),

  markAllAsRead: async () =>
    apiRequest("/notifications/read-all", { method: "PUT" }),

  getSettings: async () =>
    apiRequest<NotificationSettings>("/notifications/settings"),

  updateSettings: async (settings: Partial<NotificationSettings>) =>
    apiRequest<NotificationSettings>("/notifications/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),

  registerExpoPushToken: async (data: { token: string; platform?: string }) =>
    apiRequest("/notifications/expo-push-token", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  unregisterExpoPushToken: async (token: string) =>
    apiRequest("/notifications/expo-push-token", {
      method: "DELETE",
      body: JSON.stringify({ token }),
    }),

  testPush: async () =>
    apiRequest("/notifications/test-push", { method: "POST" }),
};

export const contactApi = {
  send: async (data: {
    name: string;
    email: string;
    subject?: string;
    message: string;
    userRole?: string;
    userId?: number;
  }) => apiRequest<{ message: string }>("/contact", { method: "POST", body: JSON.stringify(data) }),
};

// ─── Storage API ───────────────────────────────────────────────────────────────
// In React Native, files are URIs (from expo-image-picker), not File objects
export const storageApi = {
  upload: async (
    files: Array<string | { uri: string; mimeType?: string; fileName?: string }>
  ): Promise<Array<{
    filename: string; originalName: string | null; path: string;
    url: string; absoluteUrl: string; blurhash?: string; width?: number; height?: number;
  }>> => {
    const token = await tokenStorage.get();
    const formData = new FormData();

    for (let index = 0; index < files.length; index++) {
      const normalized = normalizeUploadFile(files[index], index);
      const uri = await ensureUploadableUri(normalized.uri, normalized.fileName);
      const { fileName, mimeType } = normalized;

      if (Platform.OS === "web") {
        const blob = await fetch(uri).then((res) => res.blob());
        formData.append("files", new File([blob], fileName, { type: mimeType }));
      } else {
        // React Native FormData accepts { uri, name, type }.
        // Android requires a readable file:// URI (not content://).
        formData.append("files", { uri, name: fileName, type: mimeType } as any);
      }
    }

    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    // Do not set Content-Type — fetch must add the multipart boundary automatically.

    const response = await fetch(`${API_BASE_URL}/storage/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  getFileUrl: (filename: string): string => `${API_BASE_URL}/storage/${filename}`,
};

// ─── Transform helpers ─────────────────────────────────────────────────────────
function extractTimeFromDateTime(dateTime: string | Date | null | undefined, defaultTime: string): string {
  if (!dateTime) return defaultTime;
  try {
    const date = typeof dateTime === "string" ? new Date(dateTime) : dateTime;
    if (isNaN(date.getTime())) return defaultTime;
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  } catch { return defaultTime; }
}

export function buildImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE_URL}${url}`;
  return `${API_BASE_URL}/storage/${url}`;
}

export function transformOfferToProduct(offer: any): any {
  const owner = offer.owner || {};
  let images: any[] = [];
  if (offer.images) {
    if (typeof offer.images === "string") {
      try { images = JSON.parse(offer.images); } catch { images = []; }
    } else if (Array.isArray(offer.images)) {
      images = offer.images;
    }
  }

  const firstImage = images[0] || null;
  const imageUrl =
    buildImageUrl(firstImage?.absoluteUrl) ||
    buildImageUrl(firstImage?.url) ||
    (firstImage?.filename ? `${API_BASE_URL}/storage/${firstImage.filename}` : null) ||
    FALLBACK_IMAGE;

  const ownerImage = owner.profileImage
    ? (owner.profileImage.startsWith("http") ? owner.profileImage : `${API_BASE_URL}${owner.profileImage}`)
    : imageUrl;

  return {
    id: offer.id,
    storeId: offer.ownerId,
    name: offer.title,
    description: offer.description || "",
    price: offer.price,
    originalPrice: offer.originalPrice,
    quantity: offer.quantity,
    pickupStart: extractTimeFromDateTime(offer.pickupStartTime, "17:00"),
    pickupEnd: extractTimeFromDateTime(offer.pickupEndTime, "18:00"),
    imageUrl,
    store: {
      id: offer.ownerId,
      name: owner.username || "Unknown Provider",
      description: owner.location || "",
      address: owner.location || offer.mapsLink || "",
      category: offer.foodType || "Food",
      rating: null,
      imageUrl: ownerImage,
      logoUrl: owner.profileImage ? ownerImage : undefined,
      mapsLink: offer.mapsLink || owner.mapsLink,
    },
    expirationDate: offer.expirationDate,
    foodType: offer.foodType,
    taste: offer.taste,
  };
}

export function transformOrder(order: any): any {
  if (!order) return null;
  const offer = order.offer || {};
  const product = transformOfferToProduct(offer);
  const providerId = offer.ownerId || product.storeId || product.store?.id;

  return {
    id: order.id,
    userId: order.userId,
    productId: order.offerId,
    providerId,
    quantity: order.quantity,
    status: order.status,
    pickupCode: order.qrCodeToken || order.id.toString(),
    totalPrice: (offer.price || 0) * order.quantity,
    createdAt: order.createdAt,
    collectedAt: order.collectedAt,
    user: order.user || null,
    product: {
      ...product,
      originalPrice: offer.originalPrice || product.originalPrice || 0,
      pickupStart: product.pickupStart,
      pickupEnd: product.pickupEnd,
    },
  };
}

export function groupOffersByOwner(offers: any[]): any[] {
  const ownerMap = new Map<number, any>();
  offers.forEach((offer) => {
    const ownerId = offer.ownerId;
    if (!ownerMap.has(ownerId)) {
      const owner = offer.owner || {};
      const ownerImage = owner.profileImage
        ? (owner.profileImage.startsWith("http") ? owner.profileImage : `${API_BASE_URL}${owner.profileImage}`)
        : FALLBACK_IMAGE;
      ownerMap.set(ownerId, {
        id: ownerId,
        name: owner.username || "Unknown Provider",
        description: owner.location || "",
        address: owner.location || offer.mapsLink || "",
        category: offer.foodType || "Food",
        rating: null,
        imageUrl: ownerImage,
        logoUrl: owner.profileImage ? ownerImage : undefined,
        mapsLink: offer.mapsLink || owner.mapsLink,
        products: [],
      });
    }
    ownerMap.get(ownerId)!.products.push(transformOfferToProduct(offer));
  });
  return Array.from(ownerMap.values());
}