"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import { PRESIGN_PATHS } from "@/features/dashboard/api/admin-api/upload";
import { uploadFilesWithPresign } from "@/features/dashboard/api/admin-api/upload-batch";
import { AdminApiError } from "@/shared/http/http";
import { createExistingUploadImageItem } from "@/features/media/upload/image-upload-state";
import { hasMeaningfulRichTextHtml } from "@/features/media/rich-text/rich-text";
import { useImageUploadState } from "@/features/media/upload/use-image-upload-state";
import { Skeleton } from "@/components/ui/skeleton";
import RichTextEditor from "@/app/(dashboard)/_components/rich-text-editor";
import SortableImageGrid from "@/app/(dashboard)/_components/sortable-image-grid";
import UploadProgressBar from "@/app/(dashboard)/_components/upload-progress-bar";

const RECRUITING_MAX_IMAGES = 10;

const inputClassName =
  "w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

const readErrorMessage = (error: unknown): string => {
  if (error instanceof AdminApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "모집 계획 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
};

const formatTimestampToDateTimeLocal = (timestampMs: number): string => {
  const date = new Date(timestampMs);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
};

const parseDateTimeLocalToTimestamp = (value: string): number | null => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toUploadImageItems = (urls: string[]) =>
  urls.map((imageUrl, index) =>
    createExistingUploadImageItem({
      id: `existing-${index}-${imageUrl}`,
      imageUrl,
    }),
  );

export default function RecruitingPlanSettingsForm() {
  const router = useRouter();
  const promotionFileInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [recruitmentStartAtInput, setRecruitmentStartAtInput] = useState("");
  const [recruitmentEndAtInput, setRecruitmentEndAtInput] = useState("");
  const {
    items: promotionImageItems,
    replaceItems: replacePromotionImageItems,
    appendExistingUrls: appendPromotionImageUrls,
    removeItemById: removePromotionImageById,
    reorderByIds: reorderPromotionImageByIds,
  } = useImageUploadState({ maxItems: RECRUITING_MAX_IMAGES });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const promotionImageUrls = useMemo(
    () => promotionImageItems.map((item) => item.imageUrl),
    [promotionImageItems],
  );
  const isPromotionUploadDisabled =
    isSaving || isUploadingImage || promotionImageUrls.length >= RECRUITING_MAX_IMAGES;

  useEffect(() => {
    let isMounted = true;

    const loadCurrentRecruitingPlan = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const plan = await adminResourceApi.getCurrentRecruitingPlan();
        if (!isMounted) {
          return;
        }

        if (!plan) {
          setTitle("");
          setContent("");
          setRecruitmentStartAtInput("");
          setRecruitmentEndAtInput("");
          replacePromotionImageItems([]);
          return;
        }

        setTitle(plan.title);
        setContent(plan.content);
        setRecruitmentStartAtInput(
          formatTimestampToDateTimeLocal(plan.recruitmentStartAt),
        );
        setRecruitmentEndAtInput(formatTimestampToDateTimeLocal(plan.recruitmentEndAt));
        replacePromotionImageItems(toUploadImageItems(plan.promotionImageUrls));
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

    void loadCurrentRecruitingPlan();

    return () => {
      isMounted = false;
    };
  }, [replacePromotionImageItems]);

  const handleUploadPromotionImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    const remainingSlots = RECRUITING_MAX_IMAGES - promotionImageUrls.length;
    if (remainingSlots <= 0) {
      setErrorMessage(`이미지는 최대 ${RECRUITING_MAX_IMAGES}장까지 등록할 수 있습니다.`);
      return;
    }

    const uploadTargets = files.slice(0, remainingSlots);
    setIsUploadingImage(true);
    setUploadProgressPercent(0);
    setErrorMessage(null);

    try {
      const uploadedUrls = await uploadFilesWithPresign({
        presignPath: PRESIGN_PATHS.recruitingImage,
        files: uploadTargets,
        onProgress: setUploadProgressPercent,
      });
      appendPromotionImageUrls(uploadedUrls);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsUploadingImage(false);
      setUploadProgressPercent(null);
    }
  };

  const handlePromotionImageUploadClick = () => {
    if (isPromotionUploadDisabled) {
      return;
    }

    promotionFileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      setErrorMessage("제목을 입력해 주세요.");
      setSuccessMessage(null);
      return;
    }

    if (!hasMeaningfulRichTextHtml(content)) {
      setErrorMessage("세부 내용을 입력해 주세요.");
      setSuccessMessage(null);
      return;
    }

    const recruitmentStartAt = parseDateTimeLocalToTimestamp(recruitmentStartAtInput);
    const recruitmentEndAt = parseDateTimeLocalToTimestamp(recruitmentEndAtInput);
    if (recruitmentStartAt === null || recruitmentEndAt === null) {
      setErrorMessage("모집 시작일시와 종료일시를 올바르게 입력해 주세요.");
      setSuccessMessage(null);
      return;
    }

    if (recruitmentStartAt > recruitmentEndAt) {
      setErrorMessage("모집 시작일시는 모집 종료일시보다 늦을 수 없습니다.");
      setSuccessMessage(null);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updated = await adminResourceApi.upsertCurrentRecruitingPlan({
        title: trimmedTitle,
        content,
        promotionImageUrls,
        recruitmentStartAt,
        recruitmentEndAt,
      });

      setTitle(updated.title);
      setContent(updated.content);
      setRecruitmentStartAtInput(
        formatTimestampToDateTimeLocal(updated.recruitmentStartAt),
      );
      setRecruitmentEndAtInput(formatTimestampToDateTimeLocal(updated.recruitmentEndAt));
      replacePromotionImageItems(toUploadImageItems(updated.promotionImageUrls));
      setSuccessMessage("올해 모집 계획을 저장했습니다.");
      router.refresh();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
        <div className="space-y-4" aria-hidden="true">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-3 w-full max-w-lg" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-48 w-full" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                key={`recruiting-plan-image-loading-${index + 1}`}
                className="aspect-square w-full"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-600 dark:text-slate-300 uppercase">
        Settings / Recruiting
      </p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">모집 계획</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 md:text-base">
        올해 모집 계획의 제목, 세부 내용, 홍보 이미지, 모집 기간을 설정할 수 있습니다.
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

      <div className="mt-6 space-y-6">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">제목</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={inputClassName}
            disabled={isSaving || isUploadingImage}
            placeholder="예: 2030 연영회 신입 부원 모집"
          />
        </label>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">세부 내용</p>
          <RichTextEditor
            value={content}
            onChange={setContent}
            disabled={isSaving || isUploadingImage}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">모집 시작일시</span>
            <input
              type="datetime-local"
              value={recruitmentStartAtInput}
              onChange={(event) => setRecruitmentStartAtInput(event.target.value)}
              className={inputClassName}
              disabled={isSaving || isUploadingImage}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">모집 종료일시</span>
            <input
              type="datetime-local"
              value={recruitmentEndAtInput}
              onChange={(event) => setRecruitmentEndAtInput(event.target.value)}
              className={inputClassName}
              disabled={isSaving || isUploadingImage}
            />
          </label>
        </div>

        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 md:p-5">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">홍보 이미지</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">최대 {RECRUITING_MAX_IMAGES}장</p>

          <button
            type="button"
            data-testid="recruiting-plan-upload"
            onClick={handlePromotionImageUploadClick}
            disabled={isPromotionUploadDisabled}
            className="mt-3 inline-flex rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            파일 업로드
          </button>
          <input
            ref={promotionFileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUploadPromotionImages}
            className="sr-only"
            disabled={isPromotionUploadDisabled}
          />

          {isUploadingImage ? (
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">이미지 업로드 중...</p>
          ) : null}
          {!isUploadingImage && promotionImageUrls.length >= RECRUITING_MAX_IMAGES ? (
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              최대 {RECRUITING_MAX_IMAGES}장까지 등록되어 추가 업로드가
              비활성화되었습니다.
            </p>
          ) : null}
          <UploadProgressBar
            progressPercent={uploadProgressPercent}
            label="홍보 이미지 업로드 진행률"
          />

          <div className="mt-3 space-y-2">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              마우스로 끌어 이미지 순서를 바꿀 수 있습니다.
            </p>
            <SortableImageGrid
              items={promotionImageItems.map((item, index) => ({
                id: item.id,
                imageUrl: item.imageUrl,
                label: `홍보 이미지 ${index + 1}`,
                alt: `홍보 이미지 ${index + 1}`,
              }))}
              onReorder={(nextItems) =>
                reorderPromotionImageByIds(nextItems.map((item) => item.id))
              }
              onRemoveItem={removePromotionImageById}
              disabled={isSaving || isUploadingImage}
              emptyMessage="등록된 홍보 이미지가 없습니다."
            />
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            data-testid="recruiting-plan-save"
            onClick={() => void handleSubmit()}
            disabled={isSaving || isUploadingImage}
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </section>
  );
}
