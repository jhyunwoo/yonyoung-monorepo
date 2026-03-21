import { Suspense } from "react";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { isAdminRole } from "@/features/auth/model/auth-shared";
import { Skeleton } from "@/components/ui/skeleton";
import GenerationActivitiesList from "@/app/(dashboard)/dashboard/[generationName]/activities/_components/generation-activities-list";
import { requireDashboardGeneration } from "@/app/(dashboard)/dashboard/[generationName]/_lib/resolve-generation";

export default async function GenerationActivitiesPage({
  params,
}: Readonly<{
  params: Promise<{ generationName: string }>;
}>) {
  const [generation, session] = await Promise.all([
    requireDashboardGeneration(params),
    serverAuthGuard.requireSession(),
  ]);
  const canManage = isAdminRole(session.user.role);

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <Suspense
        fallback={
          <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
            <div className="space-y-3" aria-hidden="true">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full max-w-xl" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`generation-activity-list-skeleton-${index + 1}`}
                    className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
                  >
                    <Skeleton className="aspect-[4/3] w-full rounded-none" />
                    <div className="space-y-2 p-3">
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        }
      >
        <GenerationActivitiesList
          generationId={generation.id}
          generationPath={generation.path}
          generationName={generation.name}
          canManage={canManage}
        />
      </Suspense>
    </main>
  );
}
