import type { Metadata } from "next";
import { buildOpenGraphImagePath } from "@/features/seo/og/opengraph-image";

const DEFAULT_PROD_SITE_URL = "https://yonyoung.yonsei.ac.kr";

export const resolveSiteUrl = (): string => {
  if (process.env.NODE_ENV !== "production") {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_PROD_SITE_URL;
};

export const createPageMetadata = (input: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  type?: "website" | "article";
}): Metadata => {
  const siteUrl = resolveSiteUrl();
  const canonicalUrl = new URL(input.path, siteUrl);
  const openGraphImageUrl = new URL(
    buildOpenGraphImagePath({
      title: input.title,
      description: input.description,
      path: input.path,
    }),
    siteUrl,
  );

  return {
    title: input.title,
    description: input.description,
    keywords: input.keywords,
    metadataBase: new URL(siteUrl),
    manifest: "/manifest.webmanifest",
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: input.type ?? "website",
      locale: "ko_KR",
      url: canonicalUrl,
      title: input.title,
      description: input.description,
      siteName: "연영회",
      images: [
        {
          url: openGraphImageUrl.toString(),
          width: 1200,
          height: 630,
          alt: `${input.title} | 연영회`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [openGraphImageUrl.toString()],
    },
  };
};
