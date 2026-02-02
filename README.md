# NestJS Full-Stack Boilerplate

> A production-ready, enterprise-grade full-stack boilerplate with NestJS backend and Next.js frontend in a monorepo architecture.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D22.18.0-brightgreen.svg)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-10.25.0-orange.svg)](https://pnpm.io)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
  - [Backend (NestJS)](#backend-nestjs)
  - [Frontend (Next.js)](#frontend-nextjs)
  - [Shared Packages](#shared-packages)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

This boilerplate provides a solid foundation for building modern, scalable full-stack applications. It combines the power of NestJS for building robust backend APIs with Next.js for creating performant, server-rendered frontend applications, all managed in a Turborepo monorepo.

### Key Highlights

- 🏗️ **Monorepo Architecture** - Managed with Turborepo and pnpm workspaces
- 🎨 **Domain-Driven Design** - Clean architecture with modular layered design
- 🔐 **Production-Ready Auth** - JWT-based authentication with session management
- 📦 **Shared Packages** - Reusable database schemas, UI components, and configurations
- 🧪 **Comprehensive Testing** - Unit, integration, and E2E testing setup
- 🚀 **Modern Tooling** - TypeScript, ESLint, Prettier, Vitest, Playwright
- 📚 **Auto-Generated Docs** - Swagger/OpenAPI documentation
- 🐳 **Docker Ready** - Docker Compose configuration for local development

---

## 🛠️ Tech Stack

### Backend
- **[NestJS](https://nestjs.com/)** - Progressive Node.js framework (v11.1.9)
- **[Drizzle ORM](https://orm.drizzle.team/)** - Lightweight TypeScript ORM (v0.44.7)
- **[PostgreSQL](https://www.postgresql.org/)** - Relational database
- **[Passport JWT](https://www.passportjs.org/)** - Authentication middleware
- **[Pino](https://getpino.io/)** - High-performance logging
- **[Zod](https://zod.dev/)** - TypeScript-first schema validation

### Frontend
- **[Next.js 16](https://nextjs.org/)** - React framework with App Router
- **[React 19](https://react.dev/)** - UI library
- **[TanStack Query](https://tanstack.com/query)** - Server state management (v5.90.11)
- **[React Hook Form](https://react-hook-form.com/)** - Form management
- **[Tailwind CSS v4](https://tailwindcss.com/)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com/)** - Re-usable component library
- **[Radix UI](https://www.radix-ui.com/)** - Unstyled, accessible components

### Monorepo & Tooling
- **[Turborepo](https://turbo.build/)** - High-performance build system
- **[pnpm](https://pnpm.io/)** - Fast, disk space efficient package manager
- **[TypeScript 5.9](https://www.typescriptlang.org/)** - Type safety
- **[Vitest](https://vitest.dev/)** - Fast unit testing framework
- **[Playwright](https://playwright.dev/)** - E2E testing
- **[ESLint](https://eslint.org/)** - Linting
- **[Prettier](https://prettier.io/)** - Code formatting

---

## 📁 Project Structure

```
workspace-repo/
├── apps/
│   ├── api/                          # NestJS Backend Application
│   │   ├── src/
│   │   │   ├── app/                  # Application Layer
│   │   │   │   ├── config/           # Configuration (env, swagger, CORS, etc.)
│   │   │   │   ├── filters/          # Global exception filters
│   │   │   │   ├── interceptors/     # Global interceptors (logging, transform, etc.)
│   │   │   │   ├── middleware/       # Global middleware (ETag, versioning)
│   │   │   │   ├── health/           # Health check endpoints
│   │   │   │   └── swagger/          # Swagger/OpenAPI setup
│   │   │   ├── modules/              # Business Domain Modules
│   │   │   │   ├── auth/             # Authentication Module (DDD example)
│   │   │   │   │   ├── application/  # Use cases & DTOs
│   │   │   │   │   ├── domain/       # Domain entities & value objects
│   │   │   │   │   ├── infrastructure/ # Repositories & external services
│   │   │   │   │   └── presentation/ # Controllers & guards
│   │   │   │   └── todo/             # Todo Module (anemic model example)
│   │   │   ├── shared-kernel/        # Shared Infrastructure
│   │   │   │   ├── application/      # Shared application ports
│   │   │   │   ├── domain/           # Shared domain primitives (AggregateRoot, ValueObject, etc.)
│   │   │   │   └── infrastructure/   # Shared infrastructure (DB, events, cache)
│   │   │   ├── app.module.ts         # Root application module
│   │   │   └── main.ts               # Application entry point
│   │   ├── .env.example              # Environment variables template
│   │   └── package.json
│   │
│   └── web/                          # Next.js Frontend Application
│       ├── src/
│       │   ├── app/                  # Next.js App Router
│       │   │   ├── (auth)/           # Auth route group (login, register)
│       │   │   ├── api/              # API routes (proxy to backend)
│       │   │   ├── layout.tsx        # Root layout
│       │   │   └── page.tsx          # Home page
│       │   ├── components/           # React components
│       │   ├── features/             # Feature-based modules
│       │   │   ├── auth/             # Authentication feature
│       │   │   └── home/             # Home feature
│       │   ├── lib/                  # Library code (API client, utils)
│       │   ├── config/               # Configuration files
│       │   ├── types/                # TypeScript types
│       │   └── testing/              # Test utilities
│       ├── next.config.ts            # Next.js configuration
│       ├── tailwind.config.ts        # Tailwind CSS configuration
│       └── package.json
│
├── packages/                         # Shared Packages
│   ├── database/                     # Database Package
│   │   ├── src/
│   │   │   ├── schemas/              # Drizzle schemas
│   │   │   │   ├── auth/             # Auth-related schemas
│   │   │   │   │   ├── users.schema.ts
│   │   │   │   │   ├── accounts.schema.ts
│   │   │   │   │   ├── sessions.schema.ts
│   │   │   │   │   ├── profiles.schema.ts
│   │   │   │   │   └── verifications.schema.ts
│   │   │   │   ├── todos.schema.ts
│   │   │   │   └── articles.schema.ts
│   │   │   ├── relations.ts          # Database relations
│   │   │   └── index.ts              # Drizzle instance
│   │   ├── scripts/                  # Database scripts
│   │   │   └── seed.ts               # Database seeding
│   │   └── drizzle.config.ts         # Drizzle Kit configuration
│   │
│   ├── ui/                           # Shared UI Components
│   │   ├── src/
│   │   │   ├── components/           # shadcn/ui components
│   │   │   ├── blocks/               # Composite UI blocks
│   │   │   ├── hooks/                # Shared React hooks
│   │   │   ├── lib/                  # UI utilities
│   │   │   └── styles/               # Global styles
│   │   ├── .storybook/               # Storybook configuration
│   │   └── components.json           # shadcn/ui configuration
│   │
│   ├── icons/                        # Shared Icon Package
│   ├── eslint-config/                # Shared ESLint Configuration
│   └── typescript-config/            # Shared TypeScript Configuration
│
├── docker/                           # Docker Configuration
│   └── docker-compose.yml            # PostgreSQL container
│
├── turbo.json                        # Turborepo configuration
├── pnpm-workspace.yaml               # pnpm workspace configuration
├── package.json                      # Root package.json
├── .nvmrc                            # Node version specification
└── README.md                         # This file
```

---

## ✨ Features

### Backend (NestJS)

#### Core Features
- ✅ **Modular Architecture** - Clean separation of concerns with module-based structure
- ✅ **Domain-Driven Design** - Auth module demonstrates DDD principles
- ✅ **Dependency Injection** - NestJS built-in DI container
- ✅ **Environment Validation** - Zod-based environment variable validation
- ✅ **Database Integration** - Drizzle ORM with PostgreSQL
- ✅ **Database Migrations** - Version-controlled schema migrations
- ✅ **API Documentation** - Auto-generated Swagger/OpenAPI docs
- ✅ **Request Validation** - class-validator & class-transformer
- ✅ **Error Handling** - Global exception filters with RFC 7807 Problem Details

#### Security & Performance
- 🔐 **JWT Authentication** - Passport-based JWT strategy
- 🔐 **Session Management** - Database-backed sessions
- 🔐 **Password Hashing** - bcrypt integration
- 🛡️ **Rate Limiting** - Throttler guard for API abuse prevention
- 🛡️ **CORS Configuration** - Configurable cross-origin resource sharing
- ⚡ **Request Caching** - Redis-based cache manager with Keyv
- ⚡ **Connection Pooling** - PostgreSQL connection pool configuration

#### Developer Experience
- 📝 **Structured Logging** - Pino high-performance logger
- 📝 **Request Tracing** - Correlation ID and trace context
- 📝 **Context Management** - nestjs-cls for async local storage
- 🧪 **Testing Setup** - Vitest for unit and integration tests
- 🧪 **Test Utilities** - @golevelup/ts-vitest for mocking
- 🎯 **Hot Reload** - Development with watch mode
- 🎯 **TypeScript** - Full type safety across the codebase

#### Infrastructure
- 🔄 **Event System** - @nestjs/event-emitter for domain events
- 🔄 **Health Checks** - @nestjs/terminus health endpoints
- 📊 **Response Formatting** - Consistent API response structure
- 📊 **ETag Support** - HTTP caching with ETag middleware
- 📊 **API Versioning** - API version middleware
- 📊 **Link Headers** - Pagination link headers
- 🐳 **Docker Support** - Docker Compose for local PostgreSQL

### Frontend (Next.js)

#### Core Features
- ✅ **App Router** - Next.js 16 with RSC (React Server Components)
- ✅ **Server-Side Rendering** - Automatic SSR for better SEO
- ✅ **API Integration** - Type-safe API client with openapi-fetch
- ✅ **Auto-Generated Types** - OpenAPI TypeScript code generation
- ✅ **Form Management** - React Hook Form with Zod validation
- ✅ **State Management** - TanStack Query for server state
- ✅ **Error Boundaries** - Graceful error handling with react-error-boundary
- ✅ **Toast Notifications** - Sonner for user feedback

#### UI/UX
- 🎨 **Component Library** - shadcn/ui + Radix UI primitives
- 🎨 **Styling** - Tailwind CSS v4 with custom design system
- 🎨 **Dark Mode** - next-themes integration
- 🎨 **Icons** - Lucide React icon library
- 🎨 **Responsive Design** - Mobile-first approach
- 🎨 **Accessibility** - WCAG compliant components

#### Developer Experience
- 🧪 **Unit Testing** - Vitest with React Testing Library
- 🧪 **E2E Testing** - Playwright for end-to-end tests
- 🧪 **Component Testing** - Storybook (in UI package)
- 🧪 **API Mocking** - MSW (Mock Service Worker) for testing
- 🎯 **TypeScript** - Strict type checking
- 🎯 **Hot Reload** - Fast refresh in development
- 🎯 **Code Quality** - ESLint + Prettier

### Shared Packages

#### `@workspace/database`
- 📦 Drizzle ORM schemas and migrations
- 📦 Database relations and indexes
- 📦 Seed scripts for development data
- 📦 Type-safe database operations

#### `@workspace/ui`
- 📦 Reusable React components (shadcn/ui)
- 📦 Composite UI blocks
- 📦 Custom hooks
- 📦 Shared styles and utilities
- 📦 Storybook for component documentation

#### `@workspace/icons`
- 📦 Centralized icon management
- 📦 Custom SVG icons

#### `@workspace/eslint-config`
- 📦 Shared ESLint rules
- 📦 Consistent code style across apps

#### `@workspace/typescript-config`
- 📦 Shared TypeScript configurations
- 📦 Base configs for apps and packages

---

## 🏛️ Architecture

### Backend Architecture

The backend follows a **Modular Layered Architecture** with inspiration from **Domain-Driven Design** (DDD) and **Clean Architecture** principles.

```
┌─────────────────────────────────────────────────────┐
│              Presentation Layer                     │
│  (Controllers, Guards, DTOs, Validation)            │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│              Application Layer                      │
│     (Use Cases, Application Services, Ports)        │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│                Domain Layer                         │
│  (Entities, Value Objects, Domain Events, Rules)    │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│            Infrastructure Layer                     │
│  (Repositories, External Services, DB, Cache)       │
└─────────────────────────────────────────────────────┘
```

#### Key Principles

1. **Dependency Inversion** - High-level modules don't depend on low-level modules; both depend on abstractions (ports)
2. **Single Responsibility** - Each module/class has one reason to change
3. **Domain Isolation** - Business logic is isolated in the domain layer
4. **Port-Adapter Pattern** - Infrastructure adapts to domain needs, not vice versa

#### Module Structure Example: Auth Module

```
modules/auth/
├── domain/                  # Domain Layer (Pure business logic)
│   ├── entities/            # User, Session entities
│   ├── value-objects/       # Email, Password VOs
│   └── events/              # UserRegistered, UserLoggedIn events
├── application/             # Application Layer (Use cases)
│   ├── use-cases/           # RegisterUser, LoginUser
│   ├── dtos/                # Request/Response DTOs
│   └── ports/               # Interfaces for repositories
├── infrastructure/          # Infrastructure Layer (External concerns)
│   ├── repositories/        # Database implementations
│   ├── adapters/            # External service adapters
│   └── services/            # Token service, hash service
└── presentation/            # Presentation Layer (HTTP)
    ├── controllers/         # REST endpoints
    └── guards/              # Auth guards
```

### Frontend Architecture

The frontend follows a **Feature-Based Architecture** with clear separation of concerns:

```
src/
├── app/                     # Next.js App Router (routing)
├── features/                # Feature modules (auth, todos, etc.)
│   └── [feature]/
│       ├── components/      # Feature-specific components
│       ├── hooks/           # Feature-specific hooks
│       └── api/             # API integration
├── components/              # Shared/global components
├── lib/                     # Shared utilities and configurations
└── types/                   # TypeScript types
```

### Data Flow

```
┌──────────┐     HTTP      ┌──────────┐    OpenAPI    ┌──────────┐
│  Next.js │ ◄────────────► │  NestJS  │ ◄────────────►│   Auto   │
│ Frontend │    (Proxy)     │   API    │   (Swagger)   │   Docs   │
└──────────┘                └──────────┘               └──────────┘
      │                           │
      │                           │
      ▼                           ▼
┌──────────┐                ┌──────────┐
│ TanStack │                │ Drizzle  │
│  Query   │                │   ORM    │
└──────────┘                └──────────┘
                                  │
                                  ▼
                            ┌──────────┐
                            │PostgreSQL│
                            └──────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 22.18.0 (LTS/jod)
- **pnpm** 10.25.0
- **Docker & Docker Compose** (for PostgreSQL)
- **nvm** (recommended for Node version management)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd workspace-repo
   ```

2. **Install Node.js (using nvm)**
   ```bash
   nvm install
   nvm use
   ```

3. **Install dependencies**
   ```bash
   pnpm install
   ```

4. **Set up environment variables**
   
   **Backend (.env)**
   ```bash
   cd apps/api
   cp .env.example .env
   # Edit .env with your configuration
   ```

   **Frontend (.env.local)**
   ```bash
   cd apps/web
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

5. **Start PostgreSQL**
   ```bash
   cd docker
   docker-compose up -d
   ```

6. **Run database migrations**
   ```bash
   cd packages/database
   pnpm db:migrate
   ```

7. **Seed the database (optional)**
   ```bash
   pnpm db:seed
   ```

### Running the Applications

#### Development Mode (All apps)
```bash
# From root directory
pnpm start:dev
```

This will start:
- **Backend API** at `http://localhost:3000`
- **Frontend** at `http://localhost:8000`

#### Individual Apps

**Backend only**
```bash
cd apps/api
pnpm dev
```

**Frontend only**
```bash
cd apps/web
pnpm dev
```

### Accessing the Application

- **Frontend**: http://localhost:8000
- **Backend API**: http://localhost:3000/api
- **API Documentation**: http://localhost:3000/docs
- **Swagger UI**: http://localhost:3000/swagger
- **OpenAPI YAML**: http://localhost:3000/openapi.yaml
- **Health Check**: http://localhost:3000/health

---

## 💻 Development

### Available Scripts

#### Root Level
```bash
pnpm start:dev      # Start all apps in development mode
pnpm build          # Build all apps and packages
pnpm lint           # Lint all workspaces
pnpm lint:fix       # Fix linting issues
pnpm check-types    # Type check all workspaces
```

#### Backend (apps/api)
```bash
pnpm dev            # Start in development mode
pnpm build          # Build for production
pnpm start:prod     # Start production build
pnpm lint           # Lint code
pnpm test           # Run unit tests
pnpm test:watch     # Run tests in watch mode
pnpm test:cov       # Generate coverage report
pnpm test:e2e       # Run E2E tests
```

#### Frontend (apps/web)
```bash
pnpm dev            # Start development server
pnpm build          # Build for production
pnpm start          # Start production server
pnpm lint           # Lint code
pnpm test           # Run tests
pnpm test:watch     # Run tests in watch mode
pnpm test:e2e       # Run Playwright E2E tests
pnpm generate:api   # Generate API types from OpenAPI
```

#### Database (packages/database)
```bash
pnpm db:generate    # Generate Drizzle migrations
pnpm db:migrate     # Run migrations
pnpm db:push        # Push schema changes (dev)
pnpm db:studio      # Open Drizzle Studio
pnpm db:seed        # Seed database
```

### Code Generation

#### Generate API Types for Frontend
After updating backend API endpoints:
```bash
# Make sure backend is running
cd apps/web
pnpm generate:api
```

This generates TypeScript types from the OpenAPI specification.

### Database Workflow

1. **Modify schemas** in `packages/database/src/schemas/`
2. **Generate migration**
   ```bash
   cd packages/database
   pnpm db:generate
   ```
3. **Apply migration**
   ```bash
   pnpm db:migrate
   ```
4. **Verify in Drizzle Studio**
   ```bash
   pnpm db:studio
   ```

### Adding a New Module (Backend)

1. Create module structure:
   ```bash
   mkdir -p src/modules/my-module/{domain,application,infrastructure,presentation}
   ```

2. Follow DDD patterns from auth module

3. Register module in `app.module.ts`

### Adding a New Feature (Frontend)

1. Create feature structure:
   ```bash
   mkdir -p src/features/my-feature/{components,hooks,api}
   ```

2. Create API hooks using openapi-react-query

3. Build UI components

---

## 🧪 Testing

### Backend Testing

```bash
# Unit tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:cov

# E2E tests
pnpm test:e2e

# Test UI
pnpm test:ui
```

Test files should be co-located with source files:
- `*.spec.ts` for unit tests
- `*.e2e-spec.ts` for E2E tests

### Frontend Testing

```bash
# Unit tests (Vitest)
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage

# E2E tests (Playwright)
pnpm test:e2e

# Playwright UI mode
pnpm test:e2e:ui

# Debug mode
pnpm test:e2e:debug
```

---

## 🚢 Deployment

### Backend Deployment

1. **Build the application**
   ```bash
   cd apps/api
   pnpm build
   ```

2. **Set production environment variables**

3. **Run migrations**
   ```bash
   cd packages/database
   pnpm db:migrate
   ```

4. **Start the application**
   ```bash
   cd apps/api
   pnpm start:prod
   ```

### Frontend Deployment

1. **Build the application**
   ```bash
   cd apps/web
   pnpm build
   ```

2. **Start the production server**
   ```bash
   pnpm start
   ```

### Recommended Platforms

- **Backend**: Railway, Render, Fly.io, AWS ECS
- **Frontend**: Vercel, Netlify, Cloudflare Pages
- **Database**: Supabase, Neon, Railway PostgreSQL

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow existing code patterns
- Run `pnpm lint:fix` before committing
- Ensure tests pass with `pnpm test`
- Add tests for new features

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- [NestJS](https://nestjs.com/) for the amazing backend framework
- [Next.js](https://nextjs.org/) for the powerful React framework
- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- [Drizzle ORM](https://orm.drizzle.team/) for the excellent TypeScript ORM
- [Turborepo](https://turbo.build/) for monorepo management

---

## 📞 Support

For questions, issues, or feature requests, please open an issue on GitHub.

---

**Built with ❤️ using NestJS, Next.js, and TypeScript**