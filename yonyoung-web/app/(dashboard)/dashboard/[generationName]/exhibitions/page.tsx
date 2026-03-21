import { Suspense } from "react";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { isAdminRole } from "@/features/auth/model/auth-shared";
import { Skeleton } from "@/components/ui/skeleton";
import GenerationExhibitionsList from "@/app/(dashboard)/dashboard/[generationName]/exhibitions/_components/generation-exhibitions-list";
import { requireDashboardGeneration } from "@/app/(dashboard)/dashboard/[generationName]/_lib/resolve-generation";

export default async function GenerationExhibitionsPage({
  params,
}: Readonly<{
  params: Promise<{ generationName: string }>;
}>) {
  const [generation, session] = await Promise.all([
    requireDashboardGeneration(params),
    serverAuthGuard.requireSession(),
  ]);

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
                    key={`generation-exhibition-list-skeleton-${index + 1}`}
                    className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
                  >
                    <Skeleton className="aspect-[4/3] w-full rounded-none" />
                    <div className="space-y-2 p-3">
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        }
      >
        <GenerationExhibitionsList
          generationId={generation.id}
          generationPath={generation.path}
          generationName={generation.name}
          canManage={isAdminRole(session.user.role)}
        />
      </Suspense>
    </main>
  );
}
