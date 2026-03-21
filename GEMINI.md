# Yonyoung Project

This is a full-stack application for "Yonyoung", consisting of a backend API server and a frontend web application.

## Project Structure

- **yonyoung-api**: Backend API server powered by Cloudflare Workers and Hono.
- **yonyoung-web**: Frontend web application built with Next.js.

---

## yonyoung-api

### Overview
A high-performance API server using Cloudflare's ecosystem.

- **Runtime**: Cloudflare Workers
- **API Framework**: Hono with `@hono/zod-openapi` for type-safe API and documentation.
- **Database**: Cloudflare D1 with Drizzle ORM.
- **Object Storage**: Cloudflare R2.
- **Authentication**: Better Auth with Drizzle adapter and Google social provider.
- **Validation**: Zod.

### Key Commands
- `pnpm dev`: Start local development server (automatically applies migrations).
- `pnpm deploy`: Deploy to Cloudflare Workers.
- `pnpm db:generate`: Generate migrations using Drizzle Kit.
- `pnpm db:migrate:local`: Apply migrations to local D1 database.
- `pnpm db:migrate:remote`: Apply migrations to remote D1 database.
- `pnpm test`: Run unit and worker runtime integration tests.
- `pnpm lint`: Run ESLint.
- `pnpm typecheck`: Run TypeScript type checking.

### Architecture
- `src/app`: Application factory, middleware, and OpenAPI configuration.
- `src/infra`: Database and R2 storage clients.
- `src/modules`: Domain-specific routes and logic.
- `src/lib`: Core services, repositories, and auth configuration.
- `src/shared`: Shared utilities, error handling, and logging.

---

## yonyoung-web

### Overview
A modern web application built with Next.js and Tailwind CSS.

- **Framework**: Next.js (App Router).
- **Styling**: Tailwind CSS v4 (using CSS variables for design tokens).
- **Editor**: TipTap with various extensions (link, table, underline, etc.).
- **Animations**: Framer Motion.
- **Auth**: Integration with Better Auth from the API.
- **Observability**: Vercel Analytics and Speed Insights.

### Key Commands
- `pnpm dev`: Start Next.js development server.
- `pnpm build`: Build the application for production.
- `pnpm start`: Start the production server.
- `pnpm test:unit`: Run Vitest unit tests.
- `pnpm test:e2e`: Run Playwright E2E tests (smoke tests).
- `pnpm test:e2e:full`: Run all Playwright E2E tests.
- `pnpm lint`: Run ESLint.
- `pnpm format`: Format code with Prettier.

### Development Conventions
- **Validation**: Use Zod for all request/response boundaries.
- **Proxy**: API calls use same-origin Next.js proxy routes (`/api/*`) which forward to the backend.
- **Styling**: Prefer Tailwind v4 utility classes and CSS variables.
- **Components**: UI components are located in `components/ui/`, while feature-specific components are in `app/_components/` or `features/*/components/`.

---

## Shared Conventions

- **Language**: TypeScript is used throughout the project.
- **Package Manager**: pnpm.
- **Formatting & Linting**: ESLint and Prettier are configured for both projects.
- **Testing**: Vitest is the primary unit testing framework.
