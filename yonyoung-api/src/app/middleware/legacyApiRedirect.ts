import type { MiddlewareHandler } from "hono";
import type HonoAppType from "../../types/honoAppType";

const LEGACY_API_PREFIXES = ["/users"] as const;

const resolveRedirectTarget = (url: URL): string | null => {
  for (const prefix of LEGACY_API_PREFIXES) {
    if (url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)) {
      return `/api${url.pathname}${url.search}`;
    }
  }

  return null;
};

export const legacyApiRedirectMiddleware: MiddlewareHandler<HonoAppType> = async (
  c,
  next,
) => {
  const requestUrl = new URL(c.req.url);
  const target = resolveRedirectTarget(requestUrl);

  if (!target) {
    await next();
    return;
  }

  return c.redirect(target, 308);
};
