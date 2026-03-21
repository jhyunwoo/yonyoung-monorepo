import Link from "next/link";

export default function DashboardForbiddenPage() {
  return (
    <main className="px-4 py-6 md:px-8 md:py-8" data-testid="dashboard-forbidden-page">
      <div className="mx-auto grid w-full max-w-6xl gap-4">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-5 dark:border-slate-700 dark:bg-slate-800/70 md:px-8">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-600 uppercase dark:text-slate-300">
              403 Forbidden
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">
              이 기능에 접근할 권한이 없습니다.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 md:text-base">
              현재 계정으로는 요청하신 대시보드 화면을 열 수 없습니다. 역할 권한을 다시
              확인하거나 필요한 경우 운영진에게 접근 권한을 요청해 주세요.
            </p>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-[minmax(0,1fr)_18rem] md:p-8">
            <div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  권한이 필요한 화면입니다.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-amber-800 dark:text-amber-200">
                  일부 설정과 관리 메뉴는 회장단 또는 사용자 관리 권한이 있는 계정만
                  사용할 수 있습니다.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  대시보드 홈으로 이동
                </Link>
                <Link
                  href="/auth/profile"
                  className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  내 계정 정보 확인
                </Link>
              </div>
            </div>

            <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-600 uppercase dark:text-slate-300">
                안내
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <li>왼쪽 메뉴에서 접근 가능한 다른 화면으로 이동해 주세요.</li>
                <li>현재 역할에 맞는 권한이 있는지 프로필과 계정을 확인해 주세요.</li>
                <li>권한이 필요하면 운영진에게 계정 역할을 문의해 주세요.</li>
              </ul>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
