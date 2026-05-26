import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi, tokenStorage } from "@/lib/api-client";

export type AuthenticatedUser = {
  id: number;
  email: string;
  username: string;
  role: string;
  profileImage?: string;
  location?: string;
  mapsLink?: string;
};

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
      mapsLink: user.mapsLink,
    };
  } catch (error) {
    // If unauthorized, clear tokens and return null
    tokenStorage.remove();
    return null;
  }
}

async function logout(): Promise<void> {
  tokenStorage.remove();
  // Tokens are cleared, user will be redirected on next auth check
}

export function useAuth() {
  const queryClient = useQueryClient();
  const token = tokenStorage.get();
  
  const { data: user, isLoading } = useQuery<AuthenticatedUser | null>({
    queryKey: ["/auth/get-user-by-token"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!token, // Only fetch if we have a token
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/auth/get-user-by-token"], null);
      queryClient.clear(); // Clear all queries on logout
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
