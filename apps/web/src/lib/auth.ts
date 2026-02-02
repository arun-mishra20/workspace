import type { AuthTokens } from "@/types/auth";

/**
 * Auth routes that need to set cookies
 * These routes use route handlers, not proxy
 */
export const AUTH_WRITE_ROUTES = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/refresh-token",
  "/api/auth/register",
] as const;

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

/**
 * Store auth tokens in localStorage (client only)
 */
export function setStoredTokens(tokens: AuthTokens) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

/**
 * Read auth tokens from localStorage (client only)
 */
export function getStoredTokens(): AuthTokens | null {
  if (typeof window === "undefined") {
    return null;
  }

  const accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);

  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
}

export function getAccessToken(): string | null {
  return getStoredTokens()?.accessToken ?? null;
}

export function getRefreshToken(): string | null {
  return getStoredTokens()?.refreshToken ?? null;
}

/**
 * Clear auth tokens from localStorage (client only)
 */
export function clearStoredTokens() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}
