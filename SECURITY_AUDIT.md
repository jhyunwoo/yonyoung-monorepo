# Security Audit

Date: 2026-03-07

Scope:
- `yonyoung-api` (Cloudflare Workers + Hono + Better Auth + Drizzle + D1 + R2)
- `yonyoung-web` (Next.js App Router + same-origin `/api/*` proxy routes + TipTap)

Baseline:
- OWASP ASVS Level 2
- OWASP Top 10 A01-A10 category set, used here as the requested “Top 10:2025” mapping baseline

Summary:
- Fixed: broken access control in admin/user management, CSRF gaps on cookie-backed mutations, open-proxy/SSRF risks in Next proxy routes, stored XSS from rich text rendering, insecure R2 public-read patterns, Better Auth hardening gaps, docs exposure/caching issues, and raw client telemetry over-logging.
- Residual/manual: global rate limiting still needs Cloudflare edge enforcement; CSP is materially improved and enforced, but not nonce-based yet.

Breaking or security-significant behavior changes:
- Public media access now goes through signed Worker-gated URLs under `/api/public/media/*`; do not rely on direct/public bucket URLs.
- Production docs are now expected to run with `DOCS_AUTH_IN_PROD=true`; public docs in production are no longer the safe default.
- Same-origin proxy mutations now require browser same-origin context and `x-yonyoung-csrf: 1` for client-side mutation calls through the web proxy.

## Threat Model

Assets:
- Better Auth session cookies and OAuth/session state
- User PII in D1: `email`, `familyName`, `givenName`, `college`, `department`, `studentNumber`, `phoneNumber`, `personalLink`
- Role assignments and admin-only write operations
- R2 media objects and upload presign flows
- OpenAPI docs and internal route inventory
- Cloudflare/Vercel environment secrets and deployment settings

Entry points:
- Public web pages and public API routes
- Next.js same-origin proxy handlers under `/api/[...path]` and `/api/auth/[...path]`
- Next.js server actions for admin/dashboard mutations
- Hono API routes under `/api/*`
- Better Auth endpoints under `/api/auth/*`
- R2 presign/multipart endpoints and signed media read route
- OpenAPI docs endpoints `/api/openapi.json`, `/api/docs`, `/doc`, `/ui`

Trust boundaries:
- Browser to Next.js application
- Next.js application to Cloudflare Workers API
- Workers API to D1
- Workers API to R2
- Cloudflare/Vercel dashboard and secret-management planes
- OAuth provider to Better Auth callback flow

Attacker goals:
- Session riding via CSRF
- Privilege escalation and BOLA/IDOR on admin/user operations
- SSRF/open-proxy abuse through same-origin route handlers
- Stored XSS through TipTap/rich-text content
- Unauthorized object reads/writes in R2
- Sensitive metadata exposure through docs, logs, or error surfaces
- Resource exhaustion on auth, upload, and public media endpoints

## Findings

### 1. High [Fixed] Broken Access Control on admin dashboard and user management

Affected components:
- `yonyoung-api/src/modules/dashboard.ts`
- `yonyoung-api/src/modules/users.ts`
- `yonyoung-web/features/dashboard/actions/admin-write-actions.ts`
- `yonyoung-web/features/dashboard/actions/admin-write-access.ts`

Evidence:
- `yonyoung-api/src/modules/dashboard.ts`
```ts
if (!can(actorResult.actor.role, "user", "read")) {
  return forbidden(c);
}
```
- `yonyoung-api/src/modules/users.ts`
```ts
const unauthorizedTargetExists = targetUsers.some(
  (candidate) =>
    candidate !== null &&
    !canManageTargetUser(actorResult.actor, {
      id: candidate.id,
      role: candidate.role,
    }),
);
```
- `yonyoung-web/features/dashboard/actions/admin-write-actions.ts`
```ts
return writeRequest({
  path: "/generations",
  method: "POST",
  accessScope: "leadership",
  ...
});
```

