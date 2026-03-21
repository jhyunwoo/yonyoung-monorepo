import { Skeleton } from "@/components/ui/skeleton";

export default function GenerationDashboardLoading() {
  return (
    <main
      className="px-4 py-6 md:px-8 md:py-8"
      data-testid="generation-dashboard-loading"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-4">
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-3 h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-80" />
          <Skeleton className="mt-2 h-4 w-full max-w-xl" />
        </section>

        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`generation-route-card-loading-${index + 1}`}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4"
              >
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-2 h-7 w-16" />
                <Skeleton className="mt-2 h-3 w-12" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-4 h-40 w-full" />
        </section>
      </div>
    </main>
  );
}
