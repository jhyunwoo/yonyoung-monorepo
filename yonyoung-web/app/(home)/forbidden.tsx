import Link from "next/link";

export default function HomeForbiddenPage() {
  return (
    <section
      className="px-4 pb-16 pt-10 md:px-8 md:pb-20"
      data-testid="home-forbidden-page"
    >
      <div className="mx-auto w-full max-w-[1200px] border border-(--surface-border) p-7 md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--text-muted)">
          403 Forbidden
        </p>
        <h1 className="mt-3 text-[2.2rem] leading-tight font-semibold text-(--text-primary) md:text-[2.8rem]">
          이 페이지에 접근할 수 없습니다.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-(--text-muted) md:text-base">
          요청하신 페이지는 현재 계정 권한으로 접근할 수 없습니다. 권한이 필요하다면
          운영진에게 문의해 주세요.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex border border-(--surface-strong-border) bg-(--text-primary) px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            홈으로 이동
          </Link>
          <Link
            href="/auth/sign-in"
            className="inline-flex border border-(--surface-strong-border) px-4 py-2 text-sm font-semibold text-(--text-primary) transition hover:bg-(--surface-muted)"
          >
            로그인 페이지
          </Link>
        </div>
      </div>
    </section>
  );
}
