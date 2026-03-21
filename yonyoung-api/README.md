# Yonyoung API

Cloudflare Workers 기반 Hono API 서버입니다.

## Tech Stack

- Runtime: Cloudflare Workers
- API Framework: Hono + `@hono/zod-openapi`
- Database: Cloudflare D1 + Drizzle ORM
- Object Storage: Cloudflare R2
- Auth: Better Auth
- Validation: Zod

## Architecture

```text
src/
  app/
    createApp.ts
    middleware/
      body-size.ts
      errorHandler.ts
      logger.ts
      requestId.ts
      securityHeaders.ts
    openapi.ts
  bindings/
    env.ts
    types.ts
  infra/
    db/
      client.ts
      migrations.ts
    r2/
      client.ts
  shared/
    errors/
      AppError.ts
      errorCodes.ts
      httpProblem.ts
      mapError.ts
    logging/
      logger.ts
  modules/                # domain routes (existing)
  lib/                    # existing services/repositories/openapi helpers
  index.ts

tests/
  integration/
  setup/
  unit/
```

## API Docs

- OpenAPI JSON: `/api/openapi.json`, `/doc`
- API UI: `/api/docs`, `/ui`

`@hono/zod-openapi` 스키마가 API 문서의 단일 소스입니다.

## Local Development

```bash
pnpm install
pnpm dev
```

`pnpm dev`는 실행 전에 `wrangler d1 migrations apply yonyoung-db --local`을 자동 수행합니다.
기존에 실행 중이던 `wrangler dev`가 있으면 먼저 종료한 뒤 다시 실행하세요.

## Quality Gates

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
```

### Test Notes

- Node tests: `src/tests/**/*.test.ts`, `tests/unit/**/*.test.ts`
- Workers runtime tests: `tests/integration/**/*.test.ts` via `@cloudflare/vitest-pool-workers`

## Deployment

```bash
pnpm deploy
```

### Workers Builds troubleshooting

If Cloudflare Workers Builds fails with the message below, the selected build token in the
Cloudflare dashboard is stale and must be replaced in the dashboard settings:

```text
The build token selected for this build has been deleted or rolled and cannot be used for this build.
```

Recovery steps:

1. In Cloudflare Dashboard, open `Workers & Pages` and select the `yonyoung-api` Worker.
2. Open `Settings > Build`.
3. In `API token`, select `Create new token` or choose another active user token.
4. Save the build settings and retry the failed build.

For this repository, the expected Worker name is `yonyoung-api` and the Wrangler configuration
file is at the repository root: `wrangler.jsonc`.

## CI

PR에서 다음 검증이 수행됩니다.

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:coverage`
