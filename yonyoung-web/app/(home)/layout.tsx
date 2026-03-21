import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ReactNode, Suspense } from "react";
import Script from "next/script";
import SiteHeader from "@/app/(home)/_components/site-header";
import SiteFooter from "@/app/(home)/_components/site-footer";
import PublicHeaderSafeArea from "@/app/(home)/_components/public-header-safe-area";
import { createPageMetadata } from "@/features/seo/metadata/seo";
import { WebVitalsReporter } from "@/app/_components/web-vitals-reporter";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

const ROOT_FONT_FAMILY =
  '"Pretendard Variable", "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';

export const metadata: Metadata = createPageMetadata({
  title: "연영회 | 연세대학교 중앙사진동아리",
  description: "연세대학교 중앙사진동아리 연영회의 활동과 전시를 소개합니다.",
  path: "/",
  keywords: [
    "연영회",
    "연세대학교",
    "중앙사진동아리",
    "사진동아리",
    "정기전",
    "아카이브",
  ],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

/**
 * RootLayout 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @param {
  children,
} 함수 로직에서 사용하는 입력값입니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <Script src="/theme-init.js" strategy="beforeInteractive" />
      </head>
      <body
        className="min-h-screen bg-(--bg-primary) text-(--text-primary) antialiased"
        style={{ fontFamily: ROOT_FONT_FAMILY }}
      >
        <Suspense fallback={null}>
          <WebVitalsReporter />
        </Suspense>
        <SpeedInsights />
        <Analytics />
        <Suspense
          fallback={
            <div
              className="h-(--public-header-height-mobile) md:h-(--public-header-height-desktop)"
              aria-hidden="true"
            />
          }
        >
          <SiteHeader />
        </Suspense>
        <main>
          <PublicHeaderSafeArea>{children}</PublicHeaderSafeArea>
        </main>
        <Suspense fallback={null}>
          <SiteFooter />
        </Suspense>
      </body>
    </html>
  );
}