Exploit scenario:
- A regular member could reach admin-only dashboard data.
- A vice president could previously update or delete a president account, or bulk-demote privileged users, because only the actor’s own role was checked and not the target user’s hierarchy.

Recommended fix:
- Enforce deny-by-default role checks on sensitive admin routes.
- Require server-side target-user hierarchy checks for update, bulk role change, and deletion.
- Preserve at least one `president` account.
- Keep explicit write scopes close to server actions.

Mapping:
- OWASP: A01 Broken Access Control
- ASVS: Access Control; API and Web Service; Architecture/Threat Modeling

### 2. High [Fixed] Cookie-backed mutation routes lacked app-owned CSRF protection

Affected components:
- `yonyoung-api/src/app/middleware/csrf.ts`
- `yonyoung-api/src/app/createApp.ts`
- `yonyoung-web/server/security/request-guards.ts`
- `yonyoung-web/app/api/[...path]/route.ts`
- `yonyoung-web/app/api/auth/[...path]/route.ts`
- `yonyoung-web/features/dashboard/api/admin-api/http.ts`

Evidence:
- `yonyoung-api/src/app/middleware/csrf.ts`
```ts
const secFetchSite = c.req.header("sec-fetch-site")?.trim().toLowerCase();
if (secFetchSite && !SAME_SITE_FETCH_VALUES.has(secFetchSite)) {
  return forbidden(c, "교차 출처 상태 변경 요청은 허용되지 않습니다.");
}
```
- `yonyoung-web/server/security/request-guards.ts`
```ts
if (!requestOrigin || requestOrigin !== request.nextUrl.origin) {
  return createJsonErrorResponse(403, "Same-origin requests are required.");
}
if (options?.requireCsrfHeader) {
  const csrfHeaderValue = request.headers.get(CSRF_HEADER_NAME)?.trim();
  if (csrfHeaderValue !== CSRF_HEADER_VALUE) {
    return createJsonErrorResponse(403, "Missing CSRF protection header.");
  }
}
```

Exploit scenario:
- An attacker-controlled site could attempt cross-site POST/PATCH/DELETE requests against cookie-authenticated routes by relying on the browser to attach the victim’s session cookie.

Recommended fix:
- Block cross-site state-changing requests at both the Workers API and Next proxy layers.
- Require same-origin plus an explicit CSRF header on browser-side proxy mutations.
- Do not disable Better Auth origin/CSRF protections.

Mapping:
- OWASP: A01 Broken Access Control
- ASVS: Session Management; Access Control; API and Web Service

### 3. High [Fixed] Next.js proxy layer allowed open-proxy/SSRF-style abuse and header forwarding risk

Affected components:
- `yonyoung-web/server/security/request-guards.ts`
- `yonyoung-web/app/api/[...path]/route.ts`
- `yonyoung-web/app/api/auth/[...path]/route.ts`

Evidence:
- `yonyoung-web/app/api/[...path]/route.ts`
```ts
const upstreamPath = normalizeProxyPath({
  pathSegments: path,
  allowedPrefixes: ALLOWED_PROXY_PREFIXES,
  blockedPrefixes: BLOCKED_PROXY_PREFIXES,
});
...
headers: buildUpstreamProxyHeaders(request),
```
- `yonyoung-web/app/api/auth/[...path]/route.ts`
```ts
headers: buildUpstreamProxyHeaders(request, {
  extraHeaders: {
    "x-forwarded-host": request.nextUrl.host,
    "x-forwarded-proto": resolveForwardedProtocol(request),
  },
}),
```

Exploit scenario:
- A caller could abuse the same-origin proxy as a generic upstream forwarder, smuggle traversal segments, or forward unexpected headers to the API/auth backend.

Recommended fix:
- Keep a fixed upstream base URL.
- Allowlist routed prefixes.
- Reject `.`/`..`/empty/path-breaking segments.
- Forward only a constrained header set.
- Never trust incoming `Host` for auth callback routing.

