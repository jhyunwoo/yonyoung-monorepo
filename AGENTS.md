# Repository Guidelines

## Project Structure & Module Organization
This workspace contains two independent TypeScript projects:
- `yonyoung-api/`: Cloudflare Workers API (Hono + D1 + R2). Main code is in `src/` (`modules/`, `lib/`, `infra/`, `shared/`), DB migrations in `drizzle/`, and tests in `src/tests/` plus `tests/{unit,integration}/`.
- `yonyoung-web/`: Next.js App Router frontend. Routes live in `app/` (notably `(home)` and `(dashboard)` route groups), domain logic in `features/`, server utilities in `server/`, shared contracts/helpers in `shared/`, and tests in `tests/{unit,component,e2e}/`.

Treat each folder as its own repository (`.git` exists in both).

## Build, Test, and Development Commands
API (`yonyoung-api`):
- `pnpm dev`: apply local D1 migrations, then start Wrangler dev server.
- `pnpm lint && pnpm typecheck`: static quality gates.
- `pnpm test`: runs node + workers Vitest suites.
- `pnpm test:coverage`: coverage report.
- `pnpm deploy`: deploy Worker.

Web (`yonyoung-web`):
- `pnpm dev`: start Next.js locally.
- `pnpm build && pnpm start`: production build + serve.
- `pnpm lint && pnpm typecheck`: lint and strict type checks.
- `pnpm test:unit` / `pnpm test:e2e` / `pnpm test:ci`: unit, Playwright e2e, or full CI gate.

## Coding Style & Naming Conventions
- Language: TypeScript (ES modules).
- Use ESLint in both projects before PRs.
- Web formatting is Prettier-driven (`semi: true`, double quotes, trailing commas, `printWidth: 90`); run `pnpm format`.
- Follow existing naming patterns: `kebab-case` files (e.g., `public-read-service.ts`), `PascalCase` React components, `camelCase` functions/variables.
- Keep modules feature-scoped and colocate tests as `*.test.ts` or `*.test.tsx`.

## Testing Guidelines
- API uses Vitest (node + workers). Coverage thresholds in `yonyoung-api/vitest.config.ts`: lines/functions/statements 80%, branches 70%.
- Web uses Vitest + Testing Library for unit/component and Playwright for e2e. Coverage thresholds in `yonyoung-web/vitest.config.ts` are high (95% lines/functions/statements, 90% branches).
- For behavior changes, add or update tests in the closest feature directory.

## Commit & Pull Request Guidelines
- History favors Conventional Commit style: `feat:`, `fix:`, `refactor:`, `test:`, `style:`, `deps:`, `ci:`, `config:`.
- Use concise, imperative summaries (`feat: add market item edit validation`).
- PRs should include: scope, impacted repo(s), linked issue, and exact verification commands run.
- UI changes should include screenshots; API contract changes should include example request/response or OpenAPI impact notes.

## Security & Configuration Tips
- Never commit secrets. Keep local values in `.env`/`.dev.vars`.
- Web requires `API_BASE_URL`, `NEXT_PUBLIC_SITE_URL`, and `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
- Validate migration and auth-related changes in both local dev and test commands before requesting review.
