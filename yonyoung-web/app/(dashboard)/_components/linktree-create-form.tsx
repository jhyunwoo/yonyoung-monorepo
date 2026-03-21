"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import FormSubmitButton from "@/app/(dashboard)/_components/form-submit-button";
import {
  normalizeLinktreeItemInput,
  normalizeLinktreeName,
  readLinktreeErrorMessage,
} from "@/app/(dashboard)/_components/linktree-shared";
import { Skeleton } from "@/components/ui/skeleton";

type LinktreeCreateFormProps = {
  canWrite: boolean;
  listPath: string;
};

type LinktreeItemDraft = {
  id: number;
  name: string;
  link: string;
};

const isValidHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const createItemDraft = (id: number): LinktreeItemDraft => ({
  id,
  name: "",
  link: "",
});

export default function LinktreeCreateForm({
  canWrite,
  listPath,
}: LinktreeCreateFormProps) {
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [itemDrafts, setItemDrafts] = useState<LinktreeItemDraft[]>([createItemDraft(0)]);
  const [nextItemId, setNextItemId] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (canWrite) {
      return;
    }

    router.replace(listPath);
  }, [canWrite, listPath, router]);

  const handleAddItemDraft = () => {
    setItemDrafts((prev) => [...prev, createItemDraft(nextItemId)]);
    setNextItemId((prev) => prev + 1);
  };

  const handleRemoveItemDraft = (id: number) => {
    setItemDrafts((prev) => {
      if (prev.length <= 1) {
        return prev;
      }

      return prev.filter((item) => item.id !== id);
    });
  };

  const handleUpdateItemDraft = (id: number, key: "name" | "link", value: string) => {
    setItemDrafts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    );
  };

  const handleSubmit = async () => {

    const normalizedGroupName = normalizeLinktreeName(groupName);
    if (!normalizedGroupName) {
      setErrorMessage("분류 이름을 입력해 주세요.");
      return;
    }

    const normalizedItems = itemDrafts
      .map((item) => normalizeLinktreeItemInput(item))
      .filter((item) => item.name.length > 0 || item.link.length > 0);

    if (normalizedItems.length === 0) {
      setErrorMessage("링크를 1개 이상 입력해 주세요.");
      return;
    }

    for (const [index, item] of normalizedItems.entries()) {
      const itemNumber = index + 1;
      if (!item.name) {
        setErrorMessage(`${itemNumber}번째 링크 이름을 입력해 주세요.`);
        return;
      }

      if (!item.link || !isValidHttpUrl(item.link)) {
        setErrorMessage(
          `${itemNumber}번째 링크 주소는 http:// 또는 https://로 시작해야 합니다.`,
        );
        return;
      }
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const createdLinktree = await adminResourceApi.createLinktree({
        name: normalizedGroupName,
      });

      for (const item of normalizedItems) {
        await adminResourceApi.addLinktreeItem(createdLinktree.id, item);
      }

      router.replace(`${listPath}/${createdLinktree.id}`);
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

  return (
    <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-600 dark:text-slate-300 uppercase">
        Settings / Linktree
      </p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">
        링크 모음 생성
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 md:text-base">
        링크 분류를 만들고, 분류에 포함할 링크를 함께 등록할 수 있습니다.
      </p>

      {errorMessage ? (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <form
        data-testid="linktree-create-form"
        className="mt-6 space-y-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4"
        action={handleSubmit}
      >
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">분류 이름</span>
          <input
            data-testid="linktree-group-name-input"
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            disabled={isSaving}
            placeholder="예: 공식 채널"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
        </label>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">링크 목록</p>
          {itemDrafts.map((item, index) => (
            <div
              key={item.id}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3"
            >
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">링크 {index + 1}</p>
              <div className="mt-2 space-y-2">
                <input
                  data-testid={`linktree-item-name-input-${index}`}
                  value={item.name}
                  onChange={(event) =>
                    handleUpdateItemDraft(item.id, "name", event.target.value)
                  }
                  disabled={isSaving}
                  placeholder="링크 이름"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
                />
                <input
                  data-testid={`linktree-item-link-input-${index}`}
                  value={item.link}
                  onChange={(event) =>
                    handleUpdateItemDraft(item.id, "link", event.target.value)
                  }
                  disabled={isSaving}
                  placeholder="https://example.com"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="button"
                data-testid={`linktree-item-delete-button-${index}`}
                onClick={() => handleRemoveItemDraft(item.id)}
                disabled={isSaving || itemDrafts.length <= 1}
                className="mt-2 rounded-lg border border-slate-300 dark:border-slate-600 px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                링크 삭제
              </button>
            </div>
          ))}

          <button
            data-testid="linktree-item-add-button"
            type="button"
            onClick={handleAddItemDraft}
            disabled={isSaving}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            링크 추가
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FormSubmitButton
            data-testid="linktree-create-submit"
            disabled={isSaving}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            idleLabel="링크 모음 생성"
            pendingLabel="생성 중..."
          />
          <Link
            href={listPath}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            취소
          </Link>
        </div>
      </form>
    </section>
  );
}
