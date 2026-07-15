import { useEffect, useSyncExternalStore } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi, tokenStorage } from "@/lib/api-client";
import { clearAuthSession } from "@/lib/auth-session";

export type AuthenticatedUser = {
  id: number;
  email: string;
  username: string;
  role: string;
  profileImage?: string;
  location?: string;
  phoneNumber?: string;
  mapsLink?: string;
};

let hasTokenCache: boolean | null = null;
const tokenListeners = new Set<() => void>();

function subscribeToToken(listener: () => void) {
  tokenListeners.add(listener);
  return () => tokenListeners.delete(listener);
}

function getTokenSnapshot(): boolean | null {
  return hasTokenCache;
}

function setHasTokenShared(value: boolean | null) {
  hasTokenCache = value;
  tokenListeners.forEach((listener) => listener());
}

async function readTokenFromStorage(): Promise<boolean> {
  const token = await tokenStorage.get();
  const present = !!token;
  setHasTokenShared(present);
  return present;
}

async function fetchUser(): Promise<AuthenticatedUser | null> {
  try {
    const user = await authApi.getUserByToken();
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      profileImage: user.profileImage,
      location: user.location,
      phoneNumber: user.phoneNumber,
      mapsLink: user.mapsLink,
    };
  } catch {
    await clearAuthSession();
    setHasTokenShared(false);
    return null;
  }
}

async function logout(): Promise<void> {
  await clearAuthSession();
}

export function useAuth() {
  const queryClient = useQueryClient();
  const hasToken = useSyncExternalStore(subscribeToToken, getTokenSnapshot, () => null);

  useEffect(() => {
    readTokenFromStorage();
  }, []);

  const { data: user, isLoading: isUserLoading } = useQuery<AuthenticatedUser | null>({
    queryKey: ["/auth/get-user-by-token"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
    enabled: hasToken === true,
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onMutate: () => {
      setHasTokenShared(false);
      queryClient.setQueryData(["/auth/get-user-by-token"], null);
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });

  const isLoading = hasToken === null || (hasToken && isUserLoading);

  const refreshAuth = async (): Promise<AuthenticatedUser | null> => {
    const token = await tokenStorage.get();
    setHasTokenShared(!!token);
    if (!token) {
      queryClient.setQueryData(["/auth/get-user-by-token"], null);
      return null;
    }
    return queryClient.fetchQuery({
      queryKey: ["/auth/get-user-by-token"],
      queryFn: fetchUser,
    });
  };

  return {
    user: hasToken ? user ?? null : null,
    isLoading,
    isAuthenticated: hasToken === true && !!user,
    logout: logoutMutation.mutate,
    logoutAsync: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
    refreshAuth,
  };
}
