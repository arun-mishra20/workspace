# Copilot Instructions

## Codebase Overview

This is a **monorepo full-stack boilerplate** using NestJS (backend) + Next.js (frontend) with Turborepo, pnpm, and PostgreSQL. The architecture emphasizes **Domain-Driven Design (DDD)** patterns and modular layering.

**Key Technologies:**

- Backend: NestJS 11, Drizzle ORM, Passport JWT, Pino logger
- Frontend: Next.js 16, React 19, TanStack Query, React Hook Form
- Shared: Turborepo, pnpm workspaces, TypeScript 5.9, Vitest, Playwright
- Database: PostgreSQL with Drizzle migrations

---

## Architecture Patterns

### Monorepo Structure

```
apps/api/          # NestJS backend (port 3000)
apps/web/          # Next.js frontend (port 8000)
packages/database/ # Shared Drizzle schemas & migrations
packages/ui/       # Shared shadcn/ui + Tailwind components
packages/*/        # Other shared packages (eslint-config, typescript-config, icons)
```

**Key:** All workspace dependencies use `workspace:*` version syntax. Changes to shared packages auto-resolve in dependent apps.

### Backend Architecture (DDD)

NestJS modules follow **3+2+1 layered architecture**:

```
modules/auth/
  ├── application/          # Use cases, ports (interfaces), DTOs
  │   ├── services/         # AuthService handles use cases
  │   └── ports/            # Repository, hasher interfaces
  ├── domain/               # Domain entities, value objects, rules
  ├── infrastructure/       # Repository implementations, 3rd-party adapters
  │   ├── repositories/     # Drizzle ORM implementations
  │   └── strategies/       # Passport strategies (JWT, etc.)
  └── presentation/         # Controllers, guards, decorators

modules/todo/              # Simpler module (anemic model) - apply DDD as needed
```

**Important:** Auth module uses **3+2+1 design** (3 auth methods via `auth_identities`, 2 tokens via `auth_sessions`, 1 user):

- Multiple `auth_identities` (email, OAuth, phone) per user
- Session/refresh tokens in `auth_sessions` table
- Single `users` record as aggregate root

**Example Flow:** See [auth module](apps/api/src/modules/auth/) for DDD patterns and [todo module](apps/api/src/modules/todo/) for simpler approaches.

### Global Middleware & Interceptors

The [main.ts](apps/api/src/main.ts) bootstrap applies:

- **Interceptors:** CorrelationId, RequestContext, TraceContext, TransformResponse, Timeout
- **Filters:** AllExceptions, ProblemDetails, ThrottlerException
- **Middleware:** ETag, ApiVersion
- **Validation:** Zod + class-validator (see [validation.config](apps/api/src/app/config/validation.config.ts))

→ Add new filters/interceptors to [app/filters](apps/api/src/app/filters/) and [app/interceptors](apps/api/src/app/interceptors/), then register in [app.module](apps/api/src/app.module.ts).

### Frontend Architecture

Next.js 16 with App Router:

- `src/app/` → Routes + layouts
- `src/components/` → Reusable UI components (shadcn/ui + Tailwind)
- `src/features/` → Feature-specific logic (hooks, utils)
- `src/lib/` → Shared utilities, helpers
- **State:** TanStack Query for server state, React Hook Form for forms
- **API:** OpenAPI-generated types via `pnpm generate:api` (requires running API)

→ Generate API types: `cd apps/web && pnpm generate:api` (API must run on `http://localhost:3000`)

---

## Development Workflows

### Starting Development

```bash
# Root workspace
pnpm start:dev              # Starts both api (port 3000) and web (port 5173)

# Individual apps
cd apps/api && pnpm dev     # API with hot-reload
cd apps/web && pnpm dev     # Web with hot-reload
```

### Database Setup & Migrations

```bash
# Docker database (PostgreSQL on port 5432)
docker-compose -f docker/docker-compose.yml up -d

# Drizzle migrations (from packages/database/)
cd packages/database
pnpm db:push                # Apply pending migrations
pnpm db:studio              # Visual DB explorer (Drizzle Studio)
pnpm db:generate            # Generate new migration from schema changes

# Seed database (if scripts/seed.ts exists)
pnpm db:seed
```

**Key:** Schema changes in [packages/database/src/schemas/](packages/database/src/schemas/) require migration generation.

### Testing

```bash
# API tests
cd apps/api
pnpm test                   # Run unit + integration tests (Vitest)
pnpm test:watch             # Watch mode
pnpm test:e2e               # E2E tests (Vitest config)
pnpm test:cov               # Coverage report

# Web tests
cd apps/web
pnpm test:unit              # Vitest unit tests
pnpm test:e2e               # Playwright E2E tests
pnpm test:e2e:ui            # Interactive UI mode
```

**Config:**

