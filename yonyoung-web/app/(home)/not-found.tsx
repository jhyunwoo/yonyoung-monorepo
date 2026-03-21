import Link from "next/link";

export default function HomeNotFoundPage() {
  return (
    <section
      className="px-4 pb-16 pt-10 md:px-8 md:pb-20"
      data-testid="home-not-found-page"
    >
      <div className="mx-auto w-full max-w-[1200px] border border-(--surface-border) p-7 md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--text-muted)">
          404 Not Found
        </p>
        <h1 className="mt-3 text-[2.2rem] leading-tight font-semibold text-(--text-primary) md:text-[2.8rem]">
          찾으시는 페이지가 없습니다.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-(--text-muted) md:text-base">
          주소가 잘못 입력되었거나, 페이지가 이동 또는 삭제되었을 수 있습니다.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex border border-(--surface-strong-border) bg-(--text-primary) px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            홈으로 이동
          </Link>
          <Link
            href="/archive/records"
            className="inline-flex border border-(--surface-strong-border) px-4 py-2 text-sm font-semibold text-(--text-primary) transition hover:bg-(--surface-muted)"
          >
            아카이브 보기
          </Link>
        </div>
      </div>
    </section>
  );
}
