import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import MotionReveal from "@/app/(home)/_components/motion-reveal";
import SectionShell from "@/app/(home)/_components/section-shell";
import HeroShowcase from "@/app/(home)/_components/hero-showcase";
import {
  flattenLinktreeItems,
  listPublicActivities,
  listPublicExhibitions,
  listPublicLinktrees,
  safeList,
} from "@/features/public/services/public-read-service";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";
import { summarizeRichTextHtml } from "@/features/media/rich-text/rich-text";
import { resolveSiteUrl } from "@/features/seo/metadata/seo";
import { formatKoreanDateRange } from "@/shared/utils/date-formatters";

const getHomePrimaryData = async () => {
  return Promise.all([
    safeList(listPublicActivities, []),
    safeList(listPublicExhibitions, []),
  ]);
};

const getHomeQuickLinks = async () => {
  const linktrees = await safeList(listPublicLinktrees, []);
  return flattenLinktreeItems(linktrees).slice(0, 6);
};

const HomeQuickLinksSection = async () => {
  const quickLinks = await getHomeQuickLinks();

  return (
    <SectionShell
      id="quick-links"
      eyebrow="Quick Access"
      title="자주 찾는 링크"
      description="공식 링크와 커뮤니티 채널을 한 번에 연결합니다."
    >
      <div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        data-testid="home-quicklinks-grid"
      >
        {quickLinks.length === 0 ? (
          <div className="border border-(--surface-strong-border) bg-(--surface-elevated) p-6 text-sm text-(--text-muted)">
            공개 링크트리 항목이 없습니다.
          </div>
        ) : (
          quickLinks.map((item, index) => (
            <MotionReveal key={item.id} delay={index * 0.04} className="min-w-0">
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`home-quicklink-card-${item.id}`}
                className="group block min-w-0 border border-(--surface-border) bg-(--surface-elevated) p-4 transition hover:border-(--surface-strong-border) hover:bg-(--surface-muted)"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-(--text-muted)">
                  {item.groupName}
                </p>
                <p className="mt-2 text-base font-semibold text-(--text-primary)">
                  {item.name}
                </p>
                <p className="mt-1 truncate text-xs text-(--text-muted)">{item.link}</p>
              </a>
            </MotionReveal>
          ))
        )}
      </div>

      <MotionReveal className="mt-8">
        <div className="border border-(--surface-strong-border) bg-(--surface-elevated) p-6 text-center">
          <p className="text-sm text-(--text-muted)">
            연영회의 더 많은 전시와 활동을 아카이브에서 확인해보세요.
          </p>
          <Link
            href="/archive/records"
            data-testid="home-cta-archive-bottom"
            className="mt-4 inline-flex border border-(--surface-strong-border) px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-(--text-primary) transition hover:bg-(--text-primary) hover:text-white"
          >
            아카이브 보러가기
          </Link>
        </div>
      </MotionReveal>
    </SectionShell>
  );
};

export default async function HomePage() {
  const [activities, exhibitions] = await getHomePrimaryData();

  const recentActivities = activities.slice(0, 6);
  const siteUrl = resolveSiteUrl();
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "연영회",
    alternateName: "YonYoungHoe",
    url: siteUrl,
  };
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "연영회",
    url: siteUrl,
  };

  return (
    <div className="pb-14 md:pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteJsonLd),
        }}
      />
      <HeroShowcase
        featuredExhibition={exhibitions[0] ?? null}
        exhibitions={exhibitions}
        recentActivities={recentActivities}
      />

      <SectionShell
        id="recent-activities"
        eyebrow="Latest Activities"
        title="최근 활동 기록"
        description="가장 최근의 연영회 활동을 사진과 함께 확인해보세요."
      >
        <div
          className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="home-activities-grid"
        >
          {recentActivities.length === 0 ? (
            <div className="border border-(--surface-strong-border) bg-(--surface-elevated) p-6 text-sm text-(--text-muted)">
              아직 공개된 활동이 없습니다. 관리자에서 활동을 추가하면 여기에 반영됩니다.
            </div>
          ) : (
            recentActivities.map((activity, index) => (
              <MotionReveal key={activity.id} delay={index * 0.04}>
                <article
                  className="group overflow-hidden border border-(--surface-strong-border) bg-(--surface-elevated) transition-transform duration-300 hover:scale-[1.03]"
                  data-testid={`home-activity-card-${activity.id}`}
                >
                  <div className="relative aspect-4/3 overflow-hidden">
                    <Image
                      src={activity.coverImageUrl}
                      alt={activity.title}
                      fill
                      unoptimized={shouldUseUnoptimizedImage(activity.coverImageUrl)}
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="space-y-2 p-5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-(--text-muted)">
                      {formatKoreanDateRange(activity.startDate, activity.endDate)}
                    </p>
                    <h3 className="text-[1.3rem] leading-tight tracking-[-0.02em] text-(--text-primary)">
                      {activity.title}
                    </h3>
                    <p className="line-clamp-2 text-sm leading-relaxed text-(--text-muted)">
                      {summarizeRichTextHtml(activity.description, 90)}
                    </p>
                  </div>
                </article>
              </MotionReveal>
            ))
          )}
        </div>
      </SectionShell>

      <Suspense
        fallback={
          <SectionShell
            id="quick-links"
            eyebrow="Quick Access"
            title="자주 찾는 링크"
            description="공식 링크와 커뮤니티 채널을 한 번에 연결합니다."
          >
            <div className="h-36 animate-pulse border border-(--surface-strong-border) bg-(--surface-muted)" />
          </SectionShell>
        }
      >
        <HomeQuickLinksSection />
      </Suspense>
    </div>
  );
}
