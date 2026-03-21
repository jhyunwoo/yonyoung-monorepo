import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "@/features/seo/metadata/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = resolveSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/about",
          "/about/photographers",
          "/about/recruiting",
          "/archive",
          "/archive/records",
          "/archive/exhibitions",
          "/donate",
          "/linktree",
        ],
        disallow: ["/dashboard", "/auth", "/api/internal"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
