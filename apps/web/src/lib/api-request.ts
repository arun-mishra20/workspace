import {
  AUTH_WRITE_ROUTES,
  clearStoredTokens,
  getAccessToken,
  getRefreshToken,
  setStoredTokens,
} from "@/lib/auth";

export async function apiRequest(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const request = new Request(input, init);
  const accessToken = getAccessToken();
  const headers = new Headers(request.headers);

  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(new Request(request, { headers }));

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

      return fetch(request.clone());
    }

    clearStoredTokens();
  }

  return response;
}
