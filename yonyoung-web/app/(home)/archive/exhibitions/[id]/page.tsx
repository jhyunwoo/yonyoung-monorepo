import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicExhibitionById } from "@/features/public/services/public-read-service";
import { formatKoreanDateCompact } from "@/shared/utils/date-formatters";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";
import { RichTextContent } from "@/features/media/rich-text/rich-text-content";
import { createPageMetadata } from "@/features/seo/metadata/seo";

export const metadata: Metadata = createPageMetadata({
  title: "전시 아카이브 상세 | 연영회",
  description: "연영회 전시 아카이브 상세를 확인하세요.",
  path: "/archive/exhibitions",
});

type ExhibitionDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ExhibitionDetailPage({
  params,
}: ExhibitionDetailPageProps) {
  const { id } = await params;
  const exhibition = await getPublicExhibitionById(id).catch(() => null);

  if (!exhibition) {
    notFound();
  }

  const imageUrls =
    exhibition.detailImages.length > 0
      ? exhibition.detailImages
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((image) => image.imageUrl)
      : [exhibition.coverImageUrl];

  return (
    <div className="min-h-screen bg-(--bg-primary) pb-9 pt-3 md:pb-12 md:pt-4">
      <div className="mx-auto max-w-[1200px] px-4 md:px-8">
        <header className="mb-8">
          <Link
            href="/archive/exhibitions"
            className="mb-4 inline-flex text-[0.9rem] text-(--text-primary) no-underline hover:underline"
          >
            전시 아카이브로 돌아가기
          </Link>
          <h1 className="m-0 text-[1.7rem] font-bold text-(--text-primary) md:text-[2rem]">
            {exhibition.title}
          </h1>
          <p className="mb-0 mt-3 text-[0.95rem] text-(--text-muted)">
            {formatKoreanDateCompact(exhibition.startDate)} ~{" "}
            {formatKoreanDateCompact(exhibition.endDate)}
          </p>
          <p className="mb-0 mt-[0.4rem] text-(--text-secondary)">{exhibition.place}</p>
          <RichTextContent
            html={exhibition.description}
            className="exhibition-description mb-0 mt-3 leading-[1.6]"
          />
        </header>

        <section
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          data-testid="exhibition-detail-gallery"
        >
          {imageUrls.map((imageUrl, index) => (
            <div
              key={`${exhibition.id}-${imageUrl}-${index}`}
              className="relative aspect-[2/3] w-full overflow-hidden border border-(--surface-border) bg-(--surface-muted)"
            >
              <Image
                src={imageUrl}
                alt={`${exhibition.title} 상세 이미지 ${index + 1}`}
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
