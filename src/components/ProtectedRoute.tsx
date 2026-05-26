import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireRole?: string;
}

export function ProtectedRoute({ children, requireAuth = true, requireRole }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && requireAuth && !user) {
      setLocation("/signin");
    }
    if (!isLoading && requireAuth && user && requireRole && user.role !== requireRole) {
      setLocation("/");
    }
  }, [user, isLoading, requireAuth, requireRole, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (requireAuth && !user) {
    return null;
  }

  if (requireAuth && requireRole && user?.role !== requireRole) {
    return null;
  }

  return <>{children}</>;
}

