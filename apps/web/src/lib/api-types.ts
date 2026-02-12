export interface SessionResponse {
  user: {
    id: string;
    email: string;
    role: string | null;
  };
  session: {
    id: string;
    expiresAt: string;
    ipAddress: string | null;
    userAgent: string | null;
  };
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string | null;
  };
}

export type RegisterResponse = LoginResponse;