Mapping:
- OWASP: A10 Server-Side Request Forgery
- ASVS: API and Web Service; Configuration; Communications

### 4. High [Fixed] Stored XSS through TipTap/rich-text HTML rendering

Affected components:
- `yonyoung-web/features/media/rich-text/rich-text.ts`
- `yonyoung-web/features/media/rich-text/rich-text-content.tsx`
- `yonyoung-api/src/modules/public.ts`

Evidence:
- `yonyoung-web/features/media/rich-text/rich-text.ts`
```ts
const sanitizeFilter = new FilterXSS({
  stripIgnoreTagBody: ["script", "style", "iframe", "object", "embed"],
  safeAttrValue(tag, name, value) {
    if (tag === "a" && name === "href") {
      return isAllowedLink(value) ? trim(value) : "";
    }
```
- `yonyoung-web/features/media/rich-text/rich-text-content.tsx`
```tsx
const sanitizedHtml = sanitizeRichTextHtml(html);
return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
```

Exploit scenario:
- A stored HTML payload inside activity/exhibition/notice content could execute in a victim’s browser via `dangerouslySetInnerHTML`, steal session context, or pivot into admin actions.

Recommended fix:
- Sanitize rich text on render and keep API-side public response sanitization in place.
- Allow only an explicit tag/attribute allowlist.
- Strip executable tags and `javascript:` URLs.
- Force safe `rel` values on external links.

Mapping:
- OWASP: A03 Injection
- ASVS: Validation, Sanitization and Encoding; API and Web Service

### 5. High [Fixed] R2 public-read model was too permissive and object keys were predictable

Affected components:
- `yonyoung-api/src/lib/storage/presign.ts`
- `yonyoung-api/src/modules/public.ts`
- `yonyoung-api/src/modules/uploads.ts`

Evidence:
- `yonyoung-api/src/lib/storage/presign.ts`
```ts
const createFileToken = (fileName: string): string => {
  const safeFileName = sanitizeFileName(fileName);
  return `${crypto.randomUUID()}-${safeFileName}`;
};
...
return buildSignedPublicObjectUrl({
  baseUrl: storageEnv.publicReadBaseUrl,
  objectKey,
  signingSecret: storageEnv.publicUrlSigningSecret,
});
```
- `yonyoung-api/src/modules/public.ts`
```ts
const isValidSignature = await verifySignedPublicObjectSignature({
  objectKey,
  signature,
  signingSecret,
});
if (!isValidSignature) {
  return notFound(c);
}
```
- `yonyoung-api/src/modules/uploads.ts`
```ts
const parsed = parseManagedObjectKey(input.objectKey);
if (!parsed) {
  return badRequest(input.c, "objectKey 형식이 올바르지 않습니다.");
}
```

Exploit scenario:
- Predictable keys plus a direct/custom-domain public-read model could allow unauthorized enumeration or object retrieval.
- Multipart ownership validation could be bypassed with malformed path segments.

Recommended fix:
- Keep the bucket private by default.
- Use opaque UUID-based keys.
- Serve anonymous reads only through signed Worker-gated URLs.
- Validate exact managed key structure, content type, and file size.

Mapping:
- OWASP: A01 Broken Access Control
- ASVS: Files and Resources; Access Control; Validation, Sanitization and Encoding

### 6. Medium [Fixed] Better Auth runtime configuration could fail open into weaker cookie/host assumptions

Affected components:
- `yonyoung-api/src/lib/config/runtime-env.ts`
- `yonyoung-api/src/lib/auth.ts`
- `yonyoung-web/app/api/auth/[...path]/route.ts`

Evidence:
- `yonyoung-api/src/lib/config/runtime-env.ts`
```ts
if (parsed.protocol !== "https:" && !isLoopbackHostname(parsed.hostname)) {
  throw new Error(`${options.label} must use https outside localhost`);
}
...
if (secret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET must be at least 32 characters long");
}
```
- `yonyoung-api/src/lib/auth.ts`
```ts
defaultCookieAttributes: {
  httpOnly: true,
  sameSite: "lax",
  secure: useSecureCookies,
},
```

