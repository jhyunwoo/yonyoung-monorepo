"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type {
  ApiGenerationMemberSummary,
  ApiUser,
} from "@/shared/contracts/api-contracts";
import { AdminApiError } from "@/shared/http/http";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import { formatKoreanDate } from "@/shared/utils/date-formatters";
import {
  buildMemberDisplayInitial,
  buildMemberDisplayName,
} from "@/features/dashboard/members/display-name";
import {
  buildMemberRoleLabel,
  canEditMemberProfile,
  isExecutiveRole,
} from "@/features/dashboard/members/member-role-label";
import { Skeleton } from "@/components/ui/skeleton";
import AuditHistoryPanel from "@/app/(dashboard)/_components/audit-history-panel";
import LastUpdatedMeta from "@/app/(dashboard)/_components/last-updated-meta";
import MemberEditForm from "@/app/(dashboard)/_components/member-edit-form";

type MemberDetailClientProps = {
  generation: {
    id: string;
    name: string;
    path: string;
  };
  memberId: string;
  viewer: {
    id: string;
    role: string | null;
  };
};

const readErrorMessage = (error: unknown): string => {
  if (error instanceof AdminApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "멤버 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
};

const readGenerationNameText = (
  user: ApiUser,
  generationNamesById: Record<string, string>,
): string => {
  const ids = user.generationIds ?? (user.generationId ? [user.generationId] : []);
  if (ids.length === 0) {
    return "없음";
  }

  const uniqueIds = Array.from(new Set(ids));
  const names = uniqueIds.map((id) => generationNamesById[id] ?? "알 수 없는 기수");
  return names.join(", ");
};

export default function MemberDetailClient({
  generation,
  memberId,
  viewer,
}: MemberDetailClientProps) {
  const canReadFullByRole = isExecutiveRole(viewer.role);
  const isSelf = viewer.id === memberId;
  const canReadFullDetail = canReadFullByRole || isSelf;
  const canEdit = canEditMemberProfile(viewer.role);

  const [summary, setSummary] = useState<ApiGenerationMemberSummary | null>(null);
  const [fullUser, setFullUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [generationNamesById, setGenerationNamesById] = useState<Record<string, string>>({
    [generation.id]: generation.name,
  });

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const members = await adminResourceApi.listGenerationMembers(generation.id);
        const targetSummary = members.find((member) => member.id === memberId) ?? null;
        if (!targetSummary) {
          if (!isMounted) {
            return;
          }

          setSummary(null);
          setFullUser(null);
          setErrorMessage("해당 기수에서 멤버를 찾을 수 없습니다.");
          return;
        }

        let nextFullUser: ApiUser | null = null;
        if (canReadFullDetail) {
          try {
            nextFullUser = await adminResourceApi.getUserById(memberId);
          } catch (error) {
            if (!(error instanceof AdminApiError && error.status === 403)) {
              throw error;
            }
          }
        }

        let nextGenerationNamesById: Record<string, string> = {
          [generation.id]: generation.name,
        };
        try {
          const generations = await adminResourceApi.listGenerations();
          nextGenerationNamesById = generations.reduce<Record<string, string>>(
            (acc, item) => {
              acc[item.id] = item.name;
              return acc;
            },
            nextGenerationNamesById,
          );
        } catch {
          // 기수명 조회 실패 시 기본값(현재 기수)으로만 표시한다.
        }

        if (!isMounted) {
          return;
        }

        setSummary(targetSummary);
        setFullUser(nextFullUser);
        setGenerationNamesById(nextGenerationNamesById);
        setIsEditing(false);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSummary(null);
        setFullUser(null);
        setErrorMessage(readErrorMessage(error));
        setIsEditing(false);
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
  }, [canReadFullDetail, generation.id, generation.name, memberId]);

  const currentUserLike = useMemo(() => {
    if (fullUser) {
      return fullUser;
    }

    return summary;
  }, [fullUser, summary]);

  if (isLoading) {
    return (
      <main className="px-4 py-6 md:px-8 md:py-8">
        <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
          <div className="space-y-4" aria-hidden="true">
            <Skeleton className="h-4 w-24" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-44" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 9 }).map((_, index) => (
                  <div
                    key={`generation-member-detail-skeleton-${index + 1}`}
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

  if (errorMessage || !currentUserLike) {
    return (
      <main className="px-4 py-6 md:px-8 md:py-8">
        <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
          <p className="text-sm text-red-700">
            {errorMessage ?? "멤버 정보를 찾을 수 없습니다."}
          </p>
          <Link
            href={`${generation.path}/members`}
            className="mt-4 inline-flex text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-slate-50"
          >
            멤버 목록으로 돌아가기
          </Link>
        </section>
      </main>
    );
  }

  const displayName = buildMemberDisplayName(currentUserLike);
  const profileImage = currentUserLike.image;
  const avatarFallback = buildMemberDisplayInitial(displayName);
  const roleLabel = buildMemberRoleLabel(currentUserLike.role);
  const showsFullDetails = Boolean(fullUser);
  const canInlineEdit = canEdit && Boolean(fullUser);

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto grid w-full max-w-6xl gap-4">
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
          <Link
            href={`${generation.path}/members`}
            className="text-xs font-semibold tracking-[0.12em] text-slate-600 dark:text-slate-300 uppercase hover:text-slate-700 dark:hover:text-slate-200"
          >
            Members
          </Link>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700">
              {profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profileImage}
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
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{generation.name} 멤버 상세</p>
            </div>

            {isSelf ? (
              <span className="rounded-full border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                내 정보
              </span>
            ) : null}

            {canInlineEdit && !isEditing ? (
              <button
                type="button"
                data-testid="generation-member-detail-edit-toggle"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                수정
              </button>
            ) : null}
          </div>

          {isEditing && canInlineEdit && fullUser ? (
            <MemberEditForm
              user={fullUser}
              inline
              onCancel={() => setIsEditing(false)}
              onSaved={(updated) => {
                setFullUser(updated);
                setSummary((previous) => {
                  if (!previous) {
                    return previous;
                  }

                  return {
                    ...previous,
                    name: updated.name,
                    image: updated.image,
                    familyName: updated.familyName,
                    givenName: updated.givenName,
                    department: updated.department,
                    role: updated.role,
                  };
                });
                setIsEditing(false);
              }}
            />
          ) : (
            <>
              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">회원 구분</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">{roleLabel}</p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">학과</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {currentUserLike.department?.trim() || "학과 미등록"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">표시 이름</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {displayName}
                  </p>
                </div>
              </div>

              {showsFullDetails && fullUser ? (
                <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">전체 정보</h2>
                  <dl className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <div>
                      <dt className="text-xs font-semibold text-slate-600 dark:text-slate-300">이메일</dt>
                      <dd className="mt-1 text-sm text-slate-900 dark:text-slate-50">{fullUser.email}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-slate-600 dark:text-slate-300">성</dt>
                      <dd className="mt-1 text-sm text-slate-900 dark:text-slate-50">
                        {fullUser.familyName ?? "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-slate-600 dark:text-slate-300">이름</dt>
                      <dd className="mt-1 text-sm text-slate-900 dark:text-slate-50">
                        {fullUser.givenName ?? "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-slate-600 dark:text-slate-300">대학</dt>
                      <dd className="mt-1 text-sm text-slate-900 dark:text-slate-50">
                        {fullUser.college ?? "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-slate-600 dark:text-slate-300">학번</dt>
                      <dd className="mt-1 text-sm text-slate-900 dark:text-slate-50">
                        {fullUser.studentNumber ?? "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-slate-600 dark:text-slate-300">전화번호</dt>
                      <dd className="mt-1 text-sm text-slate-900 dark:text-slate-50">
                        {fullUser.phoneNumber ?? "-"}
                      </dd>
                    </div>
                    <div className="md:col-span-2 xl:col-span-3">
                      <dt className="text-xs font-semibold text-slate-600 dark:text-slate-300">소속 기수</dt>
                      <dd className="mt-1 break-all text-sm text-slate-900 dark:text-slate-50">
                        {readGenerationNameText(fullUser, generationNamesById)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-slate-600 dark:text-slate-300">생성일</dt>
                      <dd className="mt-1 text-sm text-slate-900 dark:text-slate-50">
                        {formatKoreanDate(fullUser.createdAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-slate-600 dark:text-slate-300">수정일</dt>
                      <dd className="mt-1 text-sm text-slate-900 dark:text-slate-50">
                        {formatKoreanDate(fullUser.updatedAt)}
                      </dd>
                    </div>
                    <div className="md:col-span-2 xl:col-span-3">
                      <dt className="text-xs font-semibold text-slate-600 dark:text-slate-300">최근 수정</dt>
                      <dd className="mt-1">
                        <LastUpdatedMeta
                          updatedAt={fullUser.updatedAt}
                          updatedBy={fullUser.updatedBy}
                          className="text-sm text-slate-900 dark:text-slate-50"
                        />
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  제한 정보만 열람할 수 있습니다.
                </p>
              )}
            </>
          )}
        </section>

        {fullUser ? (
          <AuditHistoryPanel resourceType="user" resourceId={fullUser.id} />
        ) : null}
      </div>
    </main>
  );
}
