"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ApiLinktree } from "@/shared/contracts/api-contracts";
import { AdminApiError } from "@/shared/http/http";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import { formatAuditActor } from "@/features/dashboard/ui/audit-display";
import { formatKoreanDate } from "@/shared/utils/date-formatters";
import { Skeleton } from "@/components/ui/skeleton";
import AuditHistoryPanel from "@/app/(dashboard)/_components/audit-history-panel";
import FormSubmitButton from "@/app/(dashboard)/_components/form-submit-button";
import LastUpdatedMeta from "@/app/(dashboard)/_components/last-updated-meta";
import {
  normalizeLinktreeItemInput,
  readLinktreeErrorMessage,
} from "@/app/(dashboard)/_components/linktree-shared";

type LinktreeGroupDetailProps = {
  linktreeId: string;
  canWrite: boolean;
  listPath: string;
};

export default function LinktreeGroupDetail({
  linktreeId,
  canWrite,
  listPath,
}: LinktreeGroupDetailProps) {
  const router = useRouter();
  const [linktree, setLinktree] = useState<ApiLinktree | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemLink, setNewItemLink] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isValidHttpUrl = (value: string): boolean => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const loadLinktree = useCallback(async () => {
    setIsLoading(true);
    setIsNotFound(false);
    setErrorMessage(null);

    try {
      const row = await adminResourceApi.getLinktreeById(linktreeId);
      setLinktree(row);
    } catch (error) {
      setLinktree(null);
      if (error instanceof AdminApiError && error.status === 404) {
        setIsNotFound(true);
      } else {
        setErrorMessage(readLinktreeErrorMessage(error));
      }
    } finally {
      setIsLoading(false);
    }
  }, [linktreeId]);

  useEffect(() => {
    void loadLinktree();
  }, [loadLinktree]);

  const handleDelete = async () => {
    const confirmed = window.confirm("이 분류를 삭제하시겠습니까?");
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await adminResourceApi.deleteLinktree(linktreeId);
      router.replace(listPath);
      router.refresh();
    } catch (error) {
      setErrorMessage(readLinktreeErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddItem = async () => {

    if (!canWrite) {
      return;
    }

    const normalizedItem = normalizeLinktreeItemInput({
      name: newItemName,
      link: newItemLink,
    });

    if (!normalizedItem.name) {
      setErrorMessage("링크 이름을 입력해 주세요.");
      return;
    }

    if (!normalizedItem.link || !isValidHttpUrl(normalizedItem.link)) {
      setErrorMessage("링크 주소는 http:// 또는 https://로 시작해야 합니다.");
      return;
    }

    setIsAddingItem(true);
    setErrorMessage(null);

    try {
      await adminResourceApi.addLinktreeItem(linktreeId, normalizedItem);
      const refreshedLinktree = await adminResourceApi.getLinktreeById(linktreeId);
      setLinktree(refreshedLinktree);
      setNewItemName("");
      setNewItemLink("");
      router.refresh();
    } catch (error) {
      setErrorMessage(readLinktreeErrorMessage(error));
    } finally {
      setIsAddingItem(false);
    }
  };

  if (isLoading) {
    return (
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
        <div className="space-y-4" aria-hidden="true">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-3 w-full max-w-lg" />
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="mt-3 h-3 w-28" />
            <Skeleton className="mt-1 h-3 w-36" />
            <div className="mt-4 flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isNotFound) {
    return (
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">링크 분류 상세</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          존재하지 않는 분류이거나 접근할 수 없습니다.
        </p>
        <Link
          href={listPath}
          className="mt-6 inline-flex rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          목록으로 이동
        </Link>
      </section>
    );
  }

  if (!linktree) {
    return (
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
        <p className="text-sm text-slate-600 dark:text-slate-300">분류 데이터를 불러올 수 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-600 dark:text-slate-300 uppercase">
        Settings / Linktree
      </p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">
        링크 분류 상세
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 md:text-base">
        분류 정보와 하위 링크를 확인할 수 있고, 권한이 있으면 분류를 수정하거나 삭제할 수
        있습니다.
      </p>

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <p className="text-xl font-semibold text-slate-900 dark:text-slate-50">{linktree.name}</p>
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">링크 {linktree.items.length}개</p>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          생성일: {formatKoreanDate(linktree.createdAt)}
        </p>
        <LastUpdatedMeta
          updatedAt={linktree.updatedAt}
          updatedBy={linktree.updatedBy}
          className="mt-1 text-xs text-slate-600 dark:text-slate-300"
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={listPath}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            목록으로
          </Link>

          {canWrite ? (
            <>
              <Link
                href={`${listPath}/${linktree.id}/edit`}
                className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                분류 수정
              </Link>
              <button
                type="button"
                data-testid="linktree-group-delete"
                onClick={() => void handleDelete()}
                disabled={isDeleting}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                분류 삭제
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">하위 링크</p>

        {canWrite ? (
          <form action={handleAddItem} className="mt-3 space-y-2">
            <div className="grid gap-2 md:grid-cols-2">
              <input
                data-testid="linktree-group-item-name-input"
                value={newItemName}
                onChange={(event) => setNewItemName(event.target.value)}
                disabled={isAddingItem || isDeleting}
                placeholder="링크 이름"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
              />
              <input
                data-testid="linktree-group-item-link-input"
                value={newItemLink}
                onChange={(event) => setNewItemLink(event.target.value)}
                disabled={isAddingItem || isDeleting}
                placeholder="https://example.com"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
              />
            </div>
            <FormSubmitButton
              data-testid="linktree-group-item-add-submit"
              disabled={isAddingItem || isDeleting}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              idleLabel="하위 링크 추가"
              pendingLabel="추가 중..."
            />
          </form>
        ) : null}

        {linktree.items.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
            등록된 링크가 없습니다.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {linktree.items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`${listPath}/${linktree.id}/items/${item.id}`}
                  className="block rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 transition hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-900 dark:text-slate-50">{item.name}</span>
                  <span className="ml-2 text-xs text-slate-600 dark:text-slate-300">상세 보기</span>
                  <span className="mt-1 block text-[11px] text-slate-600 dark:text-slate-300">
                    최근 수정: {formatKoreanDate(item.updatedAt)} ·{" "}
                    {formatAuditActor(item.updatedBy)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6">
        <AuditHistoryPanel resourceType="linktree" resourceId={linktree.id} />
      </div>
    </section>
  );
}
