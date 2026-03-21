import type { Metadata } from "next";
import {
  listPublicGenerations,
  safeList,
} from "@/features/public/services/public-read-service";
import { formatKoreanYearRange } from "@/shared/utils/date-formatters";
import { createPageMetadata } from "@/features/seo/metadata/seo";
import PageTitleHero from "@/app/(home)/_components/page-title-hero";

const annualActivities = [
  { month: "March", title: "리크루팅" },
  { month: "May", title: "연세대학교 대동제 보도 사진전" },
  { month: "June", title: "MT" },
  { month: "August", title: "정기 사진전" },
  { month: "October", title: "정기연고전 보도 사진전" },
  { month: "February", title: "신인 사진전" },
];

export const metadata: Metadata = createPageMetadata({
  title: "연영회 소개 | 연세대학교 중앙사진동아리",
  description:
    "1966년부터 이어진 연세대학교 중앙사진동아리 연영회의 역사, 연간 활동, 기수 정보를 소개합니다.",
  path: "/about",
  keywords: ["연영회 소개", "연영회 역사", "연세대학교 동아리", "사진 동아리 활동"],
});

const getPublicGenerations = async () => {
  return safeList(listPublicGenerations, []);
};

/**
 * AboutPage 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default async function AboutPage() {
  const generations = await getPublicGenerations();
  const splitIndex = Math.ceil(annualActivities.length / 2);
  const activityColumns = [
    annualActivities.slice(0, splitIndex),
    annualActivities.slice(splitIndex),
  ];

  return (
    <div className="min-h-screen bg-(--bg-primary)">
      <div className="mx-auto max-w-300 px-4 md:px-8">
        <PageTitleHero
          title="연영회 소개"
          description="연영회는 사진을 통해 세상을 기록하고 표현하는 동아리입니다. 우리는 다양한 주제와 스타일로 사진을 찍으며, 서로의 작품을 공유하고 함께 성장해 나갑니다."
        />
      </div>
      <main
        className="mx-auto w-full max-w-[1200px] space-y-14 px-4 pb-16 md:px-8 md:pb-20"
        data-testid="about-page"
      >
        <section className="space-y-6" data-testid="about-annual-activities">
          <h2 className="text-[2rem] font-semibold text-(--text-primary)">연간 활동</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {activityColumns.map((column, index) => (
              <article
                key={`about-activities-${index}`}
                className="border border-(--surface-border) p-5"
              >
                <ul className="space-y-4">
                  {column.map((activity) => (
                    <li
                      key={`${activity.month}-${activity.title}`}
                      className="flex items-start justify-between gap-4 border-b border-(--surface-border) pb-3 last:border-none last:pb-0"
                    >
                      <span className="text-sm font-semibold tracking-[0.04em] text-(--text-primary)">
                        {activity.month}
                      </span>
                      <span className="text-right text-sm text-(--text-muted)">
                        {activity.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-6" data-testid="about-history">
          <h2 className="text-[2rem] font-semibold text-(--text-primary)">연혁</h2>
          <div className="space-y-3 border-l border-(--surface-border) pl-4">
            <article className="border border-(--surface-border) p-4">
              <p className="text-sm font-semibold text-(--text-primary)">1966</p>
              <p className="text-sm text-(--text-muted)">연영회 창단</p>
            </article>

            {generations.map((generation) => (
              <article
                key={generation.id}
                className="border border-(--surface-border) p-4"
                data-testid={`about-generation-card-${generation.id}`}
              >
                <p className="text-sm font-semibold text-(--text-primary)">
                  {generation.name}
                </p>
                <p className="text-sm text-(--text-muted)">
                  {formatKoreanYearRange(generation.startDate, generation.endDate)}
                </p>
              </article>
            ))}

            {generations.length === 0 ? (
              <article className="border border-(--surface-border) p-4 text-sm text-(--text-muted)">
                공개된 기수 정보가 없습니다.
              </article>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
