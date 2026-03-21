import Link from "next/link";
import {
  flattenLinktreeItems,
  listPublicLinktrees,
  safeList,
} from "@/features/public/services/public-read-service";

export default async function DashboardLinktreeOverview() {
  const linktrees = await safeList(listPublicLinktrees, []);
  const visibleGroups = linktrees.filter((group) => group.items.length > 0);
  const totalLinkCount = flattenLinktreeItems(visibleGroups).length;

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:p-8"
      data-testid="dashboard-linktree-overview"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
            Linktree
          </p>
          <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-50">
            현재 등록된 전체 링크
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            홈페이지 Linktree에 노출되는 외부 링크를 한곳에서 빠르게 확인할 수 있습니다.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            그룹 {visibleGroups.length}개 · 링크 {totalLinkCount}개
          </span>
          <Link
            href="/linktree"
            className="text-xs font-semibold text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-50"
          >
            Linktree 전체 페이지 보기
          </Link>
        </div>
      </div>

      {visibleGroups.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
          현재 등록된 Linktree 링크가 없습니다.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {visibleGroups.map((group) => (
            <article
              key={group.id}
              className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  {group.name}
                </h3>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {group.items.length}개 링크
                </span>
              </div>

              <ul className="mt-4 space-y-2">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                    >
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {item.name}
                      </p>
                      <p className="mt-1 break-all text-xs text-slate-600 dark:text-slate-300">
                        {item.link}
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
