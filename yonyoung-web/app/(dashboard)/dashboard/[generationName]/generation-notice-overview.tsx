import Link from "next/link";
import type {
  ApiGenerationNotice,
  ApiGlobalNotice,
} from "@/shared/contracts/api-contracts";
import { readCookieHeader } from "@/shared/http/http";
import {
  listCachedGenerationNotices,
  listCachedGlobalNotices,
} from "@/features/dashboard/cache/admin-dashboard-cache";
import { formatKoreanDate } from "@/shared/utils/date-formatters";

type GenerationNoticeOverviewProps = {
  generationId: string;
  generationPath: string;
};

export default async function GenerationNoticeOverview({
  generationId,
  generationPath,
}: GenerationNoticeOverviewProps) {
  const cookieHeader = await readCookieHeader();
  const [generationRows, globalRows] = await Promise.all([
    listCachedGenerationNotices(generationId, cookieHeader),
    listCachedGlobalNotices(cookieHeader),
  ]);
  const generationNotices: ApiGenerationNotice[] = generationRows.slice(0, 4);
  const globalNotices: ApiGlobalNotice[] = globalRows.slice(0, 4);

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">공지</h2>
        <Link
          href={`${generationPath}/notices`}
          className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-50"
        >
          기수 공지 화면으로 이동
        </Link>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">기수 공지</p>
          {generationNotices.length === 0 ? (
            <p className="mt-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-600 dark:text-slate-300">
              등록된 기수 공지가 없습니다.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {generationNotices.map((notice) => (
                <li
                  key={notice.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{notice.title}</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    작성일: {formatKoreanDate(notice.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">전체 공지</p>
          {globalNotices.length === 0 ? (
            <p className="mt-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-600 dark:text-slate-300">
              등록된 전체 공지가 없습니다.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {globalNotices.map((notice) => (
                <li
                  key={notice.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{notice.title}</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    작성일: {formatKoreanDate(notice.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
