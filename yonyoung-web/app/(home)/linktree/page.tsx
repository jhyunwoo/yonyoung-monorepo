import type { Metadata } from "next";
import {
  listPublicLinktrees,
  safeList,
} from "@/features/public/services/public-read-service";
import { createPageMetadata } from "@/features/seo/metadata/seo";
import PageTitleHero from "@/app/(home)/_components/page-title-hero";

export const metadata: Metadata = createPageMetadata({
  title: "LINKTREE | 연영회",
  description: "연영회 공식 SNS, 문의 채널, 활동 관련 외부 링크를 한 곳에서 확인하세요.",
  path: "/linktree",
  keywords: ["연영회 링크", "연영회 SNS", "연영회 문의", "Linktree"],
});

export default async function LinktreePage() {
  const linktrees = await safeList(listPublicLinktrees, []);

  return (
    <div className="min-h-screen bg-(--bg-primary)">
      <div className="mx-auto max-w-[1200px] px-4 md:px-8">
        <PageTitleHero title="LINKTREE" description="연영회 공식 채널 및 서비스" />

        <section
          className="mx-auto grid max-w-[1400px] grid-cols-5 gap-6 px-8 pb-16 max-[1200px]:grid-cols-3 max-[900px]:grid-cols-2 max-[768px]:grid-cols-1 max-[768px]:gap-6 max-[768px]:px-6 max-[768px]:pb-12"
          data-testid="linktree-groups"
        >
          {linktrees.length === 0 ? (
            <div className="flex flex-col gap-6">
              <h2 className="mb-2 border-b-2 border-(--surface-border) pb-2 text-center text-[1.1rem] font-bold text-(--text-primary)">
                링크
              </h2>
              <div className="border border-dashed border-(--surface-border) bg-(--surface-elevated) p-8 text-center text-[0.9rem] text-(--text-muted)">
                <span>준비 중입니다.</span>
              </div>
            </div>
          ) : (
            linktrees.map((group) => (
              <article
                key={group.id}
                className="flex flex-col gap-6"
                data-testid={`linktree-group-card-${group.id}`}
              >
                <h2 className="mb-2 border-b-2 border-(--surface-border) pb-2 text-center text-[1.1rem] font-bold text-(--text-primary)">
                  {group.name}
                </h2>
                <div className="flex flex-col gap-4">
                  {group.items.length > 0 ? (
                    group.items.map((item) => (
                      <a
                        key={item.id}
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full flex-row items-center justify-center border border-(--surface-border) bg-(--surface-elevated) px-4 py-[1.2rem] text-center text-(--text-primary) no-underline shadow-[0_4px_12px_var(--shadow-strong)] transition-all duration-200 hover:-translate-y-[2px] hover:border-(--surface-strong-border) hover:bg-(--surface-muted)"
                        data-testid={`linktree-item-card-${item.id}`}
                      >
                        <span className="text-[0.95rem] font-semibold tracking-[0.02em]">
                          {item.name}
                        </span>
                      </a>
                    ))
                  ) : (
                    <div className="border border-dashed border-(--surface-border) bg-(--surface-elevated) p-8 text-center text-[0.9rem] text-(--text-muted)">
                      <span>준비 중입니다.</span>
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
