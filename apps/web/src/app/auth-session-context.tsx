import { apiRequest } from "@/lib/api-client";
import {
    AUTH_TOKENS_CHANGED_EVENT,
    getAccessToken,
} from "@/lib/auth";
import type { SessionResponse } from "@/lib/api-types";
import { useQuery } from "@tanstack/react-query";
import React from "react";

const AUTH_SESSION_QUERY_KEY = ["auth", "session"] as const;

interface AuthSessionContextValue {
    accessToken: string | null;
    hasToken: boolean;
    isAuthenticated: boolean;
    isLoading: boolean;
    user: SessionResponse["user"] | null;
    session: SessionResponse["session"] | null;
}

const AuthSessionContext = React.createContext<AuthSessionContextValue | undefined>(
    undefined,
);

interface AuthSessionProviderProps {
    children: React.ReactNode;
}

export function AuthSessionProvider({ children }: AuthSessionProviderProps) {
    const [accessToken, setAccessToken] = React.useState<string | null>(() =>
        getAccessToken(),
    );

    React.useEffect(() => {
        const syncTokenState = () => {
            setAccessToken(getAccessToken());
        };

        window.addEventListener(AUTH_TOKENS_CHANGED_EVENT, syncTokenState);
        window.addEventListener("storage", syncTokenState);

        return () => {
            window.removeEventListener(AUTH_TOKENS_CHANGED_EVENT, syncTokenState);
            window.removeEventListener("storage", syncTokenState);
        };
    }, []);

    const sessionQuery = useQuery({
        queryKey: [...AUTH_SESSION_QUERY_KEY, accessToken],
        queryFn: ({ signal }) =>
            apiRequest<SessionResponse>({
                method: "GET",
                url: "/api/auth/session",
                signal,
                toastError: false,
            }),
        enabled: !!accessToken,
        retry: false,
    });

    const value = React.useMemo<AuthSessionContextValue>(
        () => ({
            accessToken,
            hasToken: !!accessToken,
            isAuthenticated: !!accessToken && !!sessionQuery.data?.user,
            isLoading: !!accessToken && sessionQuery.isLoading,
            user: sessionQuery.data?.user ?? null,
            session: sessionQuery.data?.session ?? null,
        }),
        [accessToken, sessionQuery.data, sessionQuery.isLoading],
    );

    return (
        <AuthSessionContext.Provider value={value}>
            {children}
        </AuthSessionContext.Provider>
    );
}

export function useAuthSession() {
    const context = React.useContext(AuthSessionContext);
    if (!context) {
        throw new Error("useAuthSession must be used within AuthSessionProvider");
    }

    return context;
}
