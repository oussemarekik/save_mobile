/**
 * Normalize redirect paths based on user role
 * Handles cases where backend returns old paths like /provider/home
 */
export function normalizeRedirectPath(redirectTo: string | undefined, userRole?: string): string {
  // If no redirect path provided, determine based on role
  if (!redirectTo) {
    if (userRole === "PROVIDER") {
      return "/(provider)/dashboard";
    }
    return "/";
  }

  // Normalize provider paths
  if (redirectTo === "/provider/home" || redirectTo.startsWith("/provider/home")) {
    return "/(provider)/dashboard";
  }

  // Normalize client paths
  if (redirectTo === "/client/home") {
    return "/";
  }

  return redirectTo;
}

/**
 * Get redirect path based on user role
 */
export function getRedirectPathForRole(role?: string): string {
  if (role === "PROVIDER") {
    return "/(provider)/dashboard";
  }
  return "/";
}

