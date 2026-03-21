import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  listPublicActivities,
  safeList,
} from "@/features/public/services/public-read-service";
import { formatKoreanDateRange } from "@/shared/utils/date-formatters";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";
import { createPageMetadata } from "@/features/seo/metadata/seo";
import PageTitleHero from "@/app/(home)/_components/page-title-hero";

export const metadata: Metadata = createPageMetadata({
  title: "활동 기록 | 연영회",
  description: "연영회의 활동 기록을 사진 중심 아카이브로 확인하세요.",
  path: "/archive/records",
  keywords: ["연영회 활동 기록", "사진 동아리 활동", "연세대 연영회 아카이브"],
});

const getArchiveRecords = async () => {
  return safeList(listPublicActivities, []);
};

export default async function ArchiveRecordsPage() {
  const activities = await getArchiveRecords();

  return (
    <div className="min-h-screen bg-(--bg-primary)">
      <div className="mx-auto max-w-300 px-4 md:px-8">
        <PageTitleHero title="활동 기록" />
      </div>

      <div className="pb-16">
        {activities.length === 0 ? (
          <div className="mx-auto max-w-[1400px] px-4 md:px-8">
            <p className="text-center text-base text-(--text-muted)">준비 중입니다.</p>
          </div>
        ) : (
          <div
            className="mx-auto grid max-w-[1400px] [grid-template-columns:repeat(4,minmax(0,1fr))] gap-6 px-4 md:px-8 max-[1024px]:[grid-template-columns:repeat(auto-fit,minmax(180px,1fr))] max-[768px]:grid-cols-1 max-[768px]:gap-3"
            data-testid="archive-records-grid"
          >
            {activities.map((activity) => (
              <Link
                key={activity.id}
                href={`/archive/records/${activity.id}`}
                className="group relative block aspect-[4/3] cursor-pointer overflow-hidden bg-(--surface-border) transition-transform duration-300 hover:scale-[1.02]"
                data-testid={`archive-record-card-${activity.id}`}
                aria-label={`${activity.title} 상세 보기`}
              >
                <div className="relative h-full w-full">
                  <Image
                    src={activity.coverImageUrl}
                    alt={activity.title}
                    fill
                    unoptimized={shouldUseUnoptimizedImage(activity.coverImageUrl)}
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(0,0,0,0.7)] to-transparent p-4 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 max-[768px]:opacity-100 md:p-6">
                  <div className="flex flex-col gap-1">
                    <h3 className="m-0 text-[0.9rem] leading-[1.4] font-semibold text-white md:text-[1.1rem]">
                      {activity.title}
                    </h3>
                    <span className="text-[0.85rem] opacity-80">
                      {formatKoreanDateRange(activity.startDate, activity.endDate)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
