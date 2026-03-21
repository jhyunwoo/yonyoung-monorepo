"use client";

import { useEffect } from "react";

type HomeErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function HomeErrorPage({ error, reset }: HomeErrorPageProps) {
  useEffect(() => {
    navigator.sendBeacon(
      "/api/internal/client-error",
      new Blob(
        [
          JSON.stringify({
            event: "client.error",
            path: window.location.pathname,
            message: error.message,
            stack: error.stack,
            sampledAt: Date.now(),
          }),
        ],
        { type: "application/json; charset=UTF-8" },
      ),
    );
  }, [error]);

  return (
    <section className="px-4 pb-16 pt-10 md:px-8 md:pb-20" data-testid="home-error-page">
      <div className="mx-auto w-full max-w-[1200px] border border-(--surface-border) p-7 md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--text-muted)">
          Error
        </p>
        <h1 className="mt-3 text-[2.2rem] leading-tight font-semibold text-(--text-primary) md:text-[2.8rem]">
          페이지를 불러오는 중 오류가 발생했습니다.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-(--text-muted) md:text-base">
          잠시 후 다시 시도해 주세요. 문제가 반복되면 운영진에게 문의해 주세요.
        </p>
        <button
          type="button"
          data-testid="home-error-reset"
          onClick={reset}
          className="mt-8 inline-flex border border-(--surface-strong-border) bg-(--text-primary) px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          다시 시도
        </button>
      </div>
    </section>
  );
}
