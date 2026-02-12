# AGENTS.md

Guidance for AI coding agents (including GitHub Copilot/Copilot Coding Agent) working in this repository.

## Scope
- This file applies to the entire repository.
- If a subfolder has its own `AGENTS.md`, the subfolder file overrides this one for files in that subtree.

## Monorepo Facts
- Package manager: `pnpm@10.25.0`
- Required Node.js: `>=22.18.0`
- Workspaces:
  - `apps/*`
  - `packages/*`
- Task runner: Turborepo (`turbo.json`)

## Folder Map and Rules

### `apps/api` (NestJS + Fastify)
- Keep module boundaries clear: `presentation` -> `application` -> `infrastructure`.
- Keep controllers thin; business logic belongs in application services.
- Use ports/interfaces in `application/ports` for external dependencies.
- Add/maintain DTO validation and API docs annotations when changing request/response shapes.
- Prefer extending existing module patterns over introducing new architectural styles.

### `apps/web` (React 19 + Vite + React Router)
- This app is Vite-based (not Next.js).
- Prefer composition with shared UI from `@workspace/ui`.
- Use theme tokens (`--color-*`, `--chart-*`, etc.) instead of hardcoded UI colors when possible.
- Keep theme-specific styling isolated:
  - base styles in `packages/ui/src/styles/index.css`
  - optional theme styles in separate files (example: `neumorphism.css`)
  - load optional theme CSS only when needed.
- Keep route/page code in `src/pages`, feature logic in `src/features`.

### `packages/ui` (Shared design system/components)
- Keep components framework-agnostic and reusable; avoid app-specific coupling.
- Preserve accessibility semantics and keyboard/focus behavior.
- Prefer extending existing `data-slot` patterns for style targeting.
- Do not break published exports defined in `packages/ui/package.json`.

### `packages/database` (Drizzle)
- Treat schema updates and migrations as a pair.
- Generate migrations via scripts; do not manually rewrite old migrations unless explicitly requested.
- Keep schema exports in sync (`src/schemas/index.ts`, related entry points).

### `packages/eslint-config` and `packages/typescript-config`
- Central source of lint/type conventions.
- Prefer config changes here rather than per-app ad hoc overrides.

## Best Practices

### Change Discipline
- Make the smallest safe change that solves the task.
- Avoid broad refactors unless requested.
- Do not change dependency versions unless required for the task.
- Do not modify unrelated files.

### Style and Consistency
- Match existing file conventions (imports, naming, formatting, patterns).
- Reuse existing utilities/hooks/components before creating new ones.
- Keep public APIs stable unless a breaking change is explicitly requested.

### Theming and Design
- Prefer token-driven styling to keep themes consistent.
- For charts, use theme token colors (for example `--color-chart-1..5`) instead of fixed hex values.
- Keep variant/theme-specific CSS in dedicated files to avoid bloating global styles.

### Testing and Validation
- Run targeted checks for changed areas when possible:
  - Root: `pnpm lint`, `pnpm check-types`, `pnpm build`
  - API: `pnpm --filter api test`
  - Web: `pnpm --filter web test:unit`, `pnpm --filter web test:e2e`
- If environment limitations prevent running checks, state that explicitly in the PR summary.

## Generated/Derived Files
- Prefer generating instead of hand-editing generated artifacts.
- Examples:
  - Web OpenAPI types: `apps/web/src/types/openapi.d.ts` (`pnpm --filter web generate:api`)
  - Drizzle migrations and metadata in `packages/database/drizzle/*`
- Do not commit build output directories unless explicitly requested.

## PR Expectations for Agents
- Include:
  - what changed
  - why it changed
  - how it was validated
  - any known limitations or follow-ups
- Keep diffs review-friendly and logically grouped.
