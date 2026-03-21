import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  listPublicExhibitions,
  safeList,
} from "@/features/public/services/public-read-service";
import { formatKoreanDateCompact } from "@/shared/utils/date-formatters";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";
import { createPageMetadata } from "@/features/seo/metadata/seo";
import PageTitleHero from "@/app/(home)/_components/page-title-hero";

export const metadata: Metadata = createPageMetadata({
  title: "전시회 | 연영회",
  description: "연영회의 전시 기록을 일정, 장소, 이미지와 함께 확인하세요.",
  path: "/archive/exhibitions",
  keywords: ["연영회 전시", "연영회 전시 아카이브", "대학생 사진 전시"],
});

const getArchiveExhibitions = async () => {
  return safeList(listPublicExhibitions, []);
};

export default async function ArchiveExhibitionsPage() {
  const exhibitions = await getArchiveExhibitions();

  return (
    <div className="min-h-screen bg-(--bg-primary)">
      <div className="mx-auto max-w-300 px-4 md:px-8">
        <PageTitleHero title="전시회" />
      </div>

      <div className="pb-16">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8">
          {exhibitions.length === 0 ? (
            <div className="py-16 text-center text-(--text-muted)">
              <p>전시 정보가 없습니다.</p>
            </div>
          ) : (
            <section
              className="mx-auto grid max-w-[1060px] grid-cols-3 gap-10 px-8 max-[768px]:max-w-[400px] max-[768px]:grid-cols-1 max-[768px]:gap-8 max-[768px]:px-6"
              data-testid="archive-exhibitions-grid"
            >
              {exhibitions.map((exhibition) => (
                <Link
                  key={exhibition.id}
                  href={`/archive/exhibitions/${exhibition.id}`}
                  className="group relative block aspect-[2/3] w-full cursor-pointer overflow-hidden bg-black shadow-[0_4px_15px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-[5px] hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)]"
                  data-testid={`archive-exhibition-card-${exhibition.id}`}
                  aria-label={`${exhibition.title} 상세 보기`}
                >
                  <div className="absolute inset-0">
                    <Image
                      src={exhibition.coverImageUrl}
                      alt={exhibition.title}
                      fill
                      unoptimized={shouldUseUnoptimizedImage(exhibition.coverImageUrl)}
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 z-[2] flex min-h-1/2 flex-col justify-end bg-gradient-to-t from-[rgba(0,0,0,0.9)] via-[rgba(0,0,0,0.6)] to-transparent px-6 pb-6 pt-12 text-white">
                    <h2 className="mb-2 text-[1.15rem] leading-[1.3] text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.5)]">
                      {exhibition.title}
                    </h2>
                    <p className="mb-1 text-[0.9rem] font-semibold text-[rgba(255,255,255,0.95)] [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
                      {formatKoreanDateCompact(exhibition.startDate)} ~{" "}
                      {formatKoreanDateCompact(exhibition.endDate)}
                    </p>
                    <p className="mb-0 text-[0.85rem] text-[rgba(255,255,255,0.85)] [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
                      {exhibition.place}
                    </p>
                  </div>
                </Link>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
