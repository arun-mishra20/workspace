import axios from "axios";
import { toast } from "sonner";

import {
  AUTH_WRITE_ROUTES,
  clearStoredTokens,
  getAccessToken,
  getRefreshToken,
  setStoredTokens,
} from "@/lib/auth";

import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

// ============================================================================
// Errors
// ============================================================================

interface ValidationError {
  field: string;
  pointer: string;
  code: string;
  message: string;
}

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

    const problem = data as ProblemDetails | undefined;
    this.detail = problem?.detail;
    this.errors = problem?.errors;
    this.requestId = problem?.request_id ?? problem?.correlation_id;
  }
}

function toApiError(error: unknown): unknown {
  if (!axios.isAxiosError(error)) {
    return error;
  }

  const status = error.response?.status ?? 0;
  const statusText = error.response?.statusText ?? "Unknown Error";
  const data = error.response?.data;

  const message =
    (typeof data === "object" &&
    data &&
    "detail" in data &&
    typeof (data as any).detail === "string"
      ? (data as any).detail
      : error.message) || statusText;

  return new ApiError(message, status, statusText, data);
}

function shouldToastError(error: unknown): boolean {
  // Don't toast for cancelled requests
  if (axios.isCancel(error)) {
    return false;
  }

  // Check for various cancellation scenarios
  if (axios.isAxiosError(error)) {
    // ERR_CANCELED is the new axios cancellation code
    if (error.code === "ERR_CANCELED") {
      return false;
    }
    // ECONNABORTED can indicate a cancelled request
    if (error.code === "ECONNABORTED") {
      return false;
    }
    // Check error message for cancellation strings
    const message = error.message?.toLowerCase() ?? "";
    if (message.includes("cancel") || message.includes("abort")) {
      return false;
    }
  }

  // Check for AbortError from fetch API
  if (error instanceof Error) {
    if (error.name === "AbortError" || error.name === "CanceledError") {
      return false;
    }
    // Check message as last resort
    const message = error.message?.toLowerCase() ?? "";
    if (message === "canceled" || message === "cancelled") {
      return false;
    }
  }

  if (error instanceof ApiError && error.status === 0) {
    // Network / CORS / unknown status. Still toast.
    return true;
  }

  return true;
}

// ============================================================================
// Axios Client
// ============================================================================

type RetriableAxiosConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

export type ApiRequestConfig = AxiosRequestConfig & {
  toastError?: boolean;
  toastSuccess?: boolean;
  successMessage?: string;
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: "",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Separate client for token refresh to avoid interceptor recursion.
const refreshClient: AxiosInstance = axios.create({
  baseURL: "",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = getAccessToken();
  if (!accessToken) {
    return config;
  }

  config.headers = config.headers ?? {};
  // Axios may represent headers as a plain object or AxiosHeaders.
  const hasAuthHeader =
    typeof (config.headers as any).get === "function"
      ? Boolean((config.headers as any).get("Authorization"))
      : Boolean((config.headers as any).Authorization);

  if (!hasAuthHeader) {
    if (typeof (config.headers as any).set === "function") {
      (config.headers as any).set("Authorization", `Bearer ${accessToken}`);
    } else {
      (config.headers as any).Authorization = `Bearer ${accessToken}`;
    }
  }

  return config;
});

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableAxiosConfig | undefined;

    if (!config || error.response?.status !== 401) {
      return Promise.reject(toApiError(error));
    }

    const url = config.url ?? "";
    if (AUTH_WRITE_ROUTES.some((route) => url.includes(route))) {
      return Promise.reject(toApiError(error));
    }

    if (config._retry) {
      return Promise.reject(toApiError(error));
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearStoredTokens();
      return Promise.reject(toApiError(error));
    }

    try {
      const refreshRes = await refreshClient.post("/api/auth/refresh-token", {
        refreshToken,
      });

      const tokens = refreshRes.data as {
        accessToken?: string;
        refreshToken?: string;
      };

      if (!tokens.accessToken || !tokens.refreshToken) {
        clearStoredTokens();
        return Promise.reject(toApiError(error));
      }

      setStoredTokens({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });

      config._retry = true;
      config.headers = config.headers ?? {};
      if (typeof (config.headers as any).set === "function") {
        (config.headers as any).set(
          "Authorization",
          `Bearer ${tokens.accessToken}`,
        );
      } else {
        (config.headers as any).Authorization = `Bearer ${tokens.accessToken}`;
      }

      return apiClient.request(config);
    } catch (refreshError) {
      clearStoredTokens();
      return Promise.reject(toApiError(refreshError));
    }
  },
);

// ============================================================================
// Request Helper
// ============================================================================

export async function apiRequest<T>(config: ApiRequestConfig): Promise<T> {
  try {
    const response = await apiClient.request<T>(config);

    const method = (config.method ?? "GET").toString().toUpperCase();
    const shouldToastSuccess =
      (config as ApiRequestConfig).toastSuccess ??
      (method === "POST" &&
        Boolean((config as ApiRequestConfig).successMessage));

    if (shouldToastSuccess) {
      toast.success((config as ApiRequestConfig).successMessage ?? "Success");
    }

    return response.data;
  } catch (error) {
    const apiError = toApiError(error);
    const toastError = (config as ApiRequestConfig).toastError ?? true;

    if (toastError && shouldToastError(error)) {
      const message =
        apiError instanceof ApiError
          ? (apiError.detail ?? apiError.message)
          : error instanceof Error
            ? error.message
            : "Request failed";
      toast.error(message);
    }

    throw apiError;
  }
}
