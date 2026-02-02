import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { RootLayout } from "./layouts/root-layout";
import { HomePage } from "@/pages/home";
import { LoginPage } from "@/pages/auth/login";
import { RegisterPage } from "@/pages/auth/register";
import { NotFoundPage } from "@/pages/not-found";
import { ProtectedRoute } from "@/components/protected-routes/protected-route";
import Dashboard from "@/pages/dashboard";
import ThemeSettingsPage from "@/pages/theme";

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      // Public Routes
      {
        index: true,
        element: (
          <ProtectedRoute isPublic>
            <HomePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "login",
        element: (
          <ProtectedRoute isPublic>
            <LoginPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "register",
        element: (
          <ProtectedRoute isPublic>
            <RegisterPage />
          </ProtectedRoute>
        ),
      },
      // Protected Routes
      {
        path: "dashboard",
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "themes",
        element: (
          <ProtectedRoute>
            <ThemeSettingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "analytics",
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "patterns",
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "metrics",
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      // Fallback Route
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);

export const AppRouter = () => <RouterProvider router={router} />;
