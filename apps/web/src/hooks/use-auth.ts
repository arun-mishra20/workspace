import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { $api } from "@/lib/fetch-client";
import { getAccessToken } from "@/lib/auth";

/**
 * Hook to check authentication status
 * @returns boolean indicating if user is authenticated
 *
 * @example
 * const isAuthenticated = useIsAuthenticated();
 * if (isAuthenticated) {
 *   // show authenticated UI
 * }
 */
export function useIsAuthenticated(): boolean {
  const accessToken = getAccessToken();
  const sessionQuery = useQuery({
    ...$api.queryOptions("get", "/api/auth/session"),
    enabled: !!accessToken, // Only fetch session if user has a token
    retry: false,
  });

  return !!sessionQuery.data?.user;
}

/**
 * Hook to check if user can access a resource
 * @returns function to check access
 *
 * @example
 * const canAccess = useCanAccess();
 * if (canAccess()) {
 *   // render protected content
 * }
 */
export function useCanAccess() {
  const isAuthenticated = useIsAuthenticated();

  return useCallback(() => isAuthenticated, [isAuthenticated]);
}
