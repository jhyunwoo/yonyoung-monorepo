import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "@/features/seo/metadata/seo";

export default function manifest(): MetadataRoute.Manifest {
  const siteUrl = resolveSiteUrl();

  return {
    id: siteUrl,
    name: "연영회 | 연세대학교 중앙사진동아리",
    short_name: "연영회",
    description:
      "연세대학교 중앙사진동아리 연영회의 활동 기록, 전시 아카이브, 리크루팅 정보를 확인하세요.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "ko-KR",
    background_color: "#ffffff",
    theme_color: "#2c3357",
    categories: ["education", "photography", "lifestyle"],
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
    ],
  };
}
