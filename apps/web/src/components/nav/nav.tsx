import { Header } from "@/components/layouts";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getAccessToken } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import type { SessionResponse } from "@/lib/api-types";

import { Button } from "@workspace/ui/components/ui/button";
import { Link } from "react-router-dom";
import { NavUser } from "./nav-user";
import { Logo } from "@/components/nav/logo";
import NavTabs from "./nav-tabs";
const Nav = () => {
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
  });

  const email = sessionQuery.data?.user?.email;
  const isSuccess = sessionQuery.isSuccess && !!accessToken;

  return (
    <Header className="absolute top-0 w-full h-12">
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center">
          <Logo />
        </div>
        <NavTabs />
        <div className="flex items-center justify-end gap-4">
          <ThemeToggle />
          {isSuccess ? (
            <NavUser username={email} />
          ) : (
            <Link to="/login">
              <Button variant="ghost">Login</Button>
            </Link>
          )}
        </div>
      </div>
    </Header>
  );
};

export { Nav };
