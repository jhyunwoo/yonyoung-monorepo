import Image from "next/image";
import Link from "next/link";
import { readCookieHeader } from "@/shared/http/http";
import { listCachedActivities } from "@/features/dashboard/cache/admin-dashboard-cache";
import { formatAuditActor } from "@/features/dashboard/ui/audit-display";
import { formatKoreanDate, formatKoreanDateRange } from "@/shared/utils/date-formatters";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";
import {
  sortActivitiesByStartDateDesc,
  summarizeActivityDescription,
} from "@/app/(dashboard)/dashboard/[generationName]/activities/_components/activity-shared";

type GenerationActivitiesListProps = {
  generationId: string;
  generationPath: string;
  generationName: string;
  canManage: boolean;
};

export default async function GenerationActivitiesList({
  generationId,
  generationPath,
  generationName,
  canManage,
}: GenerationActivitiesListProps) {
  const cookieHeader = await readCookieHeader();
  const activities = sortActivitiesByStartDateDesc(
    await listCachedActivities(generationId, cookieHeader),
  );

  return (
    <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-600 dark:text-slate-300 uppercase">
            Activities
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">
            {generationName} 활동 관리
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 md:text-base">
            {canManage
              ? "이 기수의 활동을 확인하고 필요할 때 새 활동을 등록할 수 있습니다."
              : "이 기수의 활동을 조회할 수 있습니다."}
          </p>
        </div>
        {canManage ? (
          <Link
            href={`${generationPath}/activities/new`}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            활동 추가
          </Link>
        ) : null}
      </div>

      {!canManage ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
          일반 멤버는 활동을 조회만 할 수 있습니다.
        </p>
      ) : null}

      {activities.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-6 text-sm text-slate-600 dark:text-slate-300">
          현재 기수에 등록된 활동이 없습니다.
        </p>
      ) : (
        <ul
          className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          data-testid="generation-activities-list"
        >
          {activities.map((activity) => (
            <li key={activity.id}>
              <Link
                href={`${generationPath}/activities/${activity.id}`}
                className="block overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition hover:border-slate-300 hover:shadow-sm"
                data-testid={`generation-activity-card-${activity.id}`}
              >
                <div className="relative aspect-[4/3] w-full bg-slate-100 dark:bg-slate-700">
                  <Image
                    src={activity.coverImageUrl}
                    alt={activity.title}
                    fill
                    className="object-cover"
                    unoptimized={shouldUseUnoptimizedImage(activity.coverImageUrl)}
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  />
                </div>
                <div className="p-4">
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-50">
                    {activity.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    {formatKoreanDateRange(activity.startDate, activity.endDate)}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {summarizeActivityDescription(activity.description)}
                  </p>
                  <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                    최근 수정: {formatKoreanDate(activity.updatedAt)} ·{" "}
                    {formatAuditActor(activity.updatedBy)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
