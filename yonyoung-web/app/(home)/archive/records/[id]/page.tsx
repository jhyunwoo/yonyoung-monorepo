import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicActivityById } from "@/features/public/services/public-read-service";
import { formatKoreanDateRange } from "@/shared/utils/date-formatters";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";
import { RichTextContent } from "@/features/media/rich-text/rich-text-content";
import { createPageMetadata } from "@/features/seo/metadata/seo";

export const metadata: Metadata = createPageMetadata({
  title: "활동 기록 상세 | 연영회",
  description: "연영회 활동 기록 상세를 확인하세요.",
  path: "/archive/records",
});

type RecordDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RecordDetailPage({ params }: RecordDetailPageProps) {
  const { id } = await params;
  const activity = await getPublicActivityById(id).catch(() => null);

  if (!activity) {
    notFound();
  }

  const imageUrls =
    activity.detailImages.length > 0
      ? activity.detailImages
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((image) => image.imageUrl)
      : [activity.coverImageUrl];

  return (
    <div className="min-h-screen bg-(--bg-primary) pb-9 pt-3 md:pb-12 md:pt-4">
      <div className="mx-auto max-w-[1200px] px-4 md:px-8">
        <header className="mb-8">
          <Link
            href="/archive/records"
            className="mb-4 inline-flex text-[0.9rem] text-(--text-primary) no-underline hover:underline"
          >
            활동 기록으로 돌아가기
          </Link>
          <h1 className="m-0 text-[1.7rem] font-bold text-(--text-primary) md:text-[2rem]">
            {activity.title}
          </h1>
          <p className="mb-0 mt-3 text-[0.95rem] text-(--text-muted)">
            {formatKoreanDateRange(activity.startDate, activity.endDate)}
          </p>
          <RichTextContent
            html={activity.description}
            className="record-description mb-0 mt-3 leading-[1.6]"
          />
        </header>

        <section
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          data-testid="record-detail-gallery"
        >
          {imageUrls.map((imageUrl, index) => (
            <div
              key={`${activity.id}-${imageUrl}-${index}`}
              className="relative aspect-[4/3] w-full overflow-hidden border border-(--surface-border) bg-(--surface-muted)"
            >
              <Image
                src={imageUrl}
                alt={`${activity.title} 상세 이미지 ${index + 1}`}
                fill
                unoptimized={shouldUseUnoptimizedImage(imageUrl)}
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
