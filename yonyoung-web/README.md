## Getting Started

Create `.env`:

```bash
API_BASE_URL=https://api.yonyoung.moveto.kr
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
```

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

```bash
pnpm lint
pnpm format:check
pnpm test:unit
pnpm test:e2e
pnpm build
```

## Notes

- API calls use same-origin Next.js proxy routes (`/api/*`) and forward to `API_BASE_URL`.
- Request and response boundaries are runtime-validated with Zod.
- Observability uses built-in structured JSON logs with `instrumentation.ts` and `instrumentation-client.ts`.
- `next/image` wildcard remote host (`**`) remains enabled as an approved exception.