Exploit scenario:
- Weak or malformed runtime auth configuration could permit insecure cookies, overly broad trusted origins, or unsafe host assumptions during auth flows and callbacks.

Recommended fix:
- Validate `BETTER_AUTH_URL`, trusted origins, and secret length at startup.
- Keep secure cookie defaults fail-safe.
- Derive forwarded auth host/protocol from trusted request context, not untrusted incoming headers.

Mapping:
- OWASP: A07 Identification and Authentication Failures
- ASVS: Authentication; Session Management; Configuration

### 7. Medium [Fixed] OpenAPI/docs endpoints were insufficiently protected for production use

Affected components:
- `yonyoung-api/src/modules/docs.ts`
- `yonyoung-api/wrangler.jsonc`
- `yonyoung-api/src/app/middleware/securityHeaders.ts`

Evidence:
- `yonyoung-api/src/modules/docs.ts`
```ts
if (!dependencies.shouldRequireDocsAuth(c)) {
  return null;
}
...
if (!can(actorResult.actor.role, "user", "read")) {
  return forbidden(c, "OpenAPI 문서에 접근할 권한이 없습니다.");
}
```
- `yonyoung-api/src/modules/docs.ts`
```ts
c.header(
  "Cache-Control",
  options.requireAuth ? "private, no-store, max-age=0" : DOCS_CACHE_CONTROL,
);
```

Exploit scenario:
- Public production docs can expose the full route inventory and operational semantics to unauthenticated users, and shared caching can leak authenticated docs to other viewers if not marked private.

Recommended fix:
- Require privileged auth for docs in production.
- Use private/no-store cache headers when docs auth is enabled.
- Keep docs CSP constrained and do not expose secrets in OpenAPI generation.

Mapping:
- OWASP: A05 Security Misconfiguration
- ASVS: API and Web Service; Access Control; Configuration

### 8. Medium [Fixed] Client telemetry endpoints logged raw client-provided error content

Affected components:
- `yonyoung-web/server/observability/client-telemetry.ts`
- `yonyoung-web/app/api/internal/client-error/route.ts`
- `yonyoung-web/app/api/internal/web-vitals/route.ts`

Evidence:
- `yonyoung-web/server/observability/client-telemetry.ts`
```ts
return {
  messagePresent: message !== null,
  messageLength: message?.length ?? 0,
  stackPresent: stack !== null,
  stackLineCount: stack ? stack.split(/\r?\n/).filter(Boolean).length : 0,
  metadataKeyCount: metadataKeys.length,
  metadataKeys,
};
```
- `yonyoung-web/app/api/internal/client-error/route.ts`
```ts
const route = normalizeObservedRoute(parsed.data.path);
logger.warn({
  event: parsed.data.event,
  route,
  error: summarizeClientErrorForLog(parsed.data),
});
```

Exploit scenario:
- Client-side error payloads can contain raw user text, query parameters, stack traces, or other incidentally sensitive data; logging them verbatim increases breach impact and retention risk.

Recommended fix:
- Normalize route paths before logging.
- Log only presence/length/count metadata for client error text.
- Keep raw secrets redacted in structured loggers and avoid storing raw client metadata values.

Mapping:
- OWASP: A09 Security Logging and Monitoring Failures
- ASVS: Error Handling and Logging; Data Protection

### 9. Medium [Residual / Manual] Global rate limiting still depends on Cloudflare edge controls

Affected components:
- Cloudflare edge configuration
- High-value API paths: `/api/auth/*`, presign/multipart routes, `/api/public/media/*`, user-admin mutations, notice/admin mutations

Evidence:
- No shared-state limiter binding is present in app code; current repo has no KV/Redis-backed counter or dedicated Durable Object rate-limit module.

