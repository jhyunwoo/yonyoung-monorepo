import Link from "next/link";
import type { Metadata } from "next";
import {
  listPublicPhotographers,
  safeList,
} from "@/features/public/services/public-read-service";
import { formatKoreanYearRange } from "@/shared/utils/date-formatters";
import { createPageMetadata } from "@/features/seo/metadata/seo";
import GenerationMembersGrid from "@/app/(home)/about/photographers/generation-members-grid";

export const metadata: Metadata = createPageMetadata({
  title: "PHOTOGRAPHERS | 연영회",
  description:
    "연영회 기수별 사진가(멤버) 목록입니다. 데이터베이스에 등록된 기수/멤버 정보를 기반으로 표시합니다.",
  path: "/about/photographers",
  keywords: ["연영회", "Photographers", "연영회 멤버", "기수별 멤버"],
});

export default async function PhotographersPage() {
  const generations = await safeList(listPublicPhotographers, []);

  return (
    <div
      className="bg-(--bg-primary) pb-14 md:pb-20 md:pt-10"
      data-testid="about-photographers-page"
    >
      <main
        className="mx-auto w-full max-w-300 space-y-10 px-4 md:space-y-20 md:px-8"
        data-testid="about-photographers-main"
      >
        <section className="space-y-6 pt-6 md:space-y-10 md:pt-10">
          <h1 className="text-4xl leading-none font-normal tracking-[-0.02em] text-(--text-primary) md:text-6xl">
            PHOTOGRAPHERS
          </h1>
          {generations.length > 0 ? (
            <nav aria-label="기수 바로가기">
              <ul className="flex flex-wrap items-center gap-x-6 gap-y-1 md:gap-x-8 md:gap-y-2">
                {generations.map((generation) => (
                  <li key={`photographers-anchor-${generation.id}`}>
                    <Link
                      href={`#gen-${generation.sortOrder}`}
                      className="inline-flex text-base leading-tight font-normal text-(--text-muted) transition-colors hover:text-(--text-primary) md:text-lg"
                    >
                      {generation.sortOrder}기
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          <div className="h-px w-full bg-(--surface-border)" />
        </section>

        {generations.length === 0 ? (
          <section className="border border-(--surface-border) p-5 text-sm text-(--text-muted)">
            공개된 기수 정보가 없습니다.
          </section>
        ) : (
          <section
            className="space-y-12 md:space-y-16"
            data-testid="about-photographers-generations"
          >
            {generations.map((generation) => (
              <article
                key={generation.id}
                id={`gen-${generation.sortOrder}`}
                className="scroll-mt-[calc(var(--public-header-height-mobile)+16px)] space-y-6 md:scroll-mt-[calc(var(--public-header-height-desktop)+40px)] md:space-y-8"
                data-testid={`about-photographers-generation-${generation.id}`}
              >
                <header>
                  <div className="inline-flex flex-col items-start">
                    <h2 className="text-xl leading-none font-medium tracking-tight text-(--text-primary) md:text-2xl underline underline-offset-4  ">
                      {generation.sortOrder}기
                    </h2>
                  </div>
                  <p className="sr-only">
                    {generation.name} ·{" "}
                    {formatKoreanYearRange(generation.startDate, generation.endDate)}
                  </p>
                </header>

                {generation.members.length === 0 ? (
                  <p className="text-sm text-(--text-muted)">등록된 멤버가 없습니다.</p>
                ) : (
                  <GenerationMembersGrid generation={generation} />
                )}
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
