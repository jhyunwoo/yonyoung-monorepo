export default function HomeLoading() {
  const pulse = "animate-pulse bg-(--surface-muted)";

  return (
    <div className="pb-14 md:pb-20" data-testid="home-loading">
      <p className="sr-only" role="status" aria-live="polite">
        페이지를 불러오는 중입니다.
      </p>

      <section className="relative border-b border-(--surface-border) bg-(--surface-elevated) px-4 pb-16 pt-14 md:px-8 md:pb-20 md:pt-16">
        <div className="mx-auto grid w-full max-w-[1200px] gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-end">
          <div>
            <div className={`h-4 w-52 ${pulse}`} />
            <div className={`mt-4 h-20 w-64 md:h-28 md:w-80 ${pulse}`} />
            <div className={`mt-5 h-5 w-full max-w-xl ${pulse}`} />
            <div className={`mt-2 h-5 w-full max-w-md ${pulse}`} />
            <div className="mt-8 flex flex-wrap gap-3">
              <div
                className={`h-12 w-40 border border-(--surface-strong-border) ${pulse}`}
              />
              <div
                className={`h-12 w-40 border border-(--surface-strong-border) ${pulse}`}
              />
            </div>
          </div>

          <div className="space-y-4">
            <article className="overflow-hidden border border-(--surface-strong-border) bg-(--surface-elevated)">
              <div className={`aspect-4/3 ${pulse}`} />
              <div className="space-y-2 p-5">
                <div className={`h-3 w-32 ${pulse}`} />
                <div className={`h-8 w-2/3 ${pulse}`} />
                <div className={`h-4 w-4/5 ${pulse}`} />
              </div>
            </article>

            <div className="grid grid-cols-2 gap-3">
              <div className="border border-(--surface-border) bg-(--surface-elevated) p-4">
                <div className={`h-3 w-28 ${pulse}`} />
                <div className={`mt-3 h-5 w-3/4 ${pulse}`} />
              </div>
              <div className="border border-(--surface-border) bg-(--surface-elevated) p-4">
                <div className={`h-3 w-16 ${pulse}`} />
                <div className={`mt-3 h-9 w-20 ${pulse}`} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:px-8 md:py-16">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="mb-10 text-center md:mb-12">
            <div className={`mx-auto h-3 w-28 ${pulse}`} />
            <div className={`mx-auto mt-4 h-10 w-64 md:w-80 ${pulse}`} />
            <div className={`mx-auto mt-4 h-4 w-full max-w-lg ${pulse}`} />
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <article
                key={`home-loading-activity-${index}`}
                className="overflow-hidden border border-(--surface-strong-border) bg-(--surface-elevated)"
              >
                <div className={`aspect-4/3 ${pulse}`} />
                <div className="space-y-2 p-5">
                  <div className={`h-3 w-32 ${pulse}`} />
                  <div className={`h-7 w-3/4 ${pulse}`} />
                  <div className={`h-4 w-full ${pulse}`} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:px-8 md:py-16">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="mb-10 text-center md:mb-12">
            <div className={`mx-auto h-3 w-24 ${pulse}`} />
            <div className={`mx-auto mt-4 h-10 w-52 md:w-64 ${pulse}`} />
            <div className={`mx-auto mt-4 h-4 w-full max-w-lg ${pulse}`} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <article
                key={`home-loading-link-${index}`}
                className="border border-(--surface-border) bg-(--surface-elevated) p-4"
              >
                <div className={`h-3 w-20 ${pulse}`} />
                <div className={`mt-3 h-6 w-3/4 ${pulse}`} />
                <div className={`mt-2 h-3 w-full ${pulse}`} />
              </article>
            ))}
          </div>

          <div className="mt-8 border border-(--surface-strong-border) bg-(--surface-elevated) p-6 text-center">
            <div className={`mx-auto h-4 w-full max-w-lg ${pulse}`} />
            <div
              className={`mx-auto mt-4 h-11 w-44 border border-(--surface-strong-border) ${pulse}`}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
