import { readDashboardRuntimeMeta } from "@/features/dashboard/system/dashboard-runtime-meta";

const koreanDateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const formatRuntimeUpdatedAt = (timestampMs: number | null): string => {
  if (timestampMs === null || !Number.isFinite(timestampMs)) {
    return "업데이트 정보 없음";
  }

  return koreanDateTimeFormatter.format(timestampMs);
};

export default async function DashboardRuntimeMeta() {
  const runtimeMeta = await readDashboardRuntimeMeta();

  return (
    <div className="mx-auto mt-6 flex w-full max-w-6xl flex-col gap-1 text-[11px] text-slate-500 dark:text-slate-400 md:text-xs">
      <p>
        WEB v{runtimeMeta.web.version} · 최근 업데이트{" "}
        {formatRuntimeUpdatedAt(runtimeMeta.web.updatedAt)}
      </p>
      <p>
        API v{runtimeMeta.api.version} · 최근 업데이트{" "}
        {formatRuntimeUpdatedAt(runtimeMeta.api.updatedAt)}
      </p>
    </div>
  );
}
