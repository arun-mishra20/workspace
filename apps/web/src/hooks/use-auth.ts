import { useCallback } from "react";
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
  return !!accessToken;
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
  return useCallback(() => {
    return !!getAccessToken();
  }, []);
}
