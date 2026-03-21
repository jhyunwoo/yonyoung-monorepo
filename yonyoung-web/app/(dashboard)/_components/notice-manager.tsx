import Link from "next/link";
import { formatKoreanDate } from "@/shared/utils/date-formatters";
import { readCookieHeader } from "@/shared/http/http";
import {
  listCachedGenerationNotices,
  listCachedGlobalNotices,
} from "@/features/dashboard/cache/admin-dashboard-cache";
import {
  normalizeNotices,
  type NoticeItem,
  type NoticeScope,
} from "@/app/(dashboard)/_components/notice-shared";

type NoticeManagerProps = {
  scope: NoticeScope;
  generationId?: string;
  maxItems?: number;
  canWrite: boolean;
  heading: string;
  description: string;
  emptyMessage: string;
  basePath: string;
  createPath: string;
};

const truncateNoticeTitle = (title: string): string => {
  const maxLength = 48;
  if (title.length <= maxLength) {
    return title;
  }

  return `${title.slice(0, maxLength - 1)}…`;
};

export default async function NoticeManager({
  scope,
  generationId,
  maxItems,
  canWrite,
  heading,
  description,
  emptyMessage,
  basePath,
  createPath,
}: NoticeManagerProps) {
  const cookieHeader = await readCookieHeader();
  const readOnlyMessage =
    scope === "global"
      ? "전체 공지는 회장과 부회장만 등록, 수정할 수 있고 삭제는 회장만 가능합니다."
      : "이 기수 공지는 회장, 부회장, 부장만 등록, 수정, 삭제할 수 있습니다.";
  const generationIdOrNull = scope === "generation" ? (generationId ?? null) : null;
  let notices: NoticeItem[] = [];

  if (scope === "generation") {
    if (generationIdOrNull) {
      notices = normalizeNotices(
        await listCachedGenerationNotices(generationIdOrNull, cookieHeader),
      );
    }
  } else {
    notices = normalizeNotices(await listCachedGlobalNotices(cookieHeader));
  }
  const visibleNotices =
    typeof maxItems === "number" && Number.isFinite(maxItems) && maxItems >= 0
      ? notices.slice(0, maxItems)
      : notices;

  return (
    <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-600 dark:text-slate-300 uppercase">
        Notices
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">{heading}</h1>
        {canWrite ? (
          <Link
            href={createPath}
            className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            공지 추가
          </Link>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 md:text-base">
        {description}
      </p>

      {!canWrite ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
          {readOnlyMessage}
        </p>
      ) : null}

      {visibleNotices.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-6 text-sm text-slate-600 dark:text-slate-300">
          {emptyMessage}
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {visibleNotices.map((notice) => (
            <li key={notice.id}>
              <Link
                href={`${basePath}/${notice.id}`}
                className="block rounded-xl border border-slate-200 dark:border-slate-700 p-4 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-50">
                    {truncateNoticeTitle(notice.title)}
                  </p>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">상세 보기</span>
                </div>
                <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                  작성일: {formatKoreanDate(notice.createdAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