Exploit scenario:
- Credential stuffing, abusive upload attempts, media scraping, or repeated admin mutation attempts can still create availability and abuse risk if edge limits are absent or too loose.

Recommended fix:
- Enforce rate limiting in Cloudflare WAF / Rate Limiting / API Shield immediately.
- If app-layer quotas are needed later, add a globally consistent backing store (Durable Object/KV/Redis), not a per-instance in-memory limiter.

Mapping:
- OWASP: A04 Insecure Design
- ASVS: Architecture/Threat Modeling; API and Web Service; Configuration

### 10. Low [Residual] CSP is enforced, but not nonce-based yet

Affected components:
- `yonyoung-web/next.config.ts`
- `yonyoung-api/src/app/middleware/securityHeaders.ts`

Evidence:
- `yonyoung-web/next.config.ts`
```ts
"style-src 'self' 'unsafe-inline'",
"script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
```

Exploit scenario:
- The current policy is much tighter than before, but `'unsafe-inline'` remains a weaker posture than a true nonce/hash-based CSP.

Recommended fix:
- Keep the current enforced CSP.
- Plan a future nonce-based rollout using per-request middleware/header plumbing and removal of inline/runtime script dependencies where feasible.

Mapping:
- OWASP: A05 Security Misconfiguration
- ASVS: Configuration; Validation, Sanitization and Encoding

## Explicit Checklist Confirmation

### Backend (Workers / Hono)

| Item | Status | Notes |
| --- | --- | --- |
| CORS only allows intended origins; never `*` with credentials | Confirmed | `src/middlewares/cors.ts` allowlists Better Auth trusted origins and keeps `credentials: true` without wildcard origins. |
| CSRF on state-changing cookie-auth endpoints | Confirmed | `src/app/middleware/csrf.ts` blocks cross-site state changes; Next proxy/internal routes enforce same-origin and CSRF header for browser mutations. |
| Authentication cookie attributes | Confirmed | Better Auth cookies now default to `HttpOnly`, `SameSite=Lax`, `Secure` on HTTPS. |
| Session rotation / logout invalidation | Existing platform behavior | Better Auth handles session lifecycle; no code path here disables its checks. |
| Fresh session for sensitive endpoints | Residual / future | No current payment/password-reset/email-change style step-up flow exists. Add recent-auth enforcement before such routes are introduced. |
| Authorization deny-by-default | Confirmed | Admin dashboard and user-management hierarchy checks are now explicit; sensitive server actions use explicit scopes. |
| Object ownership and role checks | Confirmed for audited critical paths | Upload ownership, user-target hierarchy, and admin write scopes are enforced server-side on audited mutation paths. |
| Input validation via Zod | Confirmed | Route bodies/params/queries use Zod at the API boundary; example: docs, uploads, user routes, resource-history query limit. |
| Pagination / sort validation | Confirmed | Example: `ApiUserResourceHistoryQuerySchema`, admin dashboard stats query schema. |
| Output encoding / reflected HTML safety | Confirmed | Public activity/exhibition descriptions are sanitized on API output; frontend rich-text rendering is sanitized before injection. |
| Error handling avoids stack/PII leaks | Confirmed | `errorHandler` maps internal errors to standard envelopes with request IDs; stacks are not exposed to clients. |
| Rate limiting | Residual / manual | No global app-layer limiter was added because the repo lacks a globally consistent counter backend; enforce at Cloudflare edge. |
| Request size limits before parsing | Confirmed | API global `maxBodySizeMiddleware` protects `/api/*`; Next route handlers pre-check `content-length`. |
| OpenAPI docs do not expose secrets / internal-only routes by default | Confirmed with caveat | Docs now require auth in production by default and use private cache when protected; if operators disable the env flag, docs become public by choice. |

### Database (D1 / Drizzle)

