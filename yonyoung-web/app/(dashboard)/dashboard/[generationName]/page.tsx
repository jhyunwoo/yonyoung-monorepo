import { Suspense } from "react";
import Link from "next/link";
import { formatAuditActor } from "@/features/dashboard/ui/audit-display";
import { formatKoreanDate, formatKoreanDateRange } from "@/shared/utils/date-formatters";
import { readCookieHeader } from "@/shared/http/http";
import {
  listCachedActivities,
  listCachedExhibitions,
  listCachedGenerationMembers,
} from "@/features/dashboard/cache/admin-dashboard-cache";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardR2StorageUsage from "@/app/(dashboard)/_components/dashboard-r2-storage-usage";
import { requireDashboardGeneration } from "@/app/(dashboard)/dashboard/[generationName]/_lib/resolve-generation";
import GenerationNoticeOverview from "@/app/(dashboard)/dashboard/[generationName]/generation-notice-overview";

const sortByStartDateDesc = <T extends { startDate: number }>(list: T[]): T[] => {
  return [...list].sort((left, right) => right.startDate - left.startDate);
};

const GenerationDashboardSummary = async (input: {
  generationId: string;
  generationPath: string;
}) => {
  const cookieHeader = await readCookieHeader();
  const [activities, exhibitions, generationMembers] = await Promise.all([
    listCachedActivities(input.generationId, cookieHeader),
    listCachedExhibitions(input.generationId, cookieHeader),
    listCachedGenerationMembers(input.generationId, cookieHeader),
  ]);

  const generationActivities = sortByStartDateDesc(activities);
  const generationExhibitions = sortByStartDateDesc(exhibitions);
  const recentActivities = generationActivities.slice(0, 4);
  const recentExhibitions = generationExhibitions.slice(0, 3);

  const latestUpdateTimestamp = Math.max(
    generationActivities[0]?.startDate ?? 0,
    generationExhibitions[0]?.startDate ?? 0,
  );

  return (
    <>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <li className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">기수 멤버</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">
            {generationMembers.length}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300">명</p>
        </li>
        <li className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">활동</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">
            {generationActivities.length}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300">건</p>
        </li>
        <li className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">전시</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">
            {generationExhibitions.length}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300">건</p>
        </li>
        <li className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">최근 업데이트</p>
          <p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-50">
            {latestUpdateTimestamp > 0 ? formatKoreanDate(latestUpdateTimestamp) : "-"}
          </p>
        </li>
      </ul>

      <div className="mt-4">
        <DashboardR2StorageUsage />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <GenerationNoticeOverview
          generationId={input.generationId}
          generationPath={input.generationPath}
        />

        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">최근 활동</h2>
          {recentActivities.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-4 text-sm text-slate-600 dark:text-slate-300">
              최근 활동 정보가 없습니다.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recentActivities.map((activity) => (
                <li
                  key={activity.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3"
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{activity.title}</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    {formatKoreanDateRange(activity.startDate, activity.endDate)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <h3 className="mt-6 text-sm font-semibold text-slate-900 dark:text-slate-50">최근 전시</h3>
          {recentExhibitions.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-4 text-sm text-slate-600 dark:text-slate-300">
              최근 전시 정보가 없습니다.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {recentExhibitions.map((exhibition) => (
                <li
                  key={exhibition.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3"
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {exhibition.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    {formatKoreanDateRange(exhibition.startDate, exhibition.endDate)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
};

export default async function GenerationDashboardPage({
  params,
}: Readonly<{
  params: Promise<{ generationName: string }>;
}>) {
  const generation = await requireDashboardGeneration(params);

  const items = [
    {
      title: "공지 관리",
      description: "이 기수 공지를 확인하고 새로 작성하거나 수정할 수 있습니다.",
      href: `${generation.path}/notices`,
    },
    {
      title: "활동 관리",
      description: "활동 내용을 등록하고 수정할 수 있습니다.",
      href: `${generation.path}/activities`,
    },
    {
      title: "전시 관리",
      description: "전시 정보를 등록하고 수정할 수 있습니다.",
      href: `${generation.path}/exhibitions`,
    },
    {
      title: "멤버 관리",
      description: "이 기수에 속한 멤버를 확인할 수 있습니다.",
      href: `${generation.path}/members`,
    },
  ];

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto grid w-full max-w-6xl gap-4">
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-600 dark:text-slate-300 uppercase">
            Generation Overview
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">
            {generation.name}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            활동 기간: {formatKoreanDateRange(generation.startDate, generation.endDate)}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 md:text-base">
            이 화면에서 공지, 최근 활동, 최근 전시 등 핵심 정보를 한 번에 확인할 수
            있습니다.
          </p>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
            최근 수정: {formatKoreanDate(generation.updatedAt)} ·{" "}
            {formatAuditActor(generation.updatedBy)}
          </p>
        </section>

        <Suspense
          fallback={
            <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
              <div className="space-y-4" aria-hidden="true">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={`generation-summary-skeleton-${index + 1}`}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4"
                    >
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="mt-2 h-7 w-14" />
                      <Skeleton className="mt-2 h-3 w-10" />
                    </div>
                  ))}
                </div>
                <Skeleton className="h-32 w-full" />
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                  <Skeleton className="h-52 w-full" />
                  <Skeleton className="h-52 w-full" />
                </div>
              </div>
            </section>
          }
        >
          <GenerationDashboardSummary
            generationId={generation.id}
            generationPath={generation.path}
          />
        </Suspense>

        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">바로가기</h2>
            <span className="text-xs text-slate-600 dark:text-slate-300">기수 관리 메뉴</span>
          </div>

          <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 transition hover:border-slate-300 hover:bg-white"
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{item.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {item.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
