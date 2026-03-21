"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ApiLinktree, ApiLinktreeItem } from "@/shared/contracts/api-contracts";
import { AdminApiError } from "@/shared/http/http";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import FormSubmitButton from "@/app/(dashboard)/_components/form-submit-button";
import {
  findLinktreeItemById,
  normalizeLinktreeItemInput,
  readLinktreeErrorMessage,
} from "@/app/(dashboard)/_components/linktree-shared";
import { Skeleton } from "@/components/ui/skeleton";

type LinktreeItemEditFormProps = {
  linktreeId: string;
  itemId: string;
  canWrite: boolean;
  listPath: string;
};

const isValidHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export default function LinktreeItemEditForm({
  linktreeId,
  itemId,
  canWrite,
  listPath,
}: LinktreeItemEditFormProps) {
  const router = useRouter();
  const [linktree, setLinktree] = useState<ApiLinktree | null>(null);
  const [item, setItem] = useState<ApiLinktreeItem | null>(null);

  const [name, setName] = useState("");
  const [link, setLink] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGroupNotFound, setIsGroupNotFound] = useState(false);
  const [isItemNotFound, setIsItemNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (canWrite) {
      return;
    }

    router.replace(`${listPath}/${linktreeId}/items/${itemId}`);
  }, [canWrite, itemId, linktreeId, listPath, router]);

  const loadItem = useCallback(async () => {
    setIsLoading(true);
    setIsGroupNotFound(false);
    setIsItemNotFound(false);
    setErrorMessage(null);

    try {
      const row = await adminResourceApi.getLinktreeById(linktreeId);
      const foundItem = findLinktreeItemById(row, itemId);

      setLinktree(row);
      if (!foundItem) {
        setItem(null);
        setIsItemNotFound(true);
        return;
      }

      setItem(foundItem);
      setName(foundItem.name);
      setLink(foundItem.link);
    } catch (error) {
      setLinktree(null);
      setItem(null);
      if (error instanceof AdminApiError && error.status === 404) {
        setIsGroupNotFound(true);
      } else {
        setErrorMessage(readLinktreeErrorMessage(error));
      }
    } finally {
      setIsLoading(false);
    }
  }, [itemId, linktreeId]);

  useEffect(() => {
    if (!canWrite) {
      return;
    }

    void loadItem();
  }, [canWrite, loadItem]);

  const handleSubmit = async () => {

    const normalized = normalizeLinktreeItemInput({ name, link });
    if (!normalized.name) {
      setErrorMessage("링크 이름을 입력해 주세요.");
      return;
    }

    if (!normalized.link || !isValidHttpUrl(normalized.link)) {
      setErrorMessage("http:// 또는 https://로 시작하는 링크 주소를 입력해 주세요.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await adminResourceApi.updateLinktreeItem(linktreeId, itemId, normalized);
      router.replace(`${listPath}/${linktreeId}/items/${itemId}`);
      router.refresh();
    } catch (error) {
      setErrorMessage(readLinktreeErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  if (!canWrite) {
    return (
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
        <div className="space-y-3" aria-hidden="true">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-64" />
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
        <div className="space-y-3" aria-hidden="true">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-64" />
          <Skeleton className="h-10 w-full max-w-lg" />
          <Skeleton className="h-10 w-full max-w-lg" />
          <Skeleton className="h-10 w-20" />
        </div>
      </section>
    );
  }

  if (isGroupNotFound) {
    return (
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">링크 수정</h1>
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

  if (isItemNotFound) {
    return (
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">링크 수정</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          존재하지 않는 링크이거나 접근할 수 없습니다.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={listPath}
            className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            목록으로 이동
          </Link>
          <Link
            href={`${listPath}/${linktreeId}`}
            className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            분류 상세로 이동
          </Link>
        </div>
      </section>
    );
  }

  if (!linktree || !item) {
    return (
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
        <p className="text-sm text-slate-600 dark:text-slate-300">링크 데이터를 불러올 수 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-600 dark:text-slate-300 uppercase">
        Settings / Linktree
      </p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">링크 수정</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 md:text-base">
        링크 이름과 링크 주소를 수정할 수 있습니다.
      </p>

      {errorMessage ? (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <form
        className="mt-6 space-y-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4"
        action={handleSubmit}
      >
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">분류: {linktree.name}</p>

        <label className="block space-y-1">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">링크 이름</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isSaving}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">링크 주소</span>
          <input
            value={link}
            onChange={(event) => setLink(event.target.value)}
            disabled={isSaving}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <FormSubmitButton
            data-testid="linktree-item-edit-submit"
            disabled={isSaving}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            idleLabel="저장"
            pendingLabel="저장 중..."
          />
          <Link
            href={`${listPath}/${linktreeId}/items/${itemId}`}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            취소
          </Link>
        </div>
      </form>
    </section>
  );
}