| Item | Status | Notes |
| --- | --- | --- |
| Parameterized queries everywhere; no dynamic SQL concat | Confirmed in audited runtime code | Search found no unsafe runtime string-concatenated SQL. The only `sql\`\`` hit is a static schema default in `src/lib/db/schema.ts`; `bound.raw()` appears in tests only. |
| Data classification and PII redaction in logs | Partially confirmed / improved | PII fields are concentrated in user profile records. API logger redacts tokens/secrets/cookies; web telemetry now logs summaries instead of raw client text. |
| Backup and recovery expectations documented | Confirmed below | D1 backup/restore remains an operational control; set explicit RPO/RTO and run restore drills. |

PII classes identified:
- Direct identifiers: `email`, name fields
- Student/member profile data: `college`, `department`, `studentNumber`, `phoneNumber`
- Optional profile links/media: `personalLink`, profile image/showcase URLs
- Authorization-sensitive data: `role`, `generationId`, `generationIds`

Backup / recovery expectations:
- Target RPO: 24 hours or better.
- Target RTO: 4 hours or better.
- Operational requirement: maintain scheduled D1 exports / restore drills and validate the current Cloudflare D1 backup or point-in-time recovery capability for the active plan before production sign-off.

### Storage (R2)

| Item | Status | Notes |
| --- | --- | --- |
| Private-by-default access model | Confirmed in code | Public reads are now Worker-gated signed URLs, not direct bucket URLs. Bucket public-access settings must still remain disabled in Cloudflare. |
| Signed URL approach | Confirmed | Upload presigns use 1-hour TTL; anonymous media reads use HMAC-signed application URLs. |
| Prefix restrictions and key validation | Confirmed | `parseManagedObjectKey()` requires exact 4-segment managed keys and validates resource/slot/actor/token. |
| Content-type restrictions | Confirmed | Uploads are limited to allowlisted image MIME types; public media serving re-checks allowed image content types. |
| File size limit | Confirmed | Upload limits are enforced for single-part and multipart flows before presign issuance. |
| Safe object key generation | Confirmed | Keys are UUID-based and sanitized; no predictable timestamp-only naming remains. |
| Overwrite/path trick prevention | Confirmed | Managed key parser rejects malformed paths and multipart ownership now re-validates actor ownership. |
| Custom domain behavior | Confirmed | The implementation does not rely on direct presigned custom-domain reads; anonymous access is Worker-gated with HMAC validation. |

### Frontend (Next.js / Vercel)

| Item | Status | Notes |
| --- | --- | --- |
| CSP and security headers via `headers()` | Confirmed | Implemented in `next.config.ts` using official `headers()` mechanism. |
| `frame-ancestors` and anti-clickjacking | Confirmed | `frame-ancestors 'none'` and `X-Frame-Options: DENY` set. |
| TipTap content sanitization | Confirmed | Render-time sanitization added before `dangerouslySetInnerHTML`. |
| Server Actions authZ close to mutation | Confirmed | Sensitive actions now use explicit scopes via `assertAdminWriteAccess`. |
| Route Handlers handle CSRF manually | Confirmed | Same-origin and body-limit guards added to proxy and internal handlers. |
| `/api` proxy avoids SSRF/open proxy | Confirmed | Fixed upstream base URL, allowlisted prefixes, path normalization, filtered header forwarding. |
| Secrets do not cross `use client` boundaries | No high-confidence leak found in this audit | No server-secret exposure was found during the reviewed web server/action/proxy paths. |
| Vercel deployment protection and env scoping | Manual / operational | See manual checklist below. |
| CSP nonce strategy | Residual | Real enforced CSP is in place, but not nonce-based yet. |

## Cloudflare / Vercel Dashboard Hardening Checklist

Cloudflare:
- Require MFA and SSO for all dashboard users; remove unused users and API tokens.
- Rotate `BETTER_AUTH_SECRET` and `R2_PUBLIC_URL_SIGNING_SECRET` on a defined schedule; keep dev/staging/prod isolated.
- Keep all R2 buckets private; do not enable public bucket access or a public custom-domain bypass around the Worker.
- Enable Cloudflare WAF managed rules and the OWASP ruleset for the API zone.
- Add Cloudflare rate limits for:
  - `/api/auth/*`
  - presign and multipart upload endpoints
  - `/api/public/media/*`
  - `/api/users/*`, `/api/admin/*`, notice/admin mutation routes
