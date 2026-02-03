import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getAccessToken } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { $api } from "@/lib/fetch-client";

interface ProtectedRouteProps {
  children: ReactNode;
  isPublic?: boolean;
}

/**
 * ProtectedRoute component for route-level access control
 *
 * @param children - Component to render if authorized
 * @param isPublic - If true, allows unauthenticated access and redirects to home if already logged in
 *
 * @example
 * // Protected route (requires auth)
 * <ProtectedRoute>
 *   <DashboardPage />
 * </ProtectedRoute>
 *
 * // Public route (no auth required, redirects if logged in)
 * <ProtectedRoute isPublic>
 *   <LoginPage />
 * </ProtectedRoute>
 */
export function ProtectedRoute({
  children,
  isPublic = false,
}: ProtectedRouteProps) {
  const accessToken = getAccessToken();
  const sessionQuery = useQuery({
    ...$api.queryOptions("get", "/api/auth/session"),
    enabled: !!accessToken, // Only fetch session if user has a token
    retry: false,
  });

  const isAuthenticated = !!sessionQuery.data?.user;

  if (accessToken && sessionQuery.isLoading) {
    return null;
  }

  if (isPublic) {
    // Public routes (login, register, home) should redirect to dashboard if already logged in
    if (isAuthenticated) {
      return <Navigate to="/dashboard" replace />;
    }
    return <>{children}</>;
  }

  // Protected routes require authentication
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
