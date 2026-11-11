/**
 * API Client for NestJS Backend - React Native version
 */

import { File as ExpoFile, UploadType } from "expo-file-system";
import { Platform } from "react-native";
import { googlePlaceDetails, googlePlacesAutocomplete } from "@/lib/google-places";
import { ApiError, extractMessageFromApiBody } from "@/utils/errorUtils";
import { ensureUploadableUri, normalizeUploadFile } from "@/lib/upload-file";
import { FALLBACK_IMAGE } from "@/lib/asset-uri";
import { invalidateAuthSession } from "@/lib/auth-session";
import { API_BASE_URL, resolveStorageAssetUrl } from "@/lib/api-base-url";
import { tokenStorage } from "@/lib/token-storage";

export { FALLBACK_IMAGE, tokenStorage, API_BASE_URL };

function isCredentialEndpoint(endpoint: string): boolean {
  return (
    endpoint.includes("/auth/signin") ||
    endpoint.includes("/auth/signup") ||
    endpoint.includes("/auth/google") ||
    endpoint.includes("/auth/facebook") ||
    endpoint.includes("/auth/forgot-password") ||
    endpoint.includes("/auth/reset-password")
  );
}

/** A 401 from a replaced token must not wipe the session that just logged in. */
async function invalidateIfTokenCurrent(tokenUsed: string | null, endpoint: string) {
  if (!tokenUsed || isCredentialEndpoint(endpoint)) return;
  const current = await tokenStorage.get();
  if (current === tokenUsed) {
    await invalidateAuthSession();
  }
}

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
      // Clears tokens AND notifies useAuth so UI does not stay "logged in".
      await invalidateIfTokenCurrent(token, endpoint);
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
      emailVerified?: boolean;
      profileImage?: string; location?: string; phoneNumber?: string; mapsLink?: string;
      latitude?: number | null; longitude?: number | null;
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
    // Backend caps limit at 100 and returns pagination metadata.
    const resp = await apiRequest<any>("/offers?limit=100");
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
    title: string; description: string; price: number; originalPrice: number | null;
    quantity: number; expirationDate: string; pickupStartTime: string;
    pickupEndTime: string; images: string; foodType: string; taste: string;
  }>) => apiRequest<any>(`/offers/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  updateQuantity: async (id: number, quantity: number) =>
    apiRequest<any>(`/offers/${id}/quantity`, { method: "PATCH", body: JSON.stringify({ quantity }) }),

  delete: async (id: number) =>
    apiRequest<{ message: string }>(`/offers/${id}`, { method: "DELETE" }),
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

  /** Soft-hide a finished order from the client's history. */
  deleteFromHistory: async (id: number) =>
    apiRequest<any>(`/orders/${id}/history`, { method: "DELETE" }),

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
    apiRequest<{
      city?: string;
      state?: string;
      locationName?: string;
      formattedAddress?: string;
      latitude?: number;
      longitude?: number;
    }>(`/users/reverse-geocode?lat=${lat}&lon=${lon}`),

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

  deleteOne: async (id: number) =>
    apiRequest(`/notifications/${id}`, { method: "DELETE" }),

  deleteAll: async () =>
    apiRequest("/notifications", { method: "DELETE" }),

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
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    // React Native's Blob cannot be built from bytes ("Creating blobs from
    // ArrayBufferView are not supported"), and winter fetch rejects { uri, name, type }.
    // Upload through the native multipart client instead.
    if (Platform.OS !== "web") {
      const uploaded: Array<{
        filename: string; originalName: string | null; path: string;
        url: string; absoluteUrl: string; blurhash?: string; width?: number; height?: number;
      }> = [];

      for (let index = 0; index < files.length; index++) {
        const normalized = normalizeUploadFile(files[index], index);
        const uri = await ensureUploadableUri(normalized.uri, normalized.fileName);
        const result = await new ExpoFile(uri).upload(`${API_BASE_URL}/storage/upload`, {
          uploadType: UploadType.MULTIPART,
          fieldName: "files",
          mimeType: normalized.mimeType,
          httpMethod: "POST",
          sessionType: "foreground",
          headers,
        });

        if (result.status === 401) {
          await invalidateIfTokenCurrent(token, "/storage/upload");
          throw new ApiError("Your session has expired. Please sign in again.", 401);
        }
        if (result.status < 200 || result.status >= 300) {
          let body: unknown = result.body;
          try { body = JSON.parse(result.body); } catch { /* keep text */ }
          throw new Error(extractMessageFromApiBody(body, result.status) || `HTTP ${result.status}`);
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(result.body);
        } catch {
          throw new Error("Upload failed");
        }
        if (Array.isArray(parsed)) uploaded.push(...parsed);
        else if (parsed) uploaded.push(parsed);
      }

      return uploaded;
    }

    const formData = new FormData();

    for (let index = 0; index < files.length; index++) {
      const normalized = normalizeUploadFile(files[index], index);
      const uri = await ensureUploadableUri(normalized.uri, normalized.fileName);
      const { fileName, mimeType } = normalized;
      const blob = await fetch(uri).then((res) => res.blob());
      formData.append("files", new File([blob], fileName, { type: mimeType }));
    }

    // Do not set Content-Type — fetch must add the multipart boundary automatically.
    const response = await fetch(`${API_BASE_URL}/storage/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        await invalidateIfTokenCurrent(token, "/storage/upload");
        throw new ApiError("Your session has expired. Please sign in again.", 401);
      }
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  getFileUrl: (filename: string): string =>
    resolveStorageAssetUrl(filename) || `${API_BASE_URL}/storage/${filename}`,
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

