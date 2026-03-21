import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const DEFAULT_PUBLIC_MEDIA_IMAGE_ORIGINS = [
  "https://yonyoung.yonsei.ac.kr",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
] as const;
type RemoteImagePattern = {
  protocol: "http" | "https";
  hostname: string;
  pathname: string;
  port?: string;
};
const CSP_CONNECT_SOURCES = [
  "'self'",
  "https://vitals.vercel-insights.com",
  "https://va.vercel-scripts.com",
  "https://*.r2.cloudflarestorage.com",
] as const;

const buildPublicMediaRemotePatterns = (): RemoteImagePattern[] => {
  const candidateOrigins = new Set<string>(DEFAULT_PUBLIC_MEDIA_IMAGE_ORIGINS);
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredSiteUrl) {
    candidateOrigins.add(configuredSiteUrl);
  }

  return [...candidateOrigins].flatMap((origin) => {
    try {
      const url = new URL(origin);

      return [
        {
          protocol: url.protocol.replace(":", "") as "http" | "https",
          hostname: url.hostname,
          pathname: "/api/public/media/**",
          ...(url.port ? { port: url.port } : {}),
        },
      ];
    } catch {
      return [];
    }
  });
};

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "form-action 'self'",
  "object-src 'none'",
  "manifest-src 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
  `connect-src ${CSP_CONNECT_SOURCES.join(" ")}`,
  "worker-src 'self' blob:",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-site",
  },
  {
    key: "Origin-Agent-Cluster",
    value: "?1",
  },
];

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true,
  },
  cacheComponents: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      ...buildPublicMediaRemotePatterns(),
      {
        protocol: "https",
        hostname: "storage.yonyoung.moveto.kr",
      },
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
