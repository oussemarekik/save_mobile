/**
 * API Client for NestJS Backend - React Native version
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = process.env.VITE_API_URL || "http://localhost:3001";

// ─── Token Storage (AsyncStorage) ─────────────────────────────────────────────
export const tokenStorage = {
  get: (): Promise<string | null> => AsyncStorage.getItem("accessToken"),
  set: (token: string): Promise<void> => AsyncStorage.setItem("accessToken", token),
  remove: async (): Promise<void> => {
    await AsyncStorage.removeItem("accessToken");
    await AsyncStorage.removeItem("refreshToken");
  },
  getRefresh: (): Promise<string | null> => AsyncStorage.getItem("refreshToken"),
  setRefresh: (token: string): Promise<void> => AsyncStorage.setItem("refreshToken", token),
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

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    if (response.status === 401) {
      await tokenStorage.remove();
      throw new Error("Unauthorized");
    }
    let errorText = "";
    try {
      errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
          throw new Error(Array.isArray(errorJson.message) ? errorJson.message.join(", ") : errorJson.message);
        }
        if (errorJson.error) throw new Error(errorJson.error);
      } catch (parseError) {
        // not JSON
      }
    } catch {
      errorText = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`);
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
      user: { id: number; email: string; role: string } | null; redirectTo: string;
    }>("/auth/signup", { method: "POST", body: JSON.stringify({ email, username, password }) });

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

  sendMagicMail: async (email: string) =>
    apiRequest<{ message: string; sent: boolean }>("/auth/send-verification-email", {
      method: "POST", body: JSON.stringify({ email }),
    }),

  verifyMagicMail: async (token: string) => {
    const response = await apiRequest<{
      message: string; accessToken: string; refreshToken: string;
      user: { id: number; email: string; role: string } | null; redirectTo: string;
    }>("/auth/verify-magic-mail", { method: "POST", body: JSON.stringify({ token }) });

    if (response.accessToken) {
      await tokenStorage.set(response.accessToken);
      if (response.refreshToken) await tokenStorage.setRefresh(response.refreshToken);
    }
    return response;
  },

  getUserByToken: async () =>
    apiRequest<{
      id: number; email: string; username: string; role: string;
      profileImage?: string; location?: string; mapsLink?: string;
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
    username?: string; location?: string; phoneNumber?: string;
    profileImage?: string; mapsLink?: string;
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
};

// ─── Storage API ───────────────────────────────────────────────────────────────
// In React Native, files are URIs (from expo-image-picker), not File objects
export const storageApi = {
  upload: async (fileUris: string[]): Promise<Array<{
    filename: string; originalName: string | null; path: string;
    url: string; absoluteUrl: string; blurhash?: string; width?: number; height?: number;
  }>> => {
    const token = await tokenStorage.get();
    const formData = new FormData();

    fileUris.forEach((uri, index) => {
      const filename = uri.split("/").pop() || `image_${index}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";
      // React Native FormData accepts { uri, name, type }
      formData.append("files", { uri, name: filename, type } as any);
    });

    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

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

function buildImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE_URL}${url}`;
  return `${API_BASE_URL}/storage/${url}`;
}

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80";

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
      rating: "4.5",
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

  return {
    id: order.id,
    userId: order.userId,
    productId: order.offerId,
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
        rating: "4.5",
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