import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/ui/field";
import { Input } from "@workspace/ui/components/ui/input";
import { Button } from "@workspace/ui/components/ui/button";

import { appPaths } from "@/config/app-paths";
import { apiRequest } from "@/lib/api-client";
import { setStoredTokens } from "@/lib/auth";
import { Spinner } from "@workspace/ui/components/ui/spinner";
import { registerSchema, type RegisterFormData } from "../schemas";
import { useMutation } from "@tanstack/react-query";
import type { RegisterResponse } from "@/lib/api-types";

const RegisterForm = () => {
  const navigate = useNavigate();
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "user@example.com",
      name: "john_doe",
      password: "Pass123456",
      confirmPassword: "Pass123456",
    },
  });

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: Omit<RegisterFormData, "confirmPassword">) =>
      apiRequest<RegisterResponse>({
        method: "POST",
        url: "/api/auth/register",
        data: payload,
        toastSuccess: true,
        successMessage: "Account created",
      }),
  });

  const onSubmit = async (data: RegisterFormData) => {
    const { confirmPassword: _confirmPassword, ...payload } = data;
    try {
      const result = await mutateAsync(
        payload,
      );

      if (result?.accessToken && result?.refreshToken) {
        setStoredTokens({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        });
      }

      navigate(appPaths.auth.login.getHref());
    } catch {
      return;
    }
  };

  return (
    <Card className="w-full sm:max-w-md">
      <CardHeader>
        <CardTitle>Register</CardTitle>
        <CardDescription>Create your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form id="register-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <Input
                    {...field}
                    placeholder="Enter your email"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel>Username</FieldLabel>
                  <Input
                    {...field}
                    placeholder="Enter your username"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel>Password</FieldLabel>
                  <Input
                    {...field}
                    placeholder="Enter your password"
                    autoComplete="off"
                    type="password"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              name="confirmPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel>Confirm Password</FieldLabel>
                  <Input
                    {...field}
                    placeholder="Confirm your password"
                    autoComplete="off"
                    type="password"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col">
        <Field orientation="responsive">
          <Button type="submit" form="register-form" disabled={isPending}>
            {isPending && <Spinner />}
            Create account
          </Button>
          <FieldDescription className="text-center">
            Already have an account?{" "}
            <Link to={appPaths.auth.login.getHref()}>Login</Link>
          </FieldDescription>
        </Field>
      </CardFooter>
    </Card>
  );
};

export { RegisterForm };
