"use client";

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import { PRESIGN_PATHS } from "@/features/dashboard/api/admin-api/upload";
import { uploadFilesWithPresign } from "@/features/dashboard/api/admin-api/upload-batch";
import { AdminApiError } from "@/shared/http/http";
import { hasMeaningfulRichTextHtml } from "@/features/media/rich-text/rich-text";
import AuditHistoryPanel from "@/app/(dashboard)/_components/audit-history-panel";
import FormSubmitButton from "@/app/(dashboard)/_components/form-submit-button";
import LastUpdatedMeta from "@/app/(dashboard)/_components/last-updated-meta";
import RichTextEditor from "@/app/(dashboard)/_components/rich-text-editor";
import SortableImageGrid from "@/app/(dashboard)/_components/sortable-image-grid";
import UploadProgressBar from "@/app/(dashboard)/_components/upload-progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { createExistingUploadImageItem } from "@/features/media/upload/image-upload-state";
import { useImageUploadState } from "@/features/media/upload/use-image-upload-state";
import {
  NOTICE_MAX_IMAGES,
  normalizeNoticeImageUrls,
  readNoticeErrorMessage,
  toNoticeItem,
  type NoticeScope,
} from "@/app/(dashboard)/_components/notice-shared";

type NoticeEditFormProps = {
  scope: NoticeScope;
  generationId?: string;
  noticeId: string;
  canWrite: boolean;
  listPath: string;
  detailPath: string;
  heading: string;
  description: string;
};

