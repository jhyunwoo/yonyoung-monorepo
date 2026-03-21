"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ApiGeneration, ApiUser } from "@/shared/contracts/api-contracts";
import { AdminApiError } from "@/shared/http/http";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import { formatKoreanDateRange } from "@/shared/utils/date-formatters";
import { buildMemberDisplayName } from "@/features/dashboard/members/display-name";
import { buildMemberRoleLabel } from "@/features/dashboard/members/member-role-label";
import { Skeleton } from "@/components/ui/skeleton";
import FormSubmitButton from "@/app/(dashboard)/_components/form-submit-button";
import {
  USER_ROLE_FILTER_ALL,
  USER_ROLE_FILTER_NONE,
  filterAssignableUsers,
  formatTimestampToDateInput,
  mergeGenerationId,
  readNormalizedGenerationIds,
  removeGenerationId,
  sortGenerationsBySortOrderDesc,
  validateGenerationFormInput,
} from "@/app/(dashboard)/dashboard/settings/generations/generation-management-shared";

const ROLE_FILTER_ORDER = [
  "president",
  "vice_president",
  "manager",
  "new_member",
  "associate_member",
  "regular_member",
  USER_ROLE_FILTER_NONE,
] as const;

const readErrorMessage = (error: unknown): string => {
  if (error instanceof AdminApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
};

const readRoleFilterLabel = (roleFilterValue: string): string => {
  if (roleFilterValue === USER_ROLE_FILTER_ALL) {
    return "전체 권한";
  }

  if (roleFilterValue === USER_ROLE_FILTER_NONE) {
    return "역할 미지정";
  }

  const roleLabel = buildMemberRoleLabel(roleFilterValue);
  return roleLabel === "역할 미지정" ? roleFilterValue : roleLabel;
};

export default function GenerationManagementClient() {
  const router = useRouter();
  const [generations, setGenerations] = useState<ApiGeneration[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null);

  const [createName, setCreateName] = useState("");
  const [createSortOrderInput, setCreateSortOrderInput] = useState("");
  const [createStartDateInput, setCreateStartDateInput] = useState("");
  const [createEndDateInput, setCreateEndDateInput] = useState("");

  const [editName, setEditName] = useState("");
  const [editSortOrderInput, setEditSortOrderInput] = useState("");
  const [editStartDateInput, setEditStartDateInput] = useState("");
  const [editEndDateInput, setEditEndDateInput] = useState("");

  const [nameQuery, setNameQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>(USER_ROLE_FILTER_ALL);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingGeneration, setIsSavingGeneration] = useState(false);
  const [isAssigningUsers, setIsAssigningUsers] = useState(false);
  const [isRemovingUsers, setIsRemovingUsers] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [generationRows, userRows] = await Promise.all([
          adminResourceApi.listGenerations(),
          adminResourceApi.listUsers(),
        ]);

        if (!isMounted) {
          return;
        }

        const sortedGenerations = sortGenerationsBySortOrderDesc(generationRows);
        setGenerations(sortedGenerations);
        setUsers(userRows);
        setSelectedGenerationId((previous) => {
          if (
            previous &&
            sortedGenerations.some((generation) => generation.id === previous)
          ) {
            return previous;
          }

          return sortedGenerations[0]?.id ?? null;
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setGenerations([]);
        setUsers([]);
        setSelectedGenerationId(null);
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
  }, []);

  const selectedGeneration = useMemo(
    () =>
      selectedGenerationId
        ? (generations.find((generation) => generation.id === selectedGenerationId) ??
          null)
        : null,
    [generations, selectedGenerationId],
  );

  useEffect(() => {
    if (!selectedGeneration) {
      setEditName("");
      setEditSortOrderInput("");
      setEditStartDateInput("");
      setEditEndDateInput("");
      return;
    }

    setEditName(selectedGeneration.name);
    setEditSortOrderInput(String(selectedGeneration.sortOrder));
    setEditStartDateInput(formatTimestampToDateInput(selectedGeneration.startDate));
    setEditEndDateInput(formatTimestampToDateInput(selectedGeneration.endDate));
  }, [selectedGeneration]);

  const roleFilterOptions = useMemo(() => {
    const roleSet = new Set<string>();
    for (const user of users) {
      if (user.role === "unverified") {
        continue;
      }

      if (user.role) {
        roleSet.add(user.role);
      } else {
        roleSet.add(USER_ROLE_FILTER_NONE);
      }
    }

    const orderedRoles = ROLE_FILTER_ORDER.filter((role) => roleSet.has(role));
    const customRoles = [...roleSet]
      .filter(
        (role) => !ROLE_FILTER_ORDER.includes(role as (typeof ROLE_FILTER_ORDER)[number]),
      )
      .sort((left, right) => left.localeCompare(right, "ko"));

    return [USER_ROLE_FILTER_ALL, ...orderedRoles, ...customRoles];
  }, [users]);

  useEffect(() => {
    if (!roleFilterOptions.includes(roleFilter)) {
      setRoleFilter(USER_ROLE_FILTER_ALL);
    }
  }, [roleFilter, roleFilterOptions]);

  const filteredUsers = useMemo(
    () =>
      filterAssignableUsers({
        users,
        nameQuery,
        roleFilter,
      }),
    [nameQuery, roleFilter, users],
  );

  const selectedUserIdSet = useMemo(() => new Set(selectedUserIds), [selectedUserIds]);

  const handleCreateGeneration = async () => {

    const validationResult = validateGenerationFormInput({
      name: createName,
      sortOrderInput: createSortOrderInput,
      startDateInput: createStartDateInput,
      endDateInput: createEndDateInput,
    });
    if ("errorMessage" in validationResult) {
      setErrorMessage(validationResult.errorMessage);
      setSuccessMessage(null);
      return;
    }

    setIsSavingGeneration(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const created = await adminResourceApi.createGeneration(validationResult.payload);
      setGenerations((previous) =>
        sortGenerationsBySortOrderDesc([...previous, created]),
      );
      setSelectedGenerationId(created.id);
      setCreateName("");
      setCreateSortOrderInput("");
      setCreateStartDateInput("");
      setCreateEndDateInput("");
      setSuccessMessage("새 기수를 생성했습니다.");
      router.refresh();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSavingGeneration(false);
    }
  };

  const handleUpdateGeneration = async () => {
    if (!selectedGeneration) {
      return;
    }

    const validationResult = validateGenerationFormInput({
      name: editName,
      sortOrderInput: editSortOrderInput,
      startDateInput: editStartDateInput,
      endDateInput: editEndDateInput,
    });
    if ("errorMessage" in validationResult) {
      setErrorMessage(validationResult.errorMessage);
      setSuccessMessage(null);
      return;
    }

    setIsSavingGeneration(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updated = await adminResourceApi.updateGeneration(
        selectedGeneration.id,
        validationResult.payload,
      );
      setGenerations((previous) =>
        sortGenerationsBySortOrderDesc(
          previous.map((generation) =>
            generation.id === updated.id ? updated : generation,
          ),
        ),
      );
      setSuccessMessage("선택한 기수 정보를 수정했습니다.");
      router.refresh();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSavingGeneration(false);
    }
  };

  const handleDeleteGeneration = async () => {
    if (!selectedGeneration) {
      return;
    }

    const shouldDelete = window.confirm(
      `"${selectedGeneration.name}" 기수를 삭제하시겠습니까?`,
    );
    if (!shouldDelete) {
      return;
    }

    setIsSavingGeneration(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.deleteGeneration(selectedGeneration.id);
      const nextGenerations = generations.filter(
        (generation) => generation.id !== selectedGeneration.id,
      );
      setGenerations(nextGenerations);
      if (selectedGenerationId === selectedGeneration.id) {
        setSelectedGenerationId(nextGenerations[0]?.id ?? null);
      }
      setSuccessMessage("선택한 기수를 삭제했습니다.");
      router.refresh();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSavingGeneration(false);
    }
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((previous) => {
      if (previous.includes(userId)) {
        return previous.filter((id) => id !== userId);
      }

      return [...previous, userId];
    });
  };

  const handleSelectVisibleUsers = () => {
    setSelectedUserIds((previous) => {
      const next = new Set(previous);
      for (const user of filteredUsers) {
        next.add(user.id);
      }
      return [...next];
    });
  };

  const handleAssignUsersToGeneration = async () => {
    if (!selectedGeneration) {
      setErrorMessage("먼저 기수를 선택해 주세요.");
      setSuccessMessage(null);
      return;
    }

    if (selectedUserIds.length === 0) {
      setErrorMessage("기수에 추가할 사용자를 선택해 주세요.");
      setSuccessMessage(null);
      return;
    }

    const targetUsers = users.filter((user) => selectedUserIdSet.has(user.id));
    const updateTargets = targetUsers
      .map((user) => {
        const currentGenerationIds = readNormalizedGenerationIds(user);
        const nextGenerationIds = mergeGenerationId(
          currentGenerationIds,
          selectedGeneration.id,
        );
        if (currentGenerationIds.length === nextGenerationIds.length) {
          return null;
        }

        return {
          userId: user.id,
          generationIds: nextGenerationIds,
        };
      })
      .filter(
        (item): item is { userId: string; generationIds: string[] } => item !== null,
      );

    if (updateTargets.length === 0) {
      setErrorMessage(null);
      setSuccessMessage("선택한 사용자는 이미 해당 기수에 포함되어 있습니다.");
      return;
    }

    setIsAssigningUsers(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updatedUsers = await Promise.all(
        updateTargets.map((target) =>
          adminResourceApi.updateUser(target.userId, {
            generationIds: target.generationIds,
          }),
        ),
      );
      const updatedUserById = new Map(updatedUsers.map((user) => [user.id, user]));

      setUsers((previous) =>
        previous.map((user) => updatedUserById.get(user.id) ?? user),
      );
      setSelectedUserIds([]);
      setSuccessMessage(
        `${updatedUsers.length}명의 사용자를 ${selectedGeneration.name}에 추가했습니다.`,
      );
      router.refresh();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsAssigningUsers(false);
    }
  };

  const handleRemoveUsersFromGeneration = async () => {
    if (!selectedGeneration) {
      setErrorMessage("먼저 기수를 선택해 주세요.");
      setSuccessMessage(null);
      return;
    }

    if (selectedUserIds.length === 0) {
      setErrorMessage("기수에서 제거할 사용자를 선택해 주세요.");
      setSuccessMessage(null);
      return;
    }

    const targetUsers = users.filter((user) => selectedUserIdSet.has(user.id));
    const removeTargets = targetUsers
      .map((user) => {
        const currentGenerationIds = readNormalizedGenerationIds(user);
        if (!currentGenerationIds.includes(selectedGeneration.id)) {
          return null;
        }

        const nextGenerationIds = removeGenerationId(
          currentGenerationIds,
          selectedGeneration.id,
        );

        return {
          userId: user.id,
          generationIds: nextGenerationIds,
        };
      })
      .filter(
        (item): item is { userId: string; generationIds: string[] } => item !== null,
      );

    if (removeTargets.length === 0) {
      setErrorMessage(null);
      setSuccessMessage("선택한 사용자 중 해당 기수에 포함된 사용자가 없습니다.");
      return;
    }

    const shouldRemove = window.confirm(
      `${removeTargets.length}명의 사용자를 ${selectedGeneration.name}에서 제거하시겠습니까?`,
    );
    if (!shouldRemove) {
      return;
    }

    setIsRemovingUsers(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updatedUsers = await Promise.all(
        removeTargets.map((target) =>
          adminResourceApi.updateUser(target.userId, {
            generationIds: target.generationIds,
          }),
        ),
      );
      const updatedUserById = new Map(updatedUsers.map((user) => [user.id, user]));

      setUsers((previous) =>
        previous.map((user) => updatedUserById.get(user.id) ?? user),
      );
      setSelectedUserIds([]);
      setSuccessMessage(
        `${updatedUsers.length}명의 사용자를 ${selectedGeneration.name}에서 제거했습니다.`,
      );
      router.refresh();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsRemovingUsers(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-7xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-600 dark:text-slate-300 uppercase">
        Settings / Generations
      </p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">
        전체 기수 관리
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 md:text-base">
        기수를 만들고 수정하거나 삭제할 수 있고, 멤버를 원하는 기수에 배정하거나 제거할 수
        있습니다.
      </p>

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </p>
      ) : null}

      {isLoading ? (
        <div
          className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]"
          aria-hidden="true"
        >
          <div className="space-y-4">
            <article className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
              <Skeleton className="h-5 w-32" />
              <div className="mt-3 space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton
                    key={`generation-loading-list-${index + 1}`}
                    className="h-12 w-full"
                  />
                ))}
              </div>
            </article>
            <article className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <Skeleton className="h-5 w-24" />
              <div className="mt-3 grid gap-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </article>
          </div>
          <article className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <Skeleton className="h-5 w-40" />
            <div className="mt-3 grid gap-2">
              <Skeleton className="h-10 w-full" />
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton
                  key={`generation-loading-members-${index + 1}`}
                  className="h-11 w-full"
                />
              ))}
            </div>
          </article>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <div className="space-y-4">
            <article className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                전체 기수 목록
              </h2>
              {generations.length === 0 ? (
                <p className="mt-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-4 text-sm text-slate-600 dark:text-slate-300">
                  등록된 기수가 없습니다.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {generations.map((generation) => {
                    const isSelected = generation.id === selectedGenerationId;
                    return (
                      <li key={generation.id}>
                        <button
                          type="button"
                          data-testid={`generation-select-${generation.id}`}
                          onClick={() => setSelectedGenerationId(generation.id)}
                          className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                            isSelected
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 hover:border-slate-300"
                          }`}
                        >
                          <p className="text-sm font-semibold">{generation.name}</p>
                          <p
                            className={`mt-1 text-xs ${
                              isSelected
                                ? "text-slate-200"
                                : "text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            정렬 순서 {generation.sortOrder} ·{" "}
                            {formatKoreanDateRange(
                              generation.startDate,
                              generation.endDate,
                            )}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </article>

            <article className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                기수 생성
              </h2>
              <form className="mt-3 space-y-3" action={handleCreateGeneration}>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    기수 이름
                  </span>
                  <input
                    value={createName}
                    onChange={(event) => setCreateName(event.target.value)}
                    disabled={isSavingGeneration}
                    placeholder="예: 60기"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    정렬 순서
                  </span>
                  <input
                    type="number"
                    value={createSortOrderInput}
                    onChange={(event) => setCreateSortOrderInput(event.target.value)}
                    disabled={isSavingGeneration}
                    placeholder="예: 60"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      시작일
                    </span>
                    <input
                      type="date"
                      value={createStartDateInput}
                      onChange={(event) => setCreateStartDateInput(event.target.value)}
                      disabled={isSavingGeneration}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      종료일
                    </span>
                    <input
                      type="date"
                      value={createEndDateInput}
                      onChange={(event) => setCreateEndDateInput(event.target.value)}
                      disabled={isSavingGeneration}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
                    />
                  </label>
                </div>

                <FormSubmitButton
                  data-testid="generation-create-submit"
                  disabled={isSavingGeneration}
                  className="inline-flex rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  idleLabel="기수 생성"
                  pendingLabel="생성 중..."
                />
              </form>
            </article>

            <article className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                선택한 기수 수정/삭제
              </h2>
              {!selectedGeneration ? (
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  수정할 기수를 먼저 선택해 주세요.
                </p>
              ) : (
                <form className="mt-3 space-y-3" action={handleUpdateGeneration}>
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      기수 이름
                    </span>
                    <input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      disabled={isSavingGeneration}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      정렬 순서
                    </span>
                    <input
                      type="number"
                      value={editSortOrderInput}
                      onChange={(event) => setEditSortOrderInput(event.target.value)}
                      disabled={isSavingGeneration}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block space-y-1">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        시작일
                      </span>
                      <input
                        type="date"
                        value={editStartDateInput}
                        onChange={(event) => setEditStartDateInput(event.target.value)}
                        disabled={isSavingGeneration}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        종료일
                      </span>
                      <input
                        type="date"
                        value={editEndDateInput}
                        onChange={(event) => setEditEndDateInput(event.target.value)}
                        disabled={isSavingGeneration}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <FormSubmitButton
                      data-testid="generation-update-submit"
                      disabled={isSavingGeneration}
                      className="inline-flex rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                      idleLabel="기수 수정"
                      pendingLabel="저장 중..."
                    />
                    <button
                      type="button"
                      data-testid="generation-delete-button"
                      onClick={handleDeleteGeneration}
                      disabled={isSavingGeneration}
                      className="inline-flex rounded-lg border border-red-300 dark:border-red-500 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-red-700 dark:text-red-300 transition hover:bg-red-50 dark:hover:bg-red-900/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      기수 삭제
                    </button>
                  </div>
                </form>
              )}
            </article>
          </div>

          <article className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  멤버 기수 배정 / 제거
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {selectedGeneration
                    ? `${selectedGeneration.name}에 추가하거나 제거할 멤버를 선택해 주세요.`
                    : "멤버를 배정하려면 먼저 기수를 선택해 주세요."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid="generation-assign-submit"
                  onClick={handleAssignUsersToGeneration}
                  disabled={
                    !selectedGeneration ||
                    selectedUserIds.length === 0 ||
                    isAssigningUsers ||
                    isRemovingUsers ||
                    isSavingGeneration
                  }
                  className="inline-flex rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAssigningUsers
                    ? "배정 중..."
                    : `선택 사용자 추가 (${selectedUserIds.length})`}
                </button>
                <button
                  type="button"
                  data-testid="generation-remove-submit"
                  onClick={handleRemoveUsersFromGeneration}
                  disabled={
                    !selectedGeneration ||
                    selectedUserIds.length === 0 ||
                    isAssigningUsers ||
                    isRemovingUsers ||
                    isSavingGeneration
                  }
                  className="inline-flex rounded-lg border border-red-300 dark:border-red-500 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-red-700 dark:text-red-300 transition hover:bg-red-50 dark:hover:bg-red-900/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRemovingUsers
                    ? "제거 중..."
                    : `선택 사용자 제거 (${selectedUserIds.length})`}
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_auto]">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  이름 검색
                </span>
                <input
                  value={nameQuery}
                  onChange={(event) => setNameQuery(event.target.value)}
                  placeholder="이름으로 검색"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  권한 필터
                </span>
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
                >
                  {roleFilterOptions.map((option) => (
                    <option key={option} value={option}>
                      {readRoleFilterLabel(option)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  data-testid="generation-select-visible-users"
                  onClick={handleSelectVisibleUsers}
                  disabled={filteredUsers.length === 0}
                  className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  현재 목록 전체 선택
                </button>
                <button
                  type="button"
                  data-testid="generation-clear-selected-users"
                  onClick={() => setSelectedUserIds([])}
                  disabled={selectedUserIds.length === 0}
                  className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  선택 해제
                </button>
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-4 text-sm text-slate-600 dark:text-slate-300">
                조건에 맞는 사용자가 없습니다.
              </p>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredUsers.map((user) => {
                  const displayName = buildMemberDisplayName(user);
                  const isSelected = selectedUserIdSet.has(user.id);
                  const belongsToSelectedGeneration = selectedGeneration
                    ? readNormalizedGenerationIds(user).includes(selectedGeneration.id)
                    : false;

                  return (
                    <li key={user.id}>
                      <label
                        className={`block cursor-pointer rounded-xl border p-3 transition ${
                          isSelected
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-50 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleUser(user.id)}
                          className="sr-only"
                        />

                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {displayName}
                            </p>
                            <p
                              className={`mt-1 truncate text-xs ${
                                isSelected
                                  ? "text-slate-200"
                                  : "text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              학과: {user.department?.trim() || "학과 미등록"}
                            </p>
                            <p
                              className={`mt-1 truncate text-xs ${
                                isSelected
                                  ? "text-slate-200"
                                  : "text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              학번: {user.studentNumber?.trim() || "학번 미등록"}
                            </p>
                          </div>
                          <span
                            className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${
                              isSelected
                                ? "border-slate-200 dark:border-slate-700 bg-slate-800 text-slate-100"
                                : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            {isSelected ? "선택됨" : "선택"}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[11px] ${
                              isSelected
                                ? "border-slate-200 dark:border-slate-700 text-slate-100"
                                : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            {buildMemberRoleLabel(user.role)}
                          </span>
                          {belongsToSelectedGeneration ? (
                            <span
                              className={`rounded-md border px-2 py-0.5 text-[11px] ${
                                isSelected
                                  ? "border-emerald-200 bg-emerald-900/40 text-emerald-100"
                                  : "border-emerald-300 bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              현재 기수 포함
                            </span>
                          ) : null}
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </article>
        </div>
      )}
    </section>
  );
}
