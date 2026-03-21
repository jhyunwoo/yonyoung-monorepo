"use client";

import { useEffect, useState } from "react";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import type { ApiAuditLog, ApiAuditResourceType } from "@/shared/contracts/api-contracts";
import { formatKoreanDate } from "@/shared/utils/date-formatters";
import {
  formatAuditActionLabel,
  formatAuditActor,
} from "@/features/dashboard/ui/audit-display";
import { Skeleton } from "@/components/ui/skeleton";

type AuditHistoryPanelProps = {
  resourceType: ApiAuditResourceType;
  resourceId: string;
  limit?: number;
  title?: string;
};

export default function AuditHistoryPanel({
  resourceType,
  resourceId,
  limit = 20,
  title = "변경 이력",
}: AuditHistoryPanelProps) {
  const [logs, setLogs] = useState<ApiAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadLogs = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const data = await adminResourceApi.listAuditLogs(
          resourceType,
          resourceId,
          limit,
        );
        if (!isMounted) {
          return;
        }
        setLogs(data);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setLogs([]);
        setErrorMessage(
          error instanceof Error ? error.message : "변경 이력을 불러오지 못했습니다.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadLogs();

    return () => {
      isMounted = false;
    };
  }, [limit, resourceId, resourceType]);

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</h3>

      {isLoading ? (
        <div className="mt-3 space-y-2" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`audit-history-skeleton-${index + 1}`}
              className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
            >
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="mt-2 h-3 w-1/2" />
              <Skeleton className="mt-2 h-3 w-4/5" />
            </div>
          ))}
        </div>
      ) : errorMessage ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {errorMessage}
        </p>
      ) : logs.length === 0 ? (
        <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">기록된 변경 이력이 없습니다.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {logs.map((log) => (
            <li
              key={log.id}
              className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
            >
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {formatAuditActionLabel(log.action)} · {formatKoreanDate(log.createdAt)}
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                수정자: {formatAuditActor(log.actor)}
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                변경 필드:{" "}
                {log.changedFields.length > 0 ? log.changedFields.join(", ") : "-"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