export default function NoticeEditForm({
  scope,
  generationId,
  noticeId,
  canWrite,
  listPath,
  detailPath,
  heading,
  description,
}: NoticeEditFormProps) {
  const router = useRouter();
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const {
    items: imageItems,
    replaceItems,
    appendExistingUrls,
    removeItemById,
    reorderByIds,
  } = useImageUploadState({ maxItems: NOTICE_MAX_IMAGES });
  const imageUrls = useMemo(() => imageItems.map((item) => item.imageUrl), [imageItems]);
  const [noticeMeta, setNoticeMeta] = useState<{
    updatedAt: number;
    updatedBy: ReturnType<typeof toNoticeItem>["updatedBy"];
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const isImageUploadDisabled =
    isSaving || isUploadingImage || imageUrls.length >= NOTICE_MAX_IMAGES;
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (canWrite) {
      return;
    }

    router.replace(detailPath);
  }, [canWrite, detailPath, router]);

  const loadNotice = useCallback(async () => {
    setIsLoading(true);
    setIsNotFound(false);
    setErrorMessage(null);

    try {
      let noticeEntity;
      if (scope === "generation") {
        if (!generationId) {
          throw new Error("기수 정보가 없습니다.");
        }

        noticeEntity = await adminResourceApi.getGenerationNoticeById(
          generationId,
          noticeId,
        );
      } else {
        noticeEntity = await adminResourceApi.getGlobalNoticeById(noticeId);
      }

      const mapped = toNoticeItem(noticeEntity);
      setTitle(mapped.title);
      setContent(mapped.content);
      replaceItems(
        mapped.imageUrls.map((imageUrl, index) =>
          createExistingUploadImageItem({
            id: `existing-${index}-${imageUrl}`,
            imageUrl,
          }),
        ),
      );
      setNoticeMeta({
        updatedAt: mapped.updatedAt,
        updatedBy: mapped.updatedBy,
      });
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 404) {
        setIsNotFound(true);
      } else {
        setErrorMessage(readNoticeErrorMessage(error));
      }
    } finally {
      setIsLoading(false);
    }
  }, [generationId, noticeId, replaceItems, scope]);

  useEffect(() => {
    if (!canWrite) {
      return;
    }

    void loadNotice();
  }, [canWrite, loadNotice]);

  const handleUploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    const remainingSlots = NOTICE_MAX_IMAGES - imageUrls.length;
    if (remainingSlots <= 0) {
      setErrorMessage(`이미지는 최대 ${NOTICE_MAX_IMAGES}장까지 등록할 수 있습니다.`);
      return;
    }

    const uploadTargets = files.slice(0, remainingSlots);

    setIsUploadingImage(true);
    setUploadProgressPercent(0);
    setErrorMessage(null);

    try {
      const uploadedUrls = await uploadFilesWithPresign({
        presignPath: PRESIGN_PATHS.noticeImage,
        files: uploadTargets,
        onProgress: setUploadProgressPercent,
      });
      appendExistingUrls(uploadedUrls);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(readNoticeErrorMessage(error));
    } finally {
      setIsUploadingImage(false);
      setUploadProgressPercent(null);
    }
  };

  const removeImageUrl = (targetId: string) => {
    removeItemById(targetId);
  };

  const handleOpenImageFilePicker = () => {
    if (isImageUploadDisabled) {
      return;
    }

    imageFileInputRef.current?.click();
  };

  const handleSubmit = async () => {

    const nextTitle = title.trim();
    if (!nextTitle || !hasMeaningfulRichTextHtml(content)) {
      setErrorMessage("제목과 본문을 모두 입력해 주세요.");
      return;
    }

    const normalizedImageUrls = normalizeNoticeImageUrls(imageUrls);

    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (scope === "generation") {
        if (!generationId) {
          throw new Error("기수 정보가 없습니다.");
        }

        await adminResourceApi.updateGenerationNotice(generationId, noticeId, {
          title: nextTitle,
          content,
          imageUrls: normalizedImageUrls,
        });
      } else {
        await adminResourceApi.updateGlobalNotice(noticeId, {
          title: nextTitle,
          content,
          imageUrls: normalizedImageUrls,
        });
      }

      router.replace(detailPath);
      router.refresh();
    } catch (error) {
      setErrorMessage(readNoticeErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  if (!canWrite) {
    return (
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
        <div className="space-y-3" aria-hidden="true">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-3 w-full max-w-md" />
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
        <div className="space-y-4" aria-hidden="true">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-3 w-full max-w-lg" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-10 w-24" />
        </div>
      </section>
    );
  }

  if (isNotFound) {
    return (
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">{heading}</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          존재하지 않는 공지이거나 접근할 수 없습니다.
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
        Notices
      </p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">{heading}</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 md:text-base">
        {description}
      </p>
      {noticeMeta ? (
        <LastUpdatedMeta
          updatedAt={noticeMeta.updatedAt}
          updatedBy={noticeMeta.updatedBy}
          className="mt-2 text-xs text-slate-600 dark:text-slate-300"
        />
      ) : null}

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <form
        className="mt-6 space-y-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4"
        action={handleSubmit}
      >
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">공지 수정</p>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={isSaving || isUploadingImage}
          placeholder="공지 제목"
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
        />

        <div className="space-y-1">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">공지 내용</span>
          <RichTextEditor
            value={content}
            onChange={setContent}
            disabled={isSaving || isUploadingImage}
          />
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">첨부 이미지</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">최대 {NOTICE_MAX_IMAGES}장</p>

          <button
            type="button"
            data-testid="notice-edit-upload"
            onClick={handleOpenImageFilePicker}
            disabled={isImageUploadDisabled}
            className="mt-3 inline-flex rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            파일 업로드
          </button>
          <input
            ref={imageFileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUploadImage}
            disabled={isImageUploadDisabled}
            className="sr-only"
          />

          {isUploadingImage ? (
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">이미지 업로드 중...</p>
          ) : null}
          {!isUploadingImage && imageUrls.length >= NOTICE_MAX_IMAGES ? (
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              최대 {NOTICE_MAX_IMAGES}장까지 등록되어 추가 업로드가 비활성화되었습니다.
            </p>
          ) : null}
          <UploadProgressBar
            progressPercent={uploadProgressPercent}
            label="첨부 이미지 업로드 진행률"
          />

          <div className="mt-3 space-y-2">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              마우스로 끌어 이미지 순서를 바꿀 수 있습니다.
            </p>
            <SortableImageGrid
              items={imageItems.map((image, index) => ({
                id: image.id,
                imageUrl: image.imageUrl,
                label: `첨부 이미지 ${index + 1}`,
                alt: "공지 첨부 이미지",
              }))}
              onReorder={(nextItems) => reorderByIds(nextItems.map((item) => item.id))}
              onRemoveItem={removeImageUrl}
              disabled={isSaving || isUploadingImage}
              emptyMessage="첨부된 이미지가 없습니다."
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FormSubmitButton
            data-testid="notice-edit-submit"
            disabled={isSaving || isUploadingImage}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            idleLabel="저장"
            pendingLabel="저장 중..."
          />
          <Link
            href={detailPath}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            취소
          </Link>
        </div>
      </form>

      <div className="mt-6">
        <AuditHistoryPanel
          resourceType={scope === "generation" ? "generation_notice" : "global_notice"}
          resourceId={noticeId}
        />
      </div>
    </section>
  );
}
