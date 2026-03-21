"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminApiError } from "@/shared/http/http";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import FormSubmitButton from "@/app/(dashboard)/_components/form-submit-button";
import {
  normalizeLinktreeName,
  readLinktreeErrorMessage,
} from "@/app/(dashboard)/_components/linktree-shared";
import { Skeleton } from "@/components/ui/skeleton";

type LinktreeGroupEditFormProps = {
  linktreeId: string;
  canWrite: boolean;
  listPath: string;
};

export default function LinktreeGroupEditForm({
  linktreeId,
  canWrite,
  listPath,
}: LinktreeGroupEditFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (canWrite) {
      return;
    }

    router.replace(`${listPath}/${linktreeId}`);
  }, [canWrite, linktreeId, listPath, router]);

  const loadLinktree = useCallback(async () => {
    setIsLoading(true);
    setIsNotFound(false);
    setErrorMessage(null);

    try {
      const row = await adminResourceApi.getLinktreeById(linktreeId);
      setName(row.name);
    } catch (error) {
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
    if (!canWrite) {
      return;
    }

    void loadLinktree();
  }, [canWrite, loadLinktree]);

  const handleSubmit = async () => {

    const normalizedName = normalizeLinktreeName(name);
    if (!normalizedName) {
      setErrorMessage("분류 이름을 입력해 주세요.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await adminResourceApi.updateLinktree(linktreeId, {
        name: normalizedName,
      });
      router.replace(`${listPath}/${linktreeId}`);
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
          <Skeleton className="h-8 w-36" />
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
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-3 w-64" />
          <Skeleton className="h-10 w-full max-w-lg" />
          <Skeleton className="h-10 w-20" />
        </div>
      </section>
    );
  }

  if (isNotFound) {
    return (
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">링크 분류 수정</h1>
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

  return (
    <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-600 dark:text-slate-300 uppercase">
        Settings / Linktree
      </p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">
        링크 분류 수정
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 md:text-base">
        분류 이름을 바꾼 뒤 저장할 수 있습니다.
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
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">분류 이름</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isSaving}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <FormSubmitButton
            data-testid="linktree-group-edit-submit"
            disabled={isSaving}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            idleLabel="저장"
            pendingLabel="저장 중..."
          />
          <Link
            href={`${listPath}/${linktreeId}`}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            취소
          </Link>
        </div>
      </form>
    </section>
  );
}
