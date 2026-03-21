import { Skeleton } from "@/components/ui/skeleton";

export default function AuthProfileLoading() {
  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <section className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
        <div className="space-y-3" aria-hidden="true">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-3 w-full max-w-lg" />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton
                key={`auth-profile-loading-field-${index + 1}`}
                className="h-10 w-full"
              />
            ))}
          </div>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-28" />
        </div>
      </section>
    </main>
  );
}
