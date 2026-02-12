import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAccessToken } from "@/lib/auth";
import { apiRequest } from "@/lib/api-client";
import type { SessionResponse } from "@/lib/api-types";

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
    queryKey: ["auth", "session"],
    queryFn: ({ signal }) =>
      apiRequest<SessionResponse>({
        method: "GET",
        url: "/api/auth/session",
        signal,
      }),
    enabled: !!accessToken, // Only fetch session if user has a token
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
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

  return useCallback(() => {
    return !!getAccessToken() && isAuthenticated;
  }, [isAuthenticated]);
}
