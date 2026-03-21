"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ApiActivity } from "@/shared/contracts/api-contracts";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import { uploadFilesWithPresign } from "@/features/dashboard/api/admin-api/upload-batch";
import {
  PRESIGN_PATHS,
  uploadWithPresign,
} from "@/features/dashboard/api/admin-api/upload";
import {
  createExistingUploadImageItem,
  readFileList,
  type UploadImageItem,
} from "@/features/media/upload/image-upload-state";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";
import { hasMeaningfulRichTextHtml } from "@/features/media/rich-text/rich-text";
import { useImageUploadState } from "@/features/media/upload/use-image-upload-state";
import { Skeleton } from "@/components/ui/skeleton";
import AuditHistoryPanel from "@/app/(dashboard)/_components/audit-history-panel";
import FormSubmitButton from "@/app/(dashboard)/_components/form-submit-button";
import LastUpdatedMeta from "@/app/(dashboard)/_components/last-updated-meta";
import RichTextEditor from "@/app/(dashboard)/_components/rich-text-editor";
import SortableImageGrid from "@/app/(dashboard)/_components/sortable-image-grid";
import UploadProgressBar from "@/app/(dashboard)/_components/upload-progress-bar";
import {
  formatTimestampToDateInput,
  readActivityErrorMessage,
  validateActivityDateRange,
} from "@/app/(dashboard)/dashboard/[generationName]/activities/_components/activity-shared";

type ActivityEditFormProps = {
  activityId: string;
  generationId: string;
  generationName: string;
  generationPath: string;
  initialMessage: string | null;
};

