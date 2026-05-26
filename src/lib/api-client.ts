/**
 * API Client for NestJS Backend
 * Handles all API communication with the NestJS backend
 */

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3001';

// Token management
export const tokenStorage = {
  get: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  },
  set: (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('accessToken', token);
  },
  remove: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
  getRefresh: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  },
  setRefresh: (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('refreshToken', token);
  },
};

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = tokenStorage.get();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Note: Token refresh endpoint may not be implemented in backend yet
      // If backend supports /auth/refresh, uncomment this section
      /*
      const refreshToken = tokenStorage.getRefresh();
      if (refreshToken) {
        try {
          const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
            credentials: 'include',
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            if (refreshData.accessToken) {
              tokenStorage.set(refreshData.accessToken);
              if (refreshData.refreshToken) {
                tokenStorage.setRefresh(refreshData.refreshToken);
              }
              const newHeaders = { ...headers };
              newHeaders['Authorization'] = `Bearer ${refreshData.accessToken}`;
              const retryResponse = await fetch(url, {
                ...options,
                headers: newHeaders,
                credentials: 'include',
              });
              if (retryResponse.ok) {
                const contentType = retryResponse.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                  return retryResponse.json();
                }
                return retryResponse.text() as unknown as T;
              }
            }
          }
        } catch (refreshError) {
          // Refresh failed, continue to error
        }
      }
      */
      // Token expired or invalid - clear tokens
      tokenStorage.remove();
      throw new Error('Unauthorized');
    }
    let errorText = '';
    try {
      errorText = await response.text();
      // Try to parse as JSON for better error messages
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
          // Handle validation errors
          if (Array.isArray(errorJson.message)) {
            throw new Error(errorJson.message.join(', '));
          }
          throw new Error(errorJson.message);
        }
        if (errorJson.error) {
          throw new Error(errorJson.error);
        }
      } catch (parseError) {
        // Not JSON, use text as-is
      }
    } catch (textError) {
      errorText = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`);
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  return response.text() as unknown as T;
}

// Auth API
export const authApi = {
  register: async (email: string, username: string, password: string) => {
    const response = await apiRequest<{
      message: string;
      accessToken: string;
      refreshToken: string;
      user: { id: number; email: string; role: string } | null;
      redirectTo: string;
    }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    });

    if (response.accessToken) {
      tokenStorage.set(response.accessToken);
      if (response.refreshToken) {
        tokenStorage.setRefresh(response.refreshToken);
      }
    }

    return response;
  },

  login: async (email: string, password: string) => {
    const response = await apiRequest<{
      message: string;
      accessToken: string;
      refreshToken: string;
      user: { id: number; email: string; role: string } | null;
      redirectTo: string;
    }>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.accessToken) {
      tokenStorage.set(response.accessToken);
      if (response.refreshToken) {
        tokenStorage.setRefresh(response.refreshToken);
      }
    }

    return response;
  },

  sendMagicMail: async (email: string) => {
    return apiRequest<{ message: string; sent: boolean }>('/auth/send-verification-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  verifyMagicMail: async (token: string) => {
    const response = await apiRequest<{
      message: string;
      accessToken: string;
      refreshToken: string;
      user: { id: number; email: string; role: string } | null;
      redirectTo: string;
    }>('/auth/verify-magic-mail', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });

    if (response.accessToken) {
      tokenStorage.set(response.accessToken);
      if (response.refreshToken) {
        tokenStorage.setRefresh(response.refreshToken);
      }
    }

    return response;
  },

  getUserByToken: async () => {
    return apiRequest<{
      id: number;
      email: string;
      username: string;
      role: string;
      profileImage?: string;
      location?: string;
      mapsLink?: string;
    }>('/auth/get-user-by-token');
  },

  googleAuth: async (idToken: string) => {
    const response = await apiRequest<{
      accessToken: string;
      refreshToken: string;
      user: { id: number; email: string; role: string };
    }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ token: idToken }),
    });

    if (response.accessToken) {
      tokenStorage.set(response.accessToken);
      if (response.refreshToken) {
        tokenStorage.setRefresh(response.refreshToken);
      }
    }

    return response;
  },

  facebookAuth: async (accessToken: string) => {
    const response = await apiRequest<{
      accessToken: string;
      refreshToken: string;
      user: { id: number; email: string; role: string };
    }>('/auth/facebook', {
      method: 'POST',
      body: JSON.stringify({ accessToken }),
    });

    if (response.accessToken) {
      tokenStorage.set(response.accessToken);
      if (response.refreshToken) {
        tokenStorage.setRefresh(response.refreshToken);
      }
    }

    return response;
  },

};

// Offers API (maps to Products in frontend)
export const offersApi = {
  getAll: async () => {
    const resp = await apiRequest<any>('/offers');
    // Backend may return a paginated object { data: [...], hasMore: boolean }
    if (!resp) return [];
    if (Array.isArray(resp)) return resp;
    if (Array.isArray(resp.data)) return resp.data;
    // Fallback: if the object itself has a `data` field nested further, try that
    if (resp.data && Array.isArray(resp.data.data)) return resp.data.data;
    return [];
  },

  getById: async (id: number) => {
    return apiRequest<any>(`/offers/${id}`);
  },

  getByOwner: async (ownerId: number) => {
    const resp = await apiRequest<any>(`/offers/owner/${ownerId}`);
    if (!resp) return [];
    if (Array.isArray(resp)) return resp;
    if (Array.isArray(resp.data)) return resp.data;
    if (resp.data && Array.isArray(resp.data.data)) return resp.data.data;
    return [];
  },

  create: async (data: {
    title: string;
    description?: string;
    price: number;
    originalPrice?: number;
    quantity: number;
    expirationDate: string;
    pickupStartTime: string;
    pickupEndTime: string;
    images?: string;
    foodType?: string;
    taste?: string;
  }) => {
    return apiRequest<any>('/offers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<{
    title: string;
    description: string;
    price: number;
    originalPrice: number;
    quantity: number;
    expirationDate: string;
    pickupStartTime: string;
    pickupEndTime: string;
    images: string;
    foodType: string;
    taste: string;
  }>) => {
    return apiRequest<any>(`/offers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updateQuantity: async (id: number, quantity: number) => {
    return apiRequest<any>(`/offers/${id}/quantity`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
  },

  delete: async (id: number) => {
    return apiRequest<{ message: string }>(`/offers/${id}`, {
      method: 'DELETE',
    });
  },
};

// Orders API
export const ordersApi = {
  getAll: async () => {
    return apiRequest<any[]>('/orders');
  },

  getById: async (id: number) => {
    return apiRequest<any>(`/orders/${id}`);
  },

  getByUser: async (userId: number) => {
    return apiRequest<any[]>(`/orders/user/${userId}`);
  },

  getForProvider: async () => {
    return apiRequest<any[]>('/orders/provider');
  },

  create: async (data: { offerId: number; quantity: number }) => {
    return apiRequest<any>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  cancel: async (id: number) => {
    return apiRequest<any>(`/orders/${id}/cancel`, {
      method: 'POST',
    });
  },

  confirm: async (id: number) => {
    return apiRequest<any>(`/orders/${id}/confirm`, {
      method: 'POST',
    });
  },

  scan: async (qrCodeToken: string) => {
    return apiRequest<any>('/orders/scan', {
      method: 'POST',
      body: JSON.stringify({ qrCodeToken }),
    });
  },
};

// Users API
export const usersApi = {
  getMe: async () => {
    return apiRequest<any>('/users/me');
  },

  updateProfile: async (data: {
    username?: string;
    location?: string;
    phoneNumber?: string;
    profileImage?: string;
    mapsLink?: string;
  }) => {
    return apiRequest<any>('/users/me', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  setRole: async (role: 'CLIENT' | 'PROVIDER') => {
    return apiRequest<{ message: string; redirectTo: string; role: string }>(
      '/users/set-role',
      {
        method: 'POST',
        body: JSON.stringify({ role }),
      }
    );
  },

  getRole: async () => {
    return apiRequest<{ role: string; message: string }>('/users/get-role');
  },

  updateDetails: async (data: {
    username?: string;
    location?: string;
    longitude?: number;
    latitude?: number;
    phoneNumber?: string;
    mapsLink?: string;
  }) => {
    return apiRequest<any>('/users/update-details', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Storage API
export const storageApi = {
  upload: async (files: File[]): Promise<Array<{
    filename: string;
    originalName: string | null;
    path: string;
    url: string;
    absoluteUrl: string;
    blurhash?: string;
    width?: number;
    height?: number;
  }>> => {
    const token = tokenStorage.get();
    const formData = new FormData();
    
    files.forEach((file) => {
      formData.append('files', file);
    });

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}/storage/upload`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  getFileUrl: (filename: string): string => {
    return `${API_BASE_URL}/storage/${filename}`;
  },
};

// Helper to transform NestJS order to frontend Order format
export function transformOrder(order: any): any {
  if (!order) return null;
  
  const offer = order.offer || {};
  const owner = offer.owner || {};
  
  // Handle images - could be array, JSON string, or null
  let images = [];
  if (offer.images) {
    if (typeof offer.images === 'string') {
      try {
        images = JSON.parse(offer.images);
      } catch {
        images = [];
      }
    } else if (Array.isArray(offer.images)) {
      images = offer.images;
    }
  }
  
  const firstImage = images.length > 0 ? images[0] : null;
  
  // Helper to build full image URL
  const buildImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    // If it's already a full URL (starts with http), return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // If it's a relative path (starts with /), prefix with API_BASE_URL
    if (url.startsWith('/')) {
      return `${API_BASE_URL}${url}`;
    }
    // Otherwise, assume it's a filename and build the storage URL
    return `${API_BASE_URL}/storage/${url}`;
  };
  
  const imageUrl = buildImageUrl(firstImage?.absoluteUrl) || 
    buildImageUrl(firstImage?.url) || 
    (firstImage?.filename ? `${API_BASE_URL}/storage/${firstImage.filename}` : null) ||
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80';

  // Transform offer to product format
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
    user: order.user || null, // Include user/client information if available
    product: {
      ...product,
      // Ensure product has all fields needed, including originalPrice
      originalPrice: offer.originalPrice || product.originalPrice || 0,
      // pickupStart and pickupEnd are already formatted in transformOfferToProduct
      // Use the product's values instead of re-extracting
      pickupStart: product.pickupStart,
      pickupEnd: product.pickupEnd,
    },
  };
}

// Helper to extract time (HH:MM) from datetime string
function extractTimeFromDateTime(dateTime: string | Date | null | undefined, defaultTime: string): string {
  if (!dateTime) return defaultTime;
  try {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
    if (isNaN(date.getTime())) return defaultTime;
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return defaultTime;
  }
}

// Helper to transform NestJS offer to frontend Product/Store format
export function transformOfferToProduct(offer: any): any {
  const owner = offer.owner || {};
  
  // Handle images - backend normalizes them to array with {filename, url, absoluteUrl}
  let images = [];
  if (offer.images) {
    if (typeof offer.images === 'string') {
      try {
        images = JSON.parse(offer.images);
      } catch {
        images = [];
      }
    } else if (Array.isArray(offer.images)) {
      images = offer.images;
    }
  }
  
  const firstImage = images.length > 0 ? images[0] : null;
  
  // Helper to build full image URL
  const buildImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    // If it's already a full URL (starts with http), return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // If it's a relative path (starts with /), prefix with API_BASE_URL
    if (url.startsWith('/')) {
      return `${API_BASE_URL}${url}`;
    }
    // Otherwise, assume it's a filename and build the storage URL
    return `${API_BASE_URL}/storage/${url}`;
  };
  
  const imageUrl = buildImageUrl(firstImage?.absoluteUrl) || 
    buildImageUrl(firstImage?.url) || 
    (firstImage?.filename ? `${API_BASE_URL}/storage/${firstImage.filename}` : null) ||
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80';

  return {
    id: offer.id,
    storeId: offer.ownerId,
    name: offer.title,
    description: offer.description || '',
    price: offer.price,
    originalPrice: offer.originalPrice,
    quantity: offer.quantity,
    pickupStart: extractTimeFromDateTime(offer.pickupStartTime, '17:00'),
    pickupEnd: extractTimeFromDateTime(offer.pickupEndTime, '18:00'),
    imageUrl,
    store: {
      id: offer.ownerId,
      name: owner.username || 'Unknown Provider',
      description: owner.location || '',
      address: owner.location || offer.mapsLink || '',
      category: offer.foodType || 'Food',
      rating: '4.5',
      imageUrl: owner.profileImage 
        ? (owner.profileImage.startsWith('http') 
            ? owner.profileImage 
            : `${API_BASE_URL}${owner.profileImage}`)
        : imageUrl,
      logoUrl: owner.profileImage 
        ? (owner.profileImage.startsWith('http') 
            ? owner.profileImage 
            : `${API_BASE_URL}${owner.profileImage}`)
        : undefined,
      mapsLink: offer.mapsLink || owner.mapsLink,
    },
    expirationDate: offer.expirationDate,
    foodType: offer.foodType,
    taste: offer.taste,
  };
}

// Helper to group offers by owner (for stores view)
export function groupOffersByOwner(offers: any[]): any[] {
  const ownerMap = new Map<number, any>();

  offers.forEach((offer) => {
    const ownerId = offer.ownerId;
    if (!ownerMap.has(ownerId)) {
      const owner = offer.owner || {};
      ownerMap.set(ownerId, {
        id: ownerId,
        name: owner.username || 'Unknown Provider',
        description: owner.location || '',
        address: owner.location || offer.mapsLink || '',
        category: offer.foodType || 'Food',
        rating: '4.5',
        imageUrl: owner.profileImage 
          ? (owner.profileImage.startsWith('http') 
              ? owner.profileImage 
              : `${API_BASE_URL}${owner.profileImage}`)
          : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
        logoUrl: owner.profileImage 
          ? (owner.profileImage.startsWith('http') 
              ? owner.profileImage 
              : `${API_BASE_URL}${owner.profileImage}`)
          : undefined,
        mapsLink: offer.mapsLink || owner.mapsLink,
        products: [],
      });
    }
    ownerMap.get(ownerId)!.products.push(transformOfferToProduct(offer));
  });

  return Array.from(ownerMap.values());
}

