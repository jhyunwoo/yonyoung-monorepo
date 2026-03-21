"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ApiExhibition } from "@/shared/contracts/api-contracts";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import { formatKoreanDate, formatKoreanDateRange } from "@/shared/utils/date-formatters";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";
import { RichTextContent } from "@/features/media/rich-text/rich-text-content";
import { Skeleton } from "@/components/ui/skeleton";
import AuditHistoryPanel from "@/app/(dashboard)/_components/audit-history-panel";
import LastUpdatedMeta from "@/app/(dashboard)/_components/last-updated-meta";
import { readExhibitionErrorMessage } from "@/app/(dashboard)/dashboard/[generationName]/exhibitions/_components/exhibition-shared";

type GenerationExhibitionDetailProps = {
  exhibitionId: string;
  generationId: string;
  generationName: string;
  generationPath: string;
  canManage: boolean;
  canDelete: boolean;
};

export default function GenerationExhibitionDetail({
  exhibitionId,
  generationId,
  generationName,
  generationPath,
  canManage,
  canDelete,
}: GenerationExhibitionDetailProps) {
  const router = useRouter();
  const [exhibition, setExhibition] = useState<ApiExhibition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const row = await adminResourceApi.getExhibitionById(exhibitionId);

        if (!mounted) {
          return;
        }

        if (row.generationId !== generationId) {
          router.replace(`${generationPath}/exhibitions`);
          return;
        }

        setExhibition(row);
      } catch (error) {
        if (!mounted) {
          return;
        }
        setExhibition(null);
        setErrorMessage(readExhibitionErrorMessage(error));
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
  }, [exhibitionId, generationId, generationPath, router]);

  const detailImageUrls = useMemo(() => {
    if (!exhibition) {
      return [];
    }

    if (exhibition.detailImages.length === 0) {
      return [exhibition.coverImageUrl];
    }

    return exhibition.detailImages
      .slice()
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((image) => image.imageUrl);
  }, [exhibition]);

  const handleDelete = async () => {
    if (!exhibition || !canDelete || isDeleting) {
      return;
    }

    const confirmed = window.confirm("정말 이 전시를 삭제하시겠습니까?");
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await adminResourceApi.deleteExhibition(exhibition.id);
      router.push(`${generationPath}/exhibitions`);
    } catch (error) {
      setErrorMessage(readExhibitionErrorMessage(error));
      setIsDeleting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-600 dark:text-slate-300 uppercase">
            Exhibitions
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">
            {generationName} 전시 상세
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            전시 정보와 사진을 확인할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage ? (
            <Link
              href={`${generationPath}/exhibitions/${exhibitionId}/edit`}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              수정
            </Link>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              data-testid="generation-exhibition-delete"
              onClick={handleDelete}
              disabled={isLoading || isDeleting || exhibition === null}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? "삭제 중..." : "삭제"}
            </button>
          ) : null}
          <Link
            href={`${generationPath}/exhibitions`}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            목록으로
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-6" aria-hidden="true">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="mt-2 h-4 w-40" />
            <Skeleton className="mt-2 h-4 w-52" />
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-5/6" />
            <Skeleton className="mt-1 h-4 w-2/3" />
            <Skeleton className="mt-3 h-3 w-28" />
            <Skeleton className="mt-1 h-3 w-36" />
          </div>
          <div>
            <Skeleton className="h-4 w-14" />
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton
                  key={`exhibition-detail-image-loading-${index + 1}`}
                  className="aspect-[4/3] w-full rounded-xl"
                />
              ))}
            </div>
          </div>
        </div>
      ) : errorMessage ? (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : exhibition ? (
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-xl font-semibold text-slate-900 dark:text-slate-50">{exhibition.title}</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {formatKoreanDateRange(exhibition.startDate, exhibition.endDate)}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">장소: {exhibition.place}</p>
            <div className="mt-3">
              <RichTextContent html={exhibition.description} />
            </div>
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
              생성일: {formatKoreanDate(exhibition.createdAt)}
            </p>
            <LastUpdatedMeta
              updatedAt={exhibition.updatedAt}
              updatedBy={exhibition.updatedBy}
              className="mt-1 text-xs text-slate-600 dark:text-slate-300"
            />
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">이미지</p>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {detailImageUrls.map((imageUrl, index) => (
                <div
                  key={`${exhibition.id}-${index}-${imageUrl}`}
                  className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700"
                >
                  <Image
                    src={imageUrl}
                    alt={`${exhibition.title} 이미지 ${index + 1}`}
                    fill
                    className="object-cover"
                    unoptimized={shouldUseUnoptimizedImage(imageUrl)}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {exhibition ? (
        <div className="mt-6">
          <AuditHistoryPanel resourceType="exhibition" resourceId={exhibition.id} />
        </div>
      ) : null}
    </section>
  );
}
