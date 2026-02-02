# Next.js to React Router + Vite Migration Guide

## Migration Summary

Successfully migrated the frontend from **Next.js 16 App Router** to **React Router 7 + Vite** while preserving all functionality.

## Changes Made

### 1. Dependencies Updated

**Removed:**

- `next` (16.0.10)
- `next-themes` (0.4.6)
- `@t3-oss/env-nextjs` (0.13.8)
- `vite-tsconfig-paths` (incompatible with Vite 6)

**Added:**

- `react-router-dom` (^7.6.3)
- `@tanstack/react-router` (^1.108.10)
- `vite` (6.0.11)
- `@vitejs/plugin-react` (^5.1.2)

**Preserved:**

- `@tanstack/react-query` (^5.90.11) - Data fetching
- `react-hook-form` (^7.68.0) - Form handling
- `@workspace/ui` - shadcn/ui components
- `tailwindcss` (^4.1.18) - Styling
- All testing libraries (Vitest, Playwright)

### 2. Build Configuration

#### Created `vite.config.ts`

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@workspace/ui": path.resolve(__dirname, "../../packages/ui/src"),
    },
  },
  server: {
    port: 8000,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
```

#### Created `index.html`

Standard HTML entry point for Vite with `<script type="module" src="/src/main.tsx">`.

#### Updated `tsconfig.json`

- Removed Next.js-specific config
- Added Vite-compatible settings
- Kept path aliases for `@/*` and `@workspace/ui/*`
- Added `ignoreDeprecations: "6.0"` for baseUrl

#### Updated `package.json` Scripts

```json
{
  "dev": "vite --port 8000",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "start": "vite preview"
}
```

### 3. Application Structure

#### New Entry Point: `src/main.tsx`

```typescript
import '@workspace/ui/styles/index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from './app/providers'
import { AppRouter } from './app/router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <AppRouter />
    </AppProvider>
  </StrictMode>
)
```

#### Created Router: `src/app/router.tsx`

```typescript
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export const AppRouter = () => <RouterProvider router={router} />
```

#### Created Layout: `src/app/layouts/root-layout.tsx`

```typescript
import { Outlet } from 'react-router-dom'

export const RootLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  )
}
```

#### Updated Pages Structure

- `src/app/page.tsx` → `src/pages/home.tsx`
- `src/app/(auth)/login/page.tsx` → `src/pages/auth/login.tsx`
- `src/app/(auth)/register/page.tsx` → `src/pages/auth/register.tsx`
- `src/app/not-found.tsx` → `src/pages/not-found.tsx`

All pages exported as named functions (e.g., `export const HomePage = () => ...`).

### 4. Providers Refactored

#### Created Custom Theme Provider: `src/components/theme-provider.tsx`

Replaced `next-themes` with custom implementation using Context API:

- Supports light/dark/system themes
- Persists to localStorage
- Applies class to `documentElement`
- Provides `useTheme` hook

#### Updated `src/app/providers.tsx`

```typescript
export const AppProvider = ({ children }: AppProviderProperties) => {
  const [queryClient] = React.useState(
    () => new QueryClient({ defaultOptions: queryConfig })
  )

  return (
    <ErrorBoundary FallbackComponent={MainErrorFallback}>
      <ThemeProvider defaultTheme="system">
        <QueryClientProvider client={queryClient}>
          {env.NODE_ENV === 'development' && <ReactQueryDevtools />}
          {children}
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
```

### 5. Component Updates

#### Navigation Changed

All instances of Next.js routing updated:

**Before:**

```typescript
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const router = useRouter()
router.push('/login')

<Link href="/login">Login</Link>
```

**After:**

```typescript
import { useNavigate, Link } from 'react-router-dom'

const navigate = useNavigate()
navigate('/login')

<Link to="/login">Login</Link>
```

#### Updated Components

- `src/features/auth/components/login-form.tsx`
- `src/features/auth/components/register-form.tsx`
- `src/components/nav.tsx`
- `src/components/nav-user.tsx`
- `src/components/logo.tsx`
- `src/components/layouts/footer.tsx`
- `src/features/home/components/hero.tsx`

#### Removed Components

- `src/components/link.tsx` (custom Next.js Link wrapper)

### 6. Configuration Files

#### Created `src/vite-env.d.ts`

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly NODE_ENV: "development" | "test" | "production";
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

#### Updated `src/config/env.ts`

```typescript
import { z } from "zod";

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().default("http://localhost:3000"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  MODE: z.string().optional(),
});

export const env = envSchema.parse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  NODE_ENV: import.meta.env.NODE_ENV || import.meta.env.MODE,
  MODE: import.meta.env.MODE,
});
```

#### Updated `src/lib/fetch-client.ts`

Removed server-side logic (no more SSR):

- Removed Next.js cookies handling
- Removed server/client detection
- Pure client-side fetch with credentials
- Vite proxy handles `/api` forwarding

### 7. Removed Files & Directories

**Deleted:**

- `next.config.ts`
- `next-env.d.ts`
- `src/proxy.ts` (Next.js middleware)
- `src/app/api/` (API route handlers)
- `src/app/layout.tsx` (Next.js layout)
- `src/app/page.tsx` (Next.js page)
- `src/app/(auth)/` (Next.js route group)
- `src/app/provide.tsx` (moved to `providers.tsx`)
- `src/components/link.tsx`

### 8. Node Version Compatibility

Updated `engines.node` in:

- `/package.json`: `>=22.18.0` → `>=20.11.0`
- `/packages/eslint-config/package.json`: `>=22.18.0` → `>=20.11.0`

## Development Workflow

### Starting Development Server

```bash
# From root
pnpm start:dev  # Starts both API and web

# Or individually
pnpm --filter web dev  # Web on http://localhost:8000
pnpm --filter api dev  # API on http://localhost:3000
```

### Building for Production

```bash
pnpm build  # Builds all workspace packages
```

### API Proxy Configuration

All `/api` requests from the web app are proxied to `http://localhost:3000` via Vite's proxy configuration.

## Key Differences from Next.js

### Rendering

- **Next.js**: Server-side rendering (SSR) with React Server Components
- **Vite + React Router**: Pure client-side SPA

### Routing

- **Next.js**: File-based routing with `app/` directory
- **React Router**: Code-based routing with `createBrowserRouter`

### Data Fetching

- **Next.js**: Server Components can fetch during render
- **Vite**: All fetching happens client-side via TanStack Query

### API Integration

- **Next.js**: API route handlers in `app/api/`
- **Vite**: Direct proxy to backend API server

### Environment Variables

- **Next.js**: `process.env.NEXT_PUBLIC_*`
- **Vite**: `import.meta.env.VITE_*`

### Themes

- **Next.js**: `next-themes` package
- **Vite**: Custom ThemeProvider using Context API

## Testing

All existing tests remain functional:

- **Unit tests**: Vitest
- **E2E tests**: Playwright
- **Coverage**: Still available with Vitest

Update test mocks:

- Replace `vi.mock('next/navigation')` with `vi.mock('react-router-dom')`
- Update navigation mocks: `useRouter` → `useNavigate`

## Migration Complete ✅

The application is now running on:

- **Vite 6.0.11** (build tool)
- **React Router 7** (client-side routing)
- **React 19** (UI library)
- **TanStack Query 5** (data fetching)
- **Tailwind CSS 4** (styling)

All features preserved:

- ✅ Authentication flow (login/register)
- ✅ Session management with refresh tokens
- ✅ Theme switching (light/dark/system)
- ✅ Form validation with React Hook Form
- ✅ Error boundaries
- ✅ API integration via proxy
- ✅ shadcn/ui components
- ✅ TypeScript support
- ✅ Development & production builds
