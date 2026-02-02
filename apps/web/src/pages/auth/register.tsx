import { BlankLayout } from "@/components/layouts";
import { Nav } from "@/components/nav/nav";
import { RegisterForm } from "@/features/auth/components/register-form";

export const RegisterPage = () => {
  return (
    <BlankLayout bordered>
      <Nav />
      <div className="flex flex-1 justify-center items-center h-full min-h-screen">
        <RegisterForm />
      </div>
    </BlankLayout>
  );
};