- Vitest: [vitest.config.mts](apps/api/vitest.config.mts) (swc transpiler, globals enabled)
- Playwright: [playwright.config.mts](apps/web/playwright.config.mts)
- Setup: [test setup file](apps/api/src/__tests__/setup.ts)

### Linting & Type Checking

```bash
# Root workspace (runs on all packages via Turborepo)
pnpm lint                   # ESLint check
pnpm lint:fix               # ESLint fix
pnpm check-types            # TypeScript check
```

**ESLint config:** [packages/eslint-config/](packages/eslint-config/src/)

### Building & Deployment

```bash
# Full build with Turborepo caching
pnpm build                  # Builds api, web, and shared packages in dependency order

# Individual app builds
cd apps/api && pnpm build   # NestJS build → dist/
cd apps/web && pnpm build   # Next.js build → .next/
```

---

## Key Conventions & Patterns

### Naming & File Organization

- **Controllers:** `*.controller.ts` (e.g., `auth.controller.ts`)
- **Services:** `*.service.ts` (use cases)
- **Repositories:** `*.repository.ts` (data access)
- **Modules:** `*.module.ts` (NestJS modules)
- **Guards/Middleware:** `*.guard.ts`, `*.middleware.ts`
- **Tests:** `*.spec.ts` (unit), `*.e2e-spec.ts` (E2E)

### TypeScript Paths

Both apps use path aliases via `tsconfig.json`:

```typescript
import { ... } from '@/app/config'    // absolute paths
import { ... } from '@/modules/auth'
```

→ Defined in [tsconfig.base.json](packages/typescript-config/tsconfig.base.json)

### Environment Variables

- **API:** [apps/api/src/app/config/env.schema.ts](apps/api/src/app/config/env.schema.ts) (Zod schema + validation)
- **Web:** [apps/web/src/config/env.ts](apps/web/src/config/env.ts) (t3-oss/env-nextjs)

Load via `ConfigModule` (API) or `z.object()` (Web).

### Error Handling

- **API:** Global filters handle exceptions:
  - `AllExceptionsFilter` → catches unexpected errors
  - `ProblemDetailsFilter` → RFC 7807 problem details format
  - `ThrottlerExceptionFilter` → rate limiting errors
- **Web:** `react-error-boundary` for error boundaries

### Authentication & Authorization

- **JWT Strategy:** [apps/api/src/modules/auth/infrastructure/strategies/jwt.strategy.ts](apps/api/src/modules/auth/infrastructure/strategies/jwt.strategy.ts)
- **Guards:** Access tokens in Bearer header, refresh tokens in httpOnly cookies
- **Roles:** User roles stored in `user_roles` table (see [auth schemas](packages/database/src/schemas/auth))

### API Documentation

- **Swagger:** Auto-generated at `/api/docs` (configured in [swagger.config](apps/api/src/app/config/swagger.config.ts))
- **OpenAPI Export:** Available at `/openapi.yaml` → generates Web types via `pnpm generate:api`

### Logging

- **Backend:** Pino via `nestjs-pino` → structured JSON logs
- **Frontend:** Sonner toast notifications for user feedback

---

## Common Tasks

### Adding a New NestJS Module

1. Create directory: `apps/api/src/modules/{feature}/` with subdirectories: `application/`, `domain/`, `infrastructure/`, `presentation/`
2. Define ports (interfaces) in `application/ports/`
3. Implement domain logic in `domain/`
4. Implement repositories in `infrastructure/`
5. Create controller in `presentation/`
6. Export module: `apps/api/src/modules/{feature}/{feature}.module.ts`
7. Import in [app.module.ts](apps/api/src/app.module.ts)

### Adding a Database Schema

1. Create schema file: `packages/database/src/schemas/{entity}.ts` (Drizzle syntax)
2. Export from [packages/database/src/schemas/index.ts](packages/database/src/schemas/index.ts)
3. Add relations if needed in [packages/database/src/relations.ts](packages/database/src/relations.ts)
4. Run: `cd packages/database && pnpm db:generate "add_feature_table"`
5. Apply migration: `pnpm db:push`

### Adding a Frontend Page/Route

1. Create route file: `apps/web/src/app/{route}/page.tsx`
2. Use client components with `'use client'` for interactivity
3. Use TanStack Query hooks for data fetching
4. Style with Tailwind CSS
5. Add E2E test in `apps/web/e2e/{route}.spec.ts` (Playwright)

### Deploying

- API: NestJS app runs as Node.js process (usually Docker)
- Web: Next.js app requires Node.js runtime or edge deployment (Vercel)
- Database: Drizzle migrations auto-run on startup or manual execution

---

## References

- [NestJS Docs](https://docs.nestjs.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Next.js 16 Docs](https://nextjs.org/docs)
- [Turborepo](https://turbo.build/repo/docs)
- [Repository Structure README](README.md)