/**
 * Turns a stored image value into a loadable URL. The backend stores profile
 * images in several shapes: a full URL (Google/Facebook), "/storage/<file>",
 * "/store/profile-images/<file>", or a bare "<file>" (saved from the website).
 * Leftover localhost absoluteUrls and /store vs /storage mismatches are rewritten.
 */
export function buildImageUrl(url: string | null | undefined): string | null {
  if (typeof url !== "string") return null;
  const value = url.trim();
  if (!value || value === "null" || value === "undefined") return null;
  if (value.startsWith("//")) return `https:${value}`;
  // Local/preview URIs must not be rewritten as remote storage paths.
  if (/^(file|content|ph|assets-library|data|blob):/i.test(value)) return value;
  return resolveStorageAssetUrl(value);
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
    buildImageUrl(firstImage?.url) ||
    buildImageUrl(firstImage?.absoluteUrl) ||
    buildImageUrl(firstImage?.filename) ||
    buildImageUrl(firstImage?.path) ||
    FALLBACK_IMAGE;

  const ownerLogo = buildImageUrl(owner.profileImage);
  const ownerImage = ownerLogo || imageUrl;

  const latitude = offer.latitude ?? owner.latitude ?? null;
  const longitude = offer.longitude ?? owner.longitude ?? null;

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
    pickupStartTime: offer.pickupStartTime || null,
    pickupEndTime: offer.pickupEndTime || null,
    imageUrl,
    store: {
      id: offer.ownerId,
      name: owner.username || "Unknown Provider",
      description: owner.location || "",
      address: owner.location || offer.mapsLink || "",
      category: offer.foodType || "Food",
      rating: null,
      imageUrl: ownerImage,
      logoUrl: ownerLogo || undefined,
      mapsLink: offer.mapsLink || owner.mapsLink,
      latitude,
      longitude,
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
      const ownerLogo = buildImageUrl(owner.profileImage);
      const ownerImage = ownerLogo || FALLBACK_IMAGE;
      ownerMap.set(ownerId, {
        id: ownerId,
        name: owner.username || "Unknown Provider",
        description: owner.location || "",
        address: owner.location || offer.mapsLink || "",
        category: offer.foodType || "Food",
        rating: null,
        imageUrl: ownerImage,
        logoUrl: ownerLogo || undefined,
        mapsLink: offer.mapsLink || owner.mapsLink,
        latitude: offer.latitude ?? owner.latitude ?? null,
        longitude: offer.longitude ?? owner.longitude ?? null,
        products: [],
      });
    }
    ownerMap.get(ownerId)!.products.push(transformOfferToProduct(offer));
  });
  return Array.from(ownerMap.values());
}