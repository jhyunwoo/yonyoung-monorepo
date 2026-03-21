import Link from "next/link";
import { listCachedGlobalNotices } from "@/features/dashboard/cache/admin-dashboard-cache";
import { buildMemberDisplayName } from "@/features/dashboard/members/display-name";
import { readCookieHeader } from "@/shared/http/http";
import { formatKoreanDate } from "@/shared/utils/date-formatters";
import { normalizeNotices } from "@/app/(dashboard)/_components/notice-shared";

const GLOBAL_NOTICES_BASE_PATH = "/dashboard/settings/notices";
const MAX_RECENT_NOTICES = 5;

export default async function RecentGlobalNotices() {
  const cookieHeader = await readCookieHeader();
  const notices = normalizeNotices(await listCachedGlobalNotices(cookieHeader)).slice(
    0,
    MAX_RECENT_NOTICES,
  );

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">최근 전체 공지</h2>
        <Link
          href={GLOBAL_NOTICES_BASE_PATH}
          className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-50"
        >
          전체 공지 관리로 이동
        </Link>
      </div>

      {notices.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-4 text-sm text-slate-600 dark:text-slate-300">
          등록된 전체 공지가 없습니다.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {notices.map((notice) => (
            <li key={notice.id}>
              <Link
                href={`${GLOBAL_NOTICES_BASE_PATH}/${notice.id}`}
                className="block rounded-xl border border-slate-200 dark:border-slate-700 p-4 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{notice.title}</p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  작성일: {formatKoreanDate(notice.createdAt)} · 작성자:{" "}
                  {buildMemberDisplayName(notice.author)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