export default function ActivityEditForm({
  activityId,
  generationId,
  generationName,
  generationPath,
  initialMessage,
}: ActivityEditFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(initialMessage);

  const [activity, setActivity] = useState<ApiActivity | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const detailFileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    items: detailImages,
    replaceItems,
    appendFiles,
    removeItemById,
    reorderByIds,
  } = useImageUploadState();
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    };
  }, [coverPreviewUrl]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const row = await adminResourceApi.getActivityById(activityId);
        if (!mounted) {
          return;
        }

        if (row.generationId !== generationId) {
          router.replace(`${generationPath}/activities`);
          return;
        }

        const sortedImages = row.detailImages
          .slice()
          .sort((left, right) => left.sortOrder - right.sortOrder)
          .map((image) =>
            createExistingUploadImageItem({
              id: image.id,
              imageUrl: image.imageUrl,
            }),
          );

        setActivity(row);
        setTitle(row.title);
        setDescription(row.description);
        setStartDateInput(formatTimestampToDateInput(row.startDate));
        setEndDateInput(formatTimestampToDateInput(row.endDate));
        replaceItems(sortedImages);
        setDeletedImageIds([]);
      } catch (error) {
        if (!mounted) {
          return;
        }
        setErrorMessage(readActivityErrorMessage(error));
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [activityId, generationId, generationPath, replaceItems, router]);

  const isSubmitDisabled = useMemo(() => {
    return (
      isSaving ||
      isLoading ||
      title.trim().length === 0 ||
      !hasMeaningfulRichTextHtml(description) ||
      startDateInput.trim().length === 0 ||
      endDateInput.trim().length === 0 ||
      activity === null
    );
  }, [activity, description, endDateInput, isLoading, isSaving, startDateInput, title]);

  const handleCoverFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;

    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
    }

    setCoverFile(nextFile);
    if (!nextFile) {
      setCoverPreviewUrl(null);
      return;
    }

    setCoverPreviewUrl(URL.createObjectURL(nextFile));
  };

  const handleAddDetailFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = readFileList(event.target.files);
    event.target.value = "";
    if (files.length === 0) {
      return;
    }

    appendFiles(files);
  };

  const handleOpenCoverFilePicker = () => {
    if (isSaving) {
      return;
    }

    coverFileInputRef.current?.click();
  };

  const handleOpenDetailFilePicker = () => {
    if (isSaving) {
      return;
    }

    detailFileInputRef.current?.click();
  };

  const handleRemoveDetailImage = (imageId: string) => {
    const targetExistingId = detailImages.find(
      (image) => image.id === imageId && image.source === "existing",
    )?.id;
    removeItemById(imageId);
    if (targetExistingId) {
      setDeletedImageIds((previous) =>
        previous.includes(targetExistingId) ? previous : [...previous, targetExistingId],
      );
    }
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    setNoticeMessage(null);

    if (!activity) {
      setErrorMessage("활동 정보를 먼저 불러와 주세요.");
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle || !hasMeaningfulRichTextHtml(description)) {
      setErrorMessage("활동 제목과 설명을 모두 입력해 주세요.");
      return;
    }

    const dateRangeResult = validateActivityDateRange({
      startDateInput,
      endDateInput,
    });
    if ("errorMessage" in dateRangeResult) {
      setErrorMessage(dateRangeResult.errorMessage);
      return;
    }

    setIsSaving(true);
    setUploadProgressPercent(0);

    try {
      const newOrder = detailImages.filter(
        (image): image is UploadImageItem & { file: File } =>
          image.source === "new" && image.file !== null,
      );
      const totalUploadCount = (coverFile ? 1 : 0) + newOrder.length;
      let coverUploadProgress = coverFile ? 0 : 100;
      let detailUploadProgress = newOrder.length > 0 ? 0 : 100;
      const updateUploadProgress = () => {
        if (totalUploadCount <= 0) {
          setUploadProgressPercent(null);
          return;
        }

        const weightedCover = coverFile ? coverUploadProgress : 0;
        const weightedDetail = detailUploadProgress * newOrder.length;
        const weightedProgress = (weightedCover + weightedDetail) / totalUploadCount;
        setUploadProgressPercent(Math.round(weightedProgress));
      };

      let nextCoverImageUrl = activity.coverImageUrl;
      if (coverFile) {
        nextCoverImageUrl = await uploadWithPresign({
          presignPath: PRESIGN_PATHS.activityCover,
          file: coverFile,
          onProgress: (progressPercent) => {
            coverUploadProgress = progressPercent;
            updateUploadProgress();
          },
        });
      }

      await adminResourceApi.updateActivity(activity.id, {
        title: trimmedTitle,
        description,
        startDate: dateRangeResult.startDate,
        endDate: dateRangeResult.endDate,
        coverImageUrl: nextCoverImageUrl,
        generationId,
      });

      if (deletedImageIds.length > 0) {
        await Promise.all(
          deletedImageIds.map((imageId) =>
            adminResourceApi.deleteActivityImage(activity.id, imageId),
          ),
        );
      }

      const existingOrder = detailImages.filter((image) => image.source === "existing");

      const createdMap = new Map<string, string>();
      if (newOrder.length > 0) {
        const uploadedUrls = await uploadFilesWithPresign({
          presignPath: PRESIGN_PATHS.activityDetail,
          files: newOrder.map((image) => image.file),
          onProgress: (progressPercent) => {
            detailUploadProgress = progressPercent;
            updateUploadProgress();
          },
        });

        const created = await adminResourceApi.addActivityImages(
          activity.id,
          uploadedUrls.map((imageUrl, index) => ({
            imageUrl,
            sortOrder: existingOrder.length + index,
          })),
        );

        created.forEach((row, index) => {
          const local = newOrder[index];
          if (local) {
            createdMap.set(local.id, row.id);
          }
        });
      }

      const finalOrder = detailImages
        .map((image) => {
          if (image.source === "existing") {
            return image.id;
          }

          return createdMap.get(image.id) ?? null;
        })
        .filter((id): id is string => Boolean(id));

      // If only newly uploaded images remain, sortOrder is already assigned in addActivityImages.
      // Reordering batch is only required when existing persisted images are still present.
      if (existingOrder.length > 0 && finalOrder.length > 0) {
        await adminResourceApi.updateActivityImages(
          activity.id,
          finalOrder.map((imageId, sortOrder) => ({
            imageId,
            sortOrder,
          })),
        );
      }

      router.push(`${generationPath}/activities/${activity.id}`);
    } catch (error) {
      setErrorMessage(readActivityErrorMessage(error));
    } finally {
      setIsSaving(false);
      setUploadProgressPercent(null);
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-600 dark:text-slate-300 uppercase">
        Activities
      </p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">
        {generationName} 활동 수정
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 md:text-base">
        활동 기본 정보와 사진을 함께 수정할 수 있습니다.
      </p>

      {noticeMessage ? (
        <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {noticeMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {isLoading ? (
        <div className="mt-6 space-y-6" aria-hidden="true">
          <div className="space-y-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="space-y-2 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="aspect-[4/3] w-full max-w-md rounded-lg" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-3 w-64" />
          </div>
          <div className="space-y-2 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-52" />
            <Skeleton className="h-10 w-24" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton
                  key={`activity-edit-image-loading-${index + 1}`}
                  className="aspect-[4/3] w-full rounded-lg"
                />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>
      ) : activity ? (
        <form className="mt-6 space-y-6" action={handleSubmit}>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">활동 제목</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isSaving}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
            />
          </label>

          <div className="space-y-1">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">활동 설명</span>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              disabled={isSaving}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">시작일</span>
              <input
                type="date"
                value={startDateInput}
                onChange={(event) => setStartDateInput(event.target.value)}
                disabled={isSaving}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">종료일</span>
              <input
                type="date"
                value={endDateInput}
                onChange={(event) => setEndDateInput(event.target.value)}
                disabled={isSaving}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              대표 이미지 교체 (선택)
            </p>
            <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700">
              <Image
                src={activity.coverImageUrl}
                alt={`${activity.title} 대표 이미지`}
                fill
                className="object-cover"
                unoptimized={shouldUseUnoptimizedImage(activity.coverImageUrl)}
                sizes="(max-width: 768px) 100vw, 400px"
              />
            </div>
            <button
              type="button"
              data-testid="activity-edit-cover-select"
              onClick={handleOpenCoverFilePicker}
              disabled={isSaving}
              className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              파일 선택
            </button>
            <input
              ref={coverFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverFileChange}
              disabled={isSaving}
              className="sr-only"
            />
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {coverFile
                ? `선택됨: ${coverFile.name}`
                : "대표 이미지를 교체하지 않으려면 비워 두세요."}
            </p>
            {coverPreviewUrl ? (
              <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverPreviewUrl}
                  alt="새 대표 이미지 미리보기"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">세부 이미지</p>
            <label className="block space-y-1">
              <span className="text-xs text-slate-600 dark:text-slate-300">
                새 세부 이미지 추가 (선택, 여러 장)
              </span>
              <button
                type="button"
                data-testid="activity-edit-detail-select"
                onClick={handleOpenDetailFilePicker}
                disabled={isSaving}
                className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                파일 선택
              </button>
              <input
                ref={detailFileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleAddDetailFiles}
                disabled={isSaving}
                className="sr-only"
              />
            </label>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              마우스로 끌어 세부 이미지 순서를 바꿀 수 있습니다.
            </p>
            <SortableImageGrid
              items={detailImages.map((image, index) => ({
                id: image.id,
                imageUrl: image.imageUrl,
                label:
                  image.source === "existing"
                    ? `기존 이미지 ${index + 1}`
                    : (image.file?.name ?? `새 이미지 ${index + 1}`),
                subtitle: image.source === "existing" ? "기존" : "새 업로드",
              }))}
              onReorder={(nextItems) => reorderByIds(nextItems.map((item) => item.id))}
              onRemoveItem={handleRemoveDetailImage}
              disabled={isSaving}
              emptyMessage="등록된 세부 이미지가 없습니다."
            />
            <UploadProgressBar
              progressPercent={uploadProgressPercent}
              label="사진 업로드 진행률"
            />
          </div>

          <LastUpdatedMeta
            updatedAt={activity.updatedAt}
            updatedBy={activity.updatedBy}
            className="text-xs text-slate-600 dark:text-slate-300"
          />

          <div className="flex flex-wrap gap-2">
            <FormSubmitButton
              data-testid="activity-edit-submit"
              disabled={isSubmitDisabled}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              idleLabel="수정 저장"
              pendingLabel="저장 중..."
            />
            <Link
              href={`${generationPath}/activities/${activity.id}`}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              상세로
            </Link>
            <Link
              href={`${generationPath}/activities`}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              목록으로
            </Link>
          </div>
        </form>
      ) : null}

      <div className="mt-6">
        <AuditHistoryPanel resourceType="activity" resourceId={activityId} />
      </div>
    </section>
  );
}
