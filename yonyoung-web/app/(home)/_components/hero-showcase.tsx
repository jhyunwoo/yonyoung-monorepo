"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import type { ApiActivity, ApiExhibition } from "@/shared/contracts/api-contracts";
import { formatKoreanDateRange } from "@/shared/utils/date-formatters";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";
import { pickFeaturedPublicExhibition } from "@/features/public/model/public-exhibition";

type HeroShowcaseProps = {
  featuredExhibition: ApiExhibition | null;
  exhibitions: ApiExhibition[];
  recentActivities: ApiActivity[];
};

/**
 * HeroShowcase 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @param props 함수 로직에서 사용하는 입력값입니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default function HeroShowcase({
  featuredExhibition,
  exhibitions,
  recentActivities,
}: HeroShowcaseProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const [resolvedFeaturedExhibition, setResolvedFeaturedExhibition] =
    useState<ApiExhibition | null>(featuredExhibition);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: rootRef,
    offset: ["start start", "end start"],
  });
  const textOffset = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const imageOffset = useTransform(scrollYProgress, [0, 1], [0, 110]);
  const firstActivity = recentActivities[0];

  useEffect(() => {
    setResolvedFeaturedExhibition(pickFeaturedPublicExhibition(exhibitions));
  }, [exhibitions]);

  return (
    <section
      ref={rootRef}
      className="relative border-b border-(--surface-border) bg-(--surface-elevated) px-4 pb-44 pt-14 md:px-8 md:pb-20 md:pt-16"
      data-testid="home-hero"
    >
      <div className="mx-auto grid w-full max-w-300 gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-end">
        <motion.div style={shouldReduceMotion ? undefined : { y: textOffset }}>
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-(--text-muted)">
            Yonsei University Photography Club
          </p>
          <h1 className="text-6xl leading-[0.96] tracking-[-0.02em] text-(--text-primary) md:text-8xl">
            연영회
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-(--text-muted) md:text-lg">
            1966년부터 이어온 연세대학교 중앙사진동아리. 기록과 전시, 그리고 서로의 시선이
            만나는 장소를 만듭니다.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/archive/records"
              data-testid="home-cta-archive"
              className="inline-flex border border-(--surface-strong-border) bg-(--accent) px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-(--accent-foreground) transition hover:opacity-90"
            >
              활동 아카이브 보기
            </Link>
            <Link
              href="/about"
              data-testid="home-cta-about"
              className="inline-flex border border-(--surface-strong-border) px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-(--text-primary) transition hover:bg-(--text-primary) hover:text-white"
            >
              동아리 소개 보기
            </Link>
          </div>
        </motion.div>

        <motion.div
          style={shouldReduceMotion ? undefined : { y: imageOffset }}
          className="space-y-4"
        >
          <motion.article
            whileHover={shouldReduceMotion ? undefined : { y: -4, scale: 1.01 }}
            transition={{ type: "spring", damping: 20, stiffness: 260 }}
            className="overflow-hidden border border-(--surface-strong-border) bg-(--surface-elevated)"
          >
            <div className="relative aspect-4/3">
              {resolvedFeaturedExhibition ? (
                <Image
                  src={resolvedFeaturedExhibition.coverImageUrl}
                  alt={resolvedFeaturedExhibition.title}
                  fill
                  unoptimized={shouldUseUnoptimizedImage(
                    resolvedFeaturedExhibition.coverImageUrl,
                  )}
                  sizes="(min-width: 768px) 40vw, 100vw"
                  className="h-full w-full object-cover"
                  data-testid="home-hero-exhibition-image"
                  fetchPriority="high"
                  preload
                />
              ) : (
                <div className="h-full w-full bg-(--surface-muted) p-6">
                  <div className="h-3 w-24 animate-pulse bg-(--surface-border)" />
                  <div className="mt-3 h-8 w-3/4 animate-pulse bg-(--surface-border)" />
                  <div className="mt-2 h-4 w-4/5 animate-pulse bg-(--surface-border)" />
                </div>
              )}
            </div>
            <div className="space-y-2 p-5" data-testid="home-hero-exhibition-meta">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--text-muted)">
                Latest Exhibition
              </p>
              <h2 className="text-[1.7rem] tracking-[-0.02em] text-(--text-primary)">
                {resolvedFeaturedExhibition?.title ?? "준비 중"}
              </h2>
              {resolvedFeaturedExhibition ? (
                <p className="text-sm text-(--text-muted)">
                  {formatKoreanDateRange(
                    resolvedFeaturedExhibition.startDate,
                    resolvedFeaturedExhibition.endDate,
                  )}{" "}
                  · {resolvedFeaturedExhibition.place}
                </p>
              ) : null}
            </div>
          </motion.article>

          <div className="grid grid-cols-2 gap-3">
            <motion.div
              whileHover={shouldReduceMotion ? undefined : { y: -4 }}
              className="border border-(--surface-border) bg-(--surface-elevated) p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--text-muted)">
                Recent Activity
              </p>
              <p className="mt-2 line-clamp-2 text-sm font-medium text-(--text-primary)">
                {firstActivity?.title ?? "활동 업데이트 예정"}
              </p>
            </motion.div>
            <motion.div
              whileHover={shouldReduceMotion ? undefined : { y: -4 }}
              className="border border-(--surface-border) bg-(--surface-elevated) p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--text-muted)">
                Since
              </p>
              <p className="mt-2 text-3xl font-semibold text-(--text-primary)">1966</p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
