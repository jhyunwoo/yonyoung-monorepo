import { Suspense } from "react";
import NoticeManager from "@/app/(dashboard)/_components/notice-manager";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { isPresidentOrVicePresidentRole } from "@/features/auth/model/auth-shared";
import { Skeleton } from "@/components/ui/skeleton";

export default async function SettingsNoticesPage() {
  const session = await serverAuthGuard.requireSession();
  const noticesBasePath = "/dashboard/settings/notices";

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <Suspense
        fallback={
          <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
            <div className="space-y-3" aria-hidden="true">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-full max-w-xl" />
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`settings-notice-skeleton-${index + 1}`}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 p-3"
                >
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="mt-2 h-3 w-full" />
                  <Skeleton className="mt-1 h-3 w-1/4" />
                </div>
              ))}
            </div>
          </section>
        }
      >
        <NoticeManager
          scope="global"
          canWrite={isPresidentOrVicePresidentRole(session.user.role)}
          heading="전체 공지"
          description="최근 공지를 확인하고 제목을 눌러 자세한 내용을 볼 수 있습니다."
          emptyMessage="등록된 전체 공지가 없습니다."
          basePath={noticesBasePath}
          createPath={`${noticesBasePath}/new`}
        />
      </Suspense>
    </main>
  );
}
