import { useCallback } from 'react'
import { useAuthSession } from '@/app/auth-session-context'

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
  const { isAuthenticated } = useAuthSession()
  return isAuthenticated
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
  const { hasToken, isAuthenticated } = useAuthSession()

  return useCallback(() => {
    return hasToken && isAuthenticated
  }, [hasToken, isAuthenticated])
}
