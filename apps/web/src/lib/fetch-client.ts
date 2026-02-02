import createFetchClient from "openapi-fetch";
import createClient from "openapi-react-query";

import {
  AUTH_WRITE_ROUTES,
  clearStoredTokens,
  getAccessToken,
  getRefreshToken,
  setStoredTokens,
} from "@/lib/auth";
import type { paths } from "@/types/openapi";

// ============================================================================
// Custom Errors
// ============================================================================

// Validation error field type
interface ValidationError {
  field: string;
  pointer: string;
  code: string;
  message: string;
}

// RFC 7807 error response (frontend fields only)
interface ProblemDetails {
  detail?: string;
  errors?: ValidationError[];
  request_id?: string;
  correlation_id?: string;
}

export class ApiError extends Error {
  public detail?: string;
  public errors?: ValidationError[];
  public requestId?: string;

  constructor(
    message: string,
    public status: number,
    public statusText: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";

    // Extract RFC 7807 fields
    const problem = data as ProblemDetails;
    this.detail = problem?.detail;
    this.errors = problem?.errors;
    this.requestId = problem?.request_id ?? problem?.correlation_id;
  }
}

// ============================================================================
// Fetch Client
// ============================================================================

// With Vite proxy, all /api requests are forwarded to backend (localhost:3000)
// No server-side rendering, pure client-side SPA
export const fetchClient = createFetchClient<paths>({
  baseUrl: "",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Middleware: 401 intercept and auto token refresh (client only)
fetchClient.use({
  async onRequest({ request }) {
    const accessToken = getAccessToken();

    if (!accessToken) {
      return request;
    }

    const headers = new Headers(request.headers);
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    return new Request(request, { headers });
  },
  async onResponse({ response, request }) {
    // On 401 and not auth write route, try refresh token
    if (
      response.status === 401 &&
      !AUTH_WRITE_ROUTES.some((route) => request.url.includes(route))
    ) {
      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        return response;
      }

      const refreshRes = await fetch("/api/auth/refresh-token", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (refreshRes.ok) {
        const tokens = (await refreshRes.json()) as {
          accessToken?: string;
          refreshToken?: string;
        };

        if (tokens.accessToken && tokens.refreshToken) {
          setStoredTokens({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          });
        }

        // Refresh success, retry original request
        return fetch(request.clone());
      }

      clearStoredTokens();
    }
    return response;
  },
});

// ============================================================================
// React Query Client
// ============================================================================

export const $api = createClient(fetchClient);
