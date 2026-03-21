import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("next.config security headers", () => {
  it("sets security headers on non-API routes", async () => {
    const headersConfig = await nextConfig.headers?.();
    expect(headersConfig).toHaveLength(1);

    const [routeConfig] = headersConfig ?? [];
    expect(routeConfig?.source).toContain("(?!api");

    const headers = new Map(routeConfig?.headers.map((header) => [header.key, header.value]));
    expect(headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(headers.get("Content-Security-Policy")).toContain("object-src 'none'");
    expect(headers.get("Content-Security-Policy")).toContain(
      "connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com https://*.r2.cloudflarestorage.com",
    );
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
  });

  it("restricts optimized remote image hosts to an allowlist", () => {
    const remotePatterns = nextConfig.images?.remotePatterns ?? [];

    expect(remotePatterns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          protocol: "https",
          hostname: "yonyoung.yonsei.ac.kr",
          pathname: "/api/public/media/**",
        }),
        expect.objectContaining({ hostname: "storage.yonyoung.moveto.kr" }),
        expect.objectContaining({ hostname: "**.googleusercontent.com" }),
      ]),
    );
    expect(remotePatterns).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ hostname: "**" })]),
    );
  });
});
