import { Header } from "@/components/layouts";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useAuthSession } from "@/app/auth-session-context";

import { Button } from "@workspace/ui/components/ui/button";
import { Link } from "react-router-dom";
import { NavUser } from "./nav-user";
import { Logo } from "@/components/nav/logo";
import NavTabs from "./nav-tabs";
const Nav = () => {
  const { hasToken, isAuthenticated, user } = useAuthSession();

  const email = user?.email;
  const isSuccess = isAuthenticated && hasToken;

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