- If available for your plan, enable API Shield controls for schema validation and non-browser client protection.
- Keep `DOCS_AUTH_IN_PROD=true` in production Worker vars.
- Restrict production deploy rights to a small operator set; review audit logs regularly.
- Verify current D1 backup / point-in-time restore capability on the active plan and run restore drills against the target RPO/RTO.

Vercel:
- Require MFA and SSO for the Vercel team; review role assignments.
- Enable Deployment Protection for preview deployments and sensitive environments.
- Scope environment variables by environment; never expose production secrets to preview or development.
- Restrict production deployments to the protected production branch/workflow only.
- Review custom domains and remove stale preview/public domains.
- Restrict access to Vercel logs, analytics, and environment settings to least privilege.
- Keep preview URLs private when they contain internal/admin functionality or real data.

## How To Verify

Run these exact commands from the workspace root.

API:
- `cd /Users/jhyunwoo/projects/yonyoung/yonyoung-api && pnpm lint`
  - Expected: exit code `0`
  - Result: passed
- `cd /Users/jhyunwoo/projects/yonyoung/yonyoung-api && pnpm typecheck`
  - Expected: exit code `0`
  - Result: passed
- `cd /Users/jhyunwoo/projects/yonyoung/yonyoung-api && pnpm test`
  - Expected: node Vitest suite passes and workers integration suite passes
  - Result: passed (`39` test files / `522` tests in node suite; `3` integration files / `9` tests in workers suite)

Web:
- `cd /Users/jhyunwoo/projects/yonyoung/yonyoung-web && pnpm lint`
  - Expected: exit code `0`
  - Result: passed
- `cd /Users/jhyunwoo/projects/yonyoung/yonyoung-web && pnpm typecheck`
  - Expected: exit code `0`
  - Result: passed
- `cd /Users/jhyunwoo/projects/yonyoung/yonyoung-web && pnpm test:unit`
  - Expected: Vitest unit/component suite passes
  - Result: passed (`37` test files / `115` tests)
- `cd /Users/jhyunwoo/projects/yonyoung/yonyoung-web && pnpm build`
  - Expected: production build succeeds
  - Result: passed
  - Note: build emitted expected public-read fallback warnings (`fetch failed`) while statically generating pages without a live upstream API; the build still completed successfully.
- `cd /Users/jhyunwoo/projects/yonyoung/yonyoung-web && pnpm test:e2e`
  - Expected: smoke Playwright run passes for home rendering and unauthenticated dashboard gating
  - Result: passed (`4` checks across desktop/mobile Chromium)
  - Note: this script now targets real existing smoke specs; the previous `tests/e2e/smoke` target would not have provided meaningful coverage.

Non-blocking warnings observed during verification:
- Next/Image test mocks still emit React DOM warnings about boolean props like `fill`, `priority`, and `unoptimized`; tests still pass.
- Playwright/Next web server logs emit `NO_COLOR` warnings in this environment; the e2e run still passes.
- Wrangler test output warns that `unstable_dev()` is experimental; API workers tests still pass.

## Final Assessment

The current codebase materially improves toward ASVS Level 2 with the highest-risk paths now closed:
- broken access control on admin and user management
- CSRF on cookie-backed mutations
- SSRF/open-proxy exposure in same-origin proxy routes
- stored XSS from TipTap/rich-text content
- insecure R2 public-read patterns
- auth/runtime misconfiguration risks
- docs exposure/caching issues
- raw client telemetry over-logging

The remaining work is mostly operational:
- enforce Cloudflare rate limiting and WAF/API Shield policies
- plan a future nonce-based CSP rollout if the application needs a stricter script posture than the current enforced static CSP
