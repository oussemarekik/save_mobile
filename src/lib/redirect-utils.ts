import type { AuthIntentRole } from "./authIntent";

export type AuthUserLike = {
  role?: string;
} | null | undefined;

/**
 * Mirrors savetheplate-frontend/lib/authRedirect.ts with Expo Router paths.
 */
export function getPostAuthRedirect(
  user: AuthUserLike,
  intentRole?: AuthIntentRole | null
): string {
  const role = user?.role;

  if (!role || role === "NONE") {
    if (intentRole === "PROVIDER") return "/(auth)/ProviderSignup";
    return "/(auth)/signin";
  }
  if (role === "CLIENT") return "/(client)/Home";
  if (role === "PENDING_PROVIDER" || role === "PROVIDER") {
    return "/(provider)/dashboard";
  }
  return "/(auth)/signin";
}

/** @deprecated Use getPostAuthRedirect */
export function normalizeRedirectPath(redirectTo: string | undefined, userRole?: string): string {
  if (!redirectTo) {
    return getPostAuthRedirect({ role: userRole });
  }
  if (redirectTo === "/provider/home" || redirectTo.startsWith("/provider/home")) {
    return "/(provider)/dashboard";
  }
  if (redirectTo === "/client/home" || redirectTo === "/") {
    return "/(client)/Home";
  }
  if (redirectTo === "/business-signup") {
    return "/(auth)/ProviderSignup";
  }
  if (redirectTo === "/signIn") {
    return "/(auth)/signin";
  }
  return redirectTo;
}

/** @deprecated Use getPostAuthRedirect */
export function getRedirectPathForRole(role?: string): string {
  return getPostAuthRedirect({ role });
}
