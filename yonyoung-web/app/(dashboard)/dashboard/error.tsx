"use client";

import { useEffect } from "react";

type DashboardErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardErrorPage({ error, reset }: DashboardErrorPageProps) {
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
    <main className="px-4 py-6 md:px-8 md:py-8" data-testid="dashboard-error-page">
      <div className="mx-auto w-full max-w-6xl rounded-2xl border border-red-200 bg-red-50 p-6 md:p-8">
        <p className="text-xs font-semibold tracking-[0.12em] text-red-600 uppercase">
          Dashboard Error
        </p>
        <h1 className="mt-2 text-2xl font-bold text-red-900 md:text-3xl">
          대시보드 정보를 불러오지 못했습니다.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-red-700 md:text-base">
          네트워크 상태를 확인한 뒤 다시 시도해 주세요.
        </p>
        <button
          type="button"
          data-testid="dashboard-error-reset"
          onClick={reset}
          className="mt-6 inline-flex rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
        >
          다시 시도
        </button>
      </div>
    </main>
  );
}
