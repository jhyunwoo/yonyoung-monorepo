"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ApiGenerationMemberSummary } from "@/shared/contracts/api-contracts";
import { AdminApiError } from "@/shared/http/http";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import {
  buildMemberDisplayInitial,
  buildMemberDisplayName,
} from "@/features/dashboard/members/display-name";
import { buildMemberRoleLabel } from "@/features/dashboard/members/member-role-label";
import { Skeleton } from "@/components/ui/skeleton";

type MembersGridProps = {
  generationId: string;
  generationPath: string;
};

const readErrorMessage = (error: unknown): string => {
  if (error instanceof AdminApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "멤버 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
};

export default function MembersGrid({ generationId, generationPath }: MembersGridProps) {
  const [members, setMembers] = useState<ApiGenerationMemberSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadMembers = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const rows = await adminResourceApi.listGenerationMembers(generationId);
        if (!isMounted) {
          return;
        }

        setMembers(rows);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMembers([]);
        setErrorMessage(readErrorMessage(error));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadMembers();

    return () => {
      isMounted = false;
    };
  }, [generationId]);

  if (isLoading) {
    return (
      <ul
        className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        aria-hidden="true"
      >
        {Array.from({ length: 8 }).map((_, index) => (
          <li key={`generation-members-skeleton-${index + 1}`}>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (errorMessage) {
    return (
      <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {errorMessage}
      </p>
    );
  }

  if (members.length === 0) {
    return (
      <p className="mt-6 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-4 text-sm text-slate-600 dark:text-slate-300">
        현재 기수에 등록된 멤버가 없습니다.
      </p>
    );
  }

  return (
    <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {members.map((member) => {
        const displayName = buildMemberDisplayName(member);
        const avatarFallback = buildMemberDisplayInitial(displayName);
        const roleLabel = buildMemberRoleLabel(member.role);

        return (
          <li key={member.id}>
            <Link
              href={`${generationPath}/members/${encodeURIComponent(member.id)}`}
              className="block rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 transition hover:border-slate-300 hover:bg-white"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700">
                  {member.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.image}
                      alt={`${displayName} 프로필 이미지`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {avatarFallback}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {displayName}
                  </p>
                  <p className="truncate text-xs text-slate-600 dark:text-slate-300">
                    {member.department?.trim() || "학과 미등록"}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1 text-slate-600 dark:text-slate-300">
                  {roleLabel}
                </span>
                <span className="text-slate-600 dark:text-slate-300">상세 보기</span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
