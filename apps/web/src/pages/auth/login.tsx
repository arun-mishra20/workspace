import { BlankLayout } from "@/components/layouts/blank-layout";
import { Nav } from "@/components/nav/nav";
import { LoginForm } from "@/features/auth/components/login-form";

export const LoginPage = () => {
  return (
    <BlankLayout bordered>
      <Nav />
      <div className="flex flex-1 justify-center items-center h-full min-h-screen">
        <LoginForm />
      </div>
    </BlankLayout>
  );
};
