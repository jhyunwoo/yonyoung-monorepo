import type { MiddlewareHandler } from "hono";
import { secureHeaders } from "hono/secure-headers";
import type HonoAppType from "../../types/honoAppType";

const API_CSP = [
  "default-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'none'",
].join("; ");

const API_DOCS_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data: https:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'none'",
].join("; ");

const baseSecureHeaders = secureHeaders();

const resolveCspHeader = (pathname: string) => {
  if (pathname === "/api/docs" || pathname === "/ui") {
    return API_DOCS_CSP;
  }

  return API_CSP;
};

const isCspReportOnlyEnabled = (value: string | undefined): boolean => {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
};

export const apiSecurityHeadersMiddleware: MiddlewareHandler<HonoAppType> = async (
  c,
  next,
) => {
  await baseSecureHeaders(c, async () => {
    await next();
  });

  const requestUrl = new URL(c.req.url);
  const csp = resolveCspHeader(requestUrl.pathname);
  const cspReportOnly = c.env?.CSP_REPORT_ONLY;

  if (isCspReportOnlyEnabled(cspReportOnly)) {
    c.res.headers.set("Content-Security-Policy-Report-Only", csp);
    c.res.headers.delete("Content-Security-Policy");
  } else {
    c.res.headers.set("Content-Security-Policy", csp);
    c.res.headers.delete("Content-Security-Policy-Report-Only");
  }

  c.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  c.res.headers.set("X-Content-Type-Options", "nosniff");
  c.res.headers.set("X-Frame-Options", "DENY");
  c.res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  c.res.headers.set("Cross-Origin-Resource-Policy", "cross-origin");

  if (requestUrl.protocol === "https:") {
    c.res.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
};
