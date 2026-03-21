"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type {
  ApiUser,
  ApiUserResourceHistory,
  ApiUserResourceHistoryItem,
} from "@/shared/contracts/api-contracts";
import { AdminApiError } from "@/shared/http/http";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import { formatKoreanDate } from "@/shared/utils/date-formatters";
import { buildDashboardGenerationPath } from "@/features/dashboard/generation/dashboard-generation-route";
import {
  buildMemberDisplayInitial,
  buildMemberDisplayName,
} from "@/features/dashboard/members/display-name";
import { readMemberGenerationNameText } from "@/features/dashboard/members/member-directory";
import {
  buildMemberRoleLabel,
  canEditMemberProfile,
} from "@/features/dashboard/members/member-role-label";
import { Skeleton } from "@/components/ui/skeleton";
import LastUpdatedMeta from "@/app/(dashboard)/_components/last-updated-meta";
import MemberEditForm from "@/app/(dashboard)/_components/member-edit-form";

type MemberDetailClientProps = {
  memberId: string;
  viewerRole: string | null;
};

const HISTORY_PAGE_SIZE = 10;

const readErrorMessage = (error: unknown): string => {
  if (error instanceof AdminApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "멤버 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
};

const readHistoryResourceLabel = (
  resourceType: ApiUserResourceHistoryItem["resourceType"],
): string => {
  switch (resourceType) {
    case "activity":
      return "활동";
    case "exhibition":
      return "전시";
    case "generation_notice":
      return "기수 공지";
    case "global_notice":
      return "전체 공지";
    case "linktree":
      return "링크 모음";
    case "linktree_item":
      return "링크 모음 항목";
    default:
      return resourceType;
  }
};

const readHistoryActionLabel = (action: ApiUserResourceHistoryItem["action"]): string => {
  switch (action) {
    case "create":
      return "생성";
    case "update":
      return "수정";
    case "delete":
      return "삭제";
    default:
      return action;
  }
};

const resolveHistoryPath = (
  item: ApiUserResourceHistoryItem,
  generationNamesById: Record<string, string>,
): string | null => {
  switch (item.resourceType) {
    case "global_notice":
      return `/dashboard/settings/notices/${item.resourceId}`;
    case "linktree":
      return `/dashboard/settings/linktree/${item.resourceId}`;
    case "linktree_item":
      return item.linktreeId
        ? `/dashboard/settings/linktree/${item.linktreeId}/items/${item.resourceId}`
        : null;
    case "activity":
    case "exhibition":
    case "generation_notice": {
      if (!item.generationId) {
        return null;
      }
      const generationName = generationNamesById[item.generationId];
      if (!generationName) {
        return null;
      }

      const generationPath = buildDashboardGenerationPath({ name: generationName });
      if (item.resourceType === "activity") {
        return `${generationPath}/activities/${item.resourceId}`;
      }
      if (item.resourceType === "exhibition") {
        return `${generationPath}/exhibitions/${item.resourceId}`;
      }
      return `${generationPath}/notices/${item.resourceId}`;
    }
    default:
      return null;
  }
};

const HistoryList = (input: {
  items: ApiUserResourceHistoryItem[];
  generationNamesById: Record<string, string>;
  emptyMessage: string;
}) => {
  if (input.items.length === 0) {
    return (
      <p className="mt-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
        {input.emptyMessage}
      </p>
    );
  }

  return (
    <ul className="mt-3 space-y-2">
      {input.items.map((item) => {
        const path = resolveHistoryPath(item, input.generationNamesById);
        const title = item.resourceTitle ?? "이름 미확인 리소스";
        const resourceLabel = readHistoryResourceLabel(item.resourceType);
        const actionLabel = readHistoryActionLabel(item.action);

        return (
          <li
            key={item.id}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                {resourceLabel}
              </span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {actionLabel}
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-300">
                {formatKoreanDate(item.createdAt)}
              </span>
              {item.isDeleted ? (
                <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                  삭제됨
                </span>
              ) : null}
            </div>

            <p className="mt-2 text-sm text-slate-900 dark:text-slate-50">
              {path ? (
                <Link
                  href={path}
                  className="font-semibold text-slate-800 hover:text-slate-950"
                >
                  {title}
                </Link>
              ) : (
                <span className="font-semibold text-slate-800">{title}</span>
              )}
            </p>

            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              변경 필드:{" "}
              {item.changedFields.length > 0 ? item.changedFields.join(", ") : "-"}
            </p>
          </li>
        );
      })}
    </ul>
  );
};

const HistoryListSkeleton = () => (
  <div className="mt-3 space-y-2" aria-hidden="true">
    {Array.from({ length: 3 }).map((_, index) => (
      <div
        key={`settings-member-history-skeleton-${index + 1}`}
        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="mt-3 h-5 w-2/3" />
        <Skeleton className="mt-2 h-4 w-1/2" />
      </div>
    ))}
  </div>
);

type PaginatedHistorySectionProps = {
  memberId: string;
  title: string;
  emptyMessage: string;
  generationNamesById: Record<string, string>;
  action?: ApiUserResourceHistoryItem["action"];
  description: string;
  testId: string;
};

const PaginatedHistorySection = ({
  memberId,
  title,
  emptyMessage,
  generationNamesById,
  action,
  description,
  testId,
}: PaginatedHistorySectionProps) => {
  const [history, setHistory] = useState<ApiUserResourceHistory | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await adminResourceApi.getUserResourceHistory(memberId, {
          page,
          pageSize: HISTORY_PAGE_SIZE,
          ...(action ? { action } : {}),
        });

        if (!isMounted) {
          return;
        }

        setHistory(response);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(readErrorMessage(error));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [action, memberId, page]);

  const items = history?.items ?? [];
  const total = history?.total ?? 0;
  const totalPages = history?.totalPages ?? 0;
  const startItemNumber = total === 0 ? 0 : (page - 1) * HISTORY_PAGE_SIZE + 1;
  const endItemNumber = total === 0 ? 0 : startItemNumber + Math.max(0, items.length - 1);

  return (
    <section
      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"
      data-testid={testId}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            {title}
          </h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{description}</p>
        </div>
        {history ? (
          <p className="text-xs text-slate-600 dark:text-slate-300">
            총 {total}건
            {items.length > 0 ? ` · ${startItemNumber}-${endItemNumber}건 표시 중` : ""}
          </p>
        ) : null}
      </div>

      {isLoading && !history ? <HistoryListSkeleton /> : null}

      {errorMessage ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {!errorMessage && history ? (
        <>
          <HistoryList
            items={items}
            generationNamesById={generationNamesById}
            emptyMessage={emptyMessage}
          />

          {items.length > 0 && totalPages > 1 ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                페이지 {page} / {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                  disabled={page <= 1 || isLoading}
                  className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  이전
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPage((currentPage) => Math.min(totalPages, currentPage + 1))
                  }
                  disabled={page >= totalPages || isLoading}
                  className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  다음
                </button>
              </div>
            </div>
          ) : null}

          {isLoading ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              페이지를 불러오는 중입니다.
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
};

export default function MemberDetailClient({
  memberId,
  viewerRole,
}: MemberDetailClientProps) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [generationNamesById, setGenerationNamesById] = useState<Record<string, string>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const canEdit = canEditMemberProfile(viewerRole);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [targetUser, generations] = await Promise.all([
          adminResourceApi.getUserById(memberId),
          adminResourceApi.listGenerations(),
        ]);

        if (!isMounted) {
          return;
        }

        const nextGenerationNamesById = generations.reduce<Record<string, string>>(
          (acc, item) => {
            acc[item.id] = item.name;
            return acc;
          },
          {},
        );

        setUser(targetUser);
        setGenerationNamesById(nextGenerationNamesById);
        setIsEditing(false);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setUser(null);
        setErrorMessage(readErrorMessage(error));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [memberId]);

  if (isLoading) {
    return (
      <main className="px-4 py-6 md:px-8 md:py-8">
        <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
          <div className="space-y-4" aria-hidden="true">
            <Skeleton className="h-4 w-32" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-44" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 9 }).map((_, index) => (
                  <div
                    key={`settings-member-detail-skeleton-${index + 1}`}
                    className="space-y-2"
                  >
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (errorMessage || !user) {
    return (
      <main className="px-4 py-6 md:px-8 md:py-8">
        <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
          <p className="text-sm text-red-700">
            {errorMessage ?? "멤버 정보를 찾을 수 없습니다."}
          </p>
          <Link
            href="/dashboard/settings/members"
            className="mt-4 inline-flex text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-slate-50"
          >
            멤버 목록으로 돌아가기
          </Link>
        </section>
      </main>
    );
  }

  const displayName = buildMemberDisplayName(user);
  const avatarFallback = buildMemberDisplayInitial(displayName);
  const roleLabel = buildMemberRoleLabel(user.role);

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto grid w-full max-w-6xl gap-4">
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
          <Link
            href="/dashboard/settings/members"
            className="text-xs font-semibold tracking-[0.12em] text-slate-600 dark:text-slate-300 uppercase hover:text-slate-700 dark:hover:text-slate-200"
          >
            Settings / Members
          </Link>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={`${displayName} 프로필 이미지`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-base font-semibold text-slate-600 dark:text-slate-300">
                  {avatarFallback}
                </div>
              )}
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">
                {displayName}
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                전체 멤버 상세
              </p>
            </div>

            {canEdit && !isEditing ? (
              <button
                type="button"
                data-testid="settings-member-detail-edit-toggle"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                수정
              </button>
            ) : null}
          </div>

          {isEditing && canEdit ? (
            <MemberEditForm
              user={user}
              inline
              onCancel={() => setIsEditing(false)}
              onSaved={(updated) => {
                setUser(updated);
                setIsEditing(false);
              }}
            />
          ) : (
            <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                전체 정보
              </h2>
              <dl className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div>
                  <dt className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    회원 구분
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900 dark:text-slate-50">
                    {roleLabel}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    이메일
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900 dark:text-slate-50">
                    {user.email}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    성
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900 dark:text-slate-50">
                    {user.familyName ?? "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    이름
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900 dark:text-slate-50">
                    {user.givenName ?? "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    대학
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900 dark:text-slate-50">
                    {user.college ?? "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    학과
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900 dark:text-slate-50">
                    {user.department ?? "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    학번
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900 dark:text-slate-50">
                    {user.studentNumber ?? "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    전화번호
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900 dark:text-slate-50">
                    {user.phoneNumber ?? "-"}
                  </dd>
                </div>
                <div className="md:col-span-2 xl:col-span-3">
                  <dt className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    소속 기수
                  </dt>
                  <dd className="mt-1 break-all text-sm text-slate-900 dark:text-slate-50">
                    {readMemberGenerationNameText(user, generationNamesById)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    생성일
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900 dark:text-slate-50">
                    {formatKoreanDate(user.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    수정일
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900 dark:text-slate-50">
                    {formatKoreanDate(user.updatedAt)}
                  </dd>
                </div>
                <div className="md:col-span-2 xl:col-span-3">
                  <dt className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    최근 수정
                  </dt>
                  <dd className="mt-1">
                    <LastUpdatedMeta
                      updatedAt={user.updatedAt}
                      updatedBy={user.updatedBy}
                      className="text-sm text-slate-900 dark:text-slate-50"
                    />
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </section>

        <PaginatedHistorySection
          key={`written-history-${memberId}`}
          memberId={memberId}
          title="작성한 글"
          description="작성 이력을 최신순으로 10개씩 확인할 수 있습니다."
          generationNamesById={generationNamesById}
          action="create"
          emptyMessage="작성한 글 이력이 없습니다."
          testId="settings-member-detail-written-history"
        />

        <PaginatedHistorySection
          key={`modified-history-${memberId}`}
          memberId={memberId}
          title="수정한 게시물 목록"
          description="수정/생성/삭제 이력을 최신순으로 10개씩 넘겨 볼 수 있습니다."
          generationNamesById={generationNamesById}
          emptyMessage="수정/생성/삭제 이력이 없습니다."
          testId="settings-member-detail-modified-history"
        />
      </div>
    </main>
  );
}
