"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import { uploadFilesWithPresign } from "@/features/dashboard/api/admin-api/upload-batch";
import {
  PRESIGN_PATHS,
  uploadWithPresign,
} from "@/features/dashboard/api/admin-api/upload";
import {
  readFileList,
  type UploadImageItem,
} from "@/features/media/upload/image-upload-state";
import { useImageUploadState } from "@/features/media/upload/use-image-upload-state";
import FormSubmitButton from "@/app/(dashboard)/_components/form-submit-button";
import SortableImageGrid from "@/app/(dashboard)/_components/sortable-image-grid";
import UploadProgressBar from "@/app/(dashboard)/_components/upload-progress-bar";
import ExhibitionRichTextEditor from "@/app/(dashboard)/dashboard/[generationName]/exhibitions/_components/exhibition-rich-text-editor";
import {
  hasMeaningfulExhibitionDescription,
  readExhibitionErrorMessage,
  validateExhibitionDateRange,
} from "@/app/(dashboard)/dashboard/[generationName]/exhibitions/_components/exhibition-shared";

type ExhibitionCreateFormProps = {
  generationId: string;
  generationPath: string;
  generationName: string;
};

const EMPTY_DESCRIPTION_HTML = "<p></p>";

export default function ExhibitionCreateForm({
  generationId,
  generationPath,
  generationName,
}: ExhibitionCreateFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState(EMPTY_DESCRIPTION_HTML);
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const detailFileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    items: detailImages,
    appendFiles,
    removeItemById,
    reorderByIds,
  } = useImageUploadState();
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    };
  }, [coverPreviewUrl]);

  const isSubmitDisabled = useMemo(() => {
    return (
      isSaving ||
      title.trim().length === 0 ||
      place.trim().length === 0 ||
      !hasMeaningfulExhibitionDescription(descriptionHtml) ||
      startDateInput.trim().length === 0 ||
      endDateInput.trim().length === 0 ||
      coverFile === null
    );
  }, [coverFile, descriptionHtml, endDateInput, isSaving, place, startDateInput, title]);

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

  const handleDetailFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
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
    removeItemById(imageId);
  };

  const handleSubmit = async () => {
    setErrorMessage(null);

    const trimmedTitle = title.trim();
    const trimmedPlace = place.trim();

    if (!trimmedTitle || !trimmedPlace) {
      setErrorMessage("전시 제목과 장소를 모두 입력해 주세요.");
      return;
    }

    if (!hasMeaningfulExhibitionDescription(descriptionHtml)) {
      setErrorMessage("전시 상세 설명을 입력해 주세요.");
      return;
    }

    if (!coverFile) {
      setErrorMessage("대표 이미지 파일을 선택해 주세요.");
      return;
    }

    const dateRangeResult = validateExhibitionDateRange({
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
      const newDetailImages = detailImages.filter(
        (image): image is UploadImageItem & { file: File } => image.file !== null,
      );
      const totalUploadCount = 1 + newDetailImages.length;
      let coverUploadProgress = 0;
      let detailUploadProgress = 0;
      const updateUploadProgress = () => {
        if (totalUploadCount <= 0) {
          setUploadProgressPercent(null);
          return;
        }

        const weightedProgress =
          (coverUploadProgress + detailUploadProgress * newDetailImages.length) /
          totalUploadCount;
        setUploadProgressPercent(Math.round(weightedProgress));
      };

      const coverImageUrl = await uploadWithPresign({
        presignPath: PRESIGN_PATHS.exhibitionCover,
        file: coverFile,
        onProgress: (progressPercent) => {
          coverUploadProgress = progressPercent;
          updateUploadProgress();
        },
      });

      const createdExhibition = await adminResourceApi.createExhibition({
        title: trimmedTitle,
        place: trimmedPlace,
        description: descriptionHtml,
        startDate: dateRangeResult.startDate,
        endDate: dateRangeResult.endDate,
        coverImageUrl,
        generationId,
      });

      if (newDetailImages.length > 0) {
        try {
          const uploadedDetailUrls = await uploadFilesWithPresign({
            presignPath: PRESIGN_PATHS.exhibitionDetail,
            files: newDetailImages.map((image) => image.file),
            onProgress: (progressPercent) => {
              detailUploadProgress = progressPercent;
              updateUploadProgress();
            },
          });

          await adminResourceApi.addExhibitionImages(
            createdExhibition.id,
            uploadedDetailUrls.map((imageUrl, index) => ({
              imageUrl,
              sortOrder: index,
            })),
          );
        } catch (detailUploadError) {
          const detailUploadMessage = readExhibitionErrorMessage(detailUploadError);
          const params = new URLSearchParams({
            error: "detail-upload-failed",
            message: detailUploadMessage,
          });
          router.push(
            `${generationPath}/exhibitions/${createdExhibition.id}/edit?${params.toString()}`,
          );
          return;
        }
      }

      router.push(`${generationPath}/exhibitions/${createdExhibition.id}`);
    } catch (error) {
      setErrorMessage(readExhibitionErrorMessage(error));
    } finally {
      setIsSaving(false);
      setUploadProgressPercent(null);
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-600 dark:text-slate-300 uppercase">
        Exhibitions
      </p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">
        {generationName} 전시 추가
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 md:text-base">
        대표 사진은 꼭 등록해야 하며, 세부 사진은 필요할 때 여러 장 추가할 수 있습니다.
      </p>

      <form className="mt-6 space-y-4" action={handleSubmit}>
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">전시 제목</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={isSaving}
            placeholder="예: 연영회 60기 정기전"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">전시 장소</span>
          <input
            value={place}
            onChange={(event) => setPlace(event.target.value)}
            disabled={isSaving}
            placeholder="예: 서울시립미술관"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
        </label>

        <div className="space-y-1">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">전시 상세 설명</span>
          <ExhibitionRichTextEditor
            value={descriptionHtml}
            onChange={setDescriptionHtml}
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

        <label className="block space-y-1">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">대표 이미지 (필수)</span>
          <button
            type="button"
            data-testid="exhibition-create-cover-select"
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
            {coverFile ? `선택됨: ${coverFile.name}` : "아직 파일이 선택되지 않았습니다."}
          </p>
          {coverPreviewUrl ? (
            <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverPreviewUrl}
                alt="대표 이미지 미리보기"
                className="h-full w-full object-cover"
              />
            </div>
          ) : null}
        </label>

        <div className="space-y-2">
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              세부 이미지 (선택, 여러 장)
            </span>
            <button
              type="button"
              data-testid="exhibition-create-detail-select"
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
              onChange={handleDetailFilesChange}
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
              label: image.file?.name ?? `세부 이미지 ${index + 1}`,
              subtitle: `순서 ${index + 1}`,
            }))}
            onReorder={(nextItems) => reorderByIds(nextItems.map((item) => item.id))}
            onRemoveItem={handleRemoveDetailImage}
            disabled={isSaving}
            emptyMessage="추가할 세부 이미지가 없으면 비워 두세요."
          />
          <UploadProgressBar
            progressPercent={uploadProgressPercent}
            label="사진 업로드 진행률"
          />
        </div>

        {errorMessage ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <FormSubmitButton
            data-testid="exhibition-create-submit"
            disabled={isSubmitDisabled}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            idleLabel="전시 생성"
            pendingLabel="저장 중..."
          />
          <Link
            href={`${generationPath}/exhibitions`}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            목록으로
          </Link>
        </div>
      </form>
    </section>
  );
}
