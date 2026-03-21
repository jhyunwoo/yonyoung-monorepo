import type { Metadata } from "next";
import { DEFAULT_SITE_SETTINGS } from "@/shared/contracts/api-contracts";
import { createPageMetadata } from "@/features/seo/metadata/seo";
import { getPublicSiteSettings } from "@/features/public/services/public-read-service";
import PageTitleHero from "@/app/(home)/_components/page-title-hero";

export const metadata: Metadata = createPageMetadata({
  title: "후원 안내 | 연영회",
  description: "연영회 후원 안내, 후원 방법, 후원금 사용 내역, 문의 정보를 확인하세요.",
  path: "/donate",
  keywords: ["연영회 후원", "DONATE US", "연영회 후원 안내", "후원금 사용 내역"],
});

export default async function DonatePage() {
  const siteSettings = await getPublicSiteSettings().catch(() => DEFAULT_SITE_SETTINGS);

  return (
    <div className="min-h-screen bg-(--bg-primary)">
      <div className="mx-auto max-w-300 px-4 md:px-8">
        <PageTitleHero
          title="후원 안내"
          description={
            <>
              연영회의 활동 후원해 주시면
              <br />더 좋은 사진과 전시로 보답하겠습니다.
            </>
          }
        />

        <section className="mx-auto max-w-200">
          <div className="mb-16">
            <h2 className="mb-6 border-b-2 border-(--surface-strong-border) pb-2 text-[1.75rem] leading-[1.3] font-semibold text-(--text-primary) md:text-[2.5rem]">
              후원 안내
            </h2>
            <p className="text-base leading-[1.8] text-(--text-muted)">
              연영회는 여러분의 후원으로 더 나은 활동을 이어갈 수 있습니다. 후원금은
              전시회 개최, 장비 구매, 워크샵 운영 등에 사용됩니다.
            </p>
          </div>

          <div className="mb-16">
            <h2 className="mb-6 border-b-2 border-(--surface-strong-border) pb-2 text-[1.75rem] leading-[1.3] font-semibold text-(--text-primary) md:text-[2.5rem]">
              후원 방법
            </h2>
            <div className="grid gap-8 md:grid-cols-2">
              <div className="rounded-lg border border-(--surface-border) bg-(--surface-elevated) p-6 shadow-[0_2px_4px_var(--shadow-strong)] md:p-8">
                <h3 className="mb-4 text-[1.8rem] leading-[1.4] font-semibold text-(--text-primary) md:text-[2rem]">
                  계좌 이체
                </h3>
                <div className="mt-4 rounded-[5px] border border-(--surface-border) bg-(--surface-muted) p-6">
                  <p className="mb-2 font-mono text-[1.1rem] text-(--text-muted)">
                    은행: {siteSettings.donateBankName}
                  </p>
                  <p className="mb-2 font-mono text-[1.1rem] text-(--text-muted)">
                    계좌번호: {siteSettings.donateAccountNumber}
                  </p>
                  <p className="font-mono text-[1.1rem] text-(--text-muted)">
                    예금주: {siteSettings.donateAccountHolder}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-(--surface-border) bg-(--surface-elevated) p-6 shadow-[0_2px_4px_var(--shadow-strong)] md:p-8">
                <h3 className="mb-4 text-[1.8rem] leading-[1.4] font-semibold text-(--text-primary) md:text-[2rem]">
                  후원금 사용 내역
                </h3>
                <div className="grid gap-4">
                  <div className="rounded-[5px] border-l-4 border-(--surface-strong-border) bg-(--surface-muted) p-4">
                    <h4 className="mb-2 text-[1.1rem] leading-[1.4] font-medium text-(--text-primary)">
                      전시회 개최
                    </h4>
                    <p className="text-sm leading-[1.6] text-(--text-muted)">
                      갤러리 대관 및 전시 준비 비용
                    </p>
                  </div>
                  <div className="rounded-[5px] border-l-4 border-(--surface-strong-border) bg-(--surface-muted) p-4">
                    <h4 className="mb-2 text-[1.1rem] leading-[1.4] font-medium text-(--text-primary)">
                      장비 유지보수
                    </h4>
                    <p className="text-sm leading-[1.6] text-(--text-muted)">
                      카메라, 렌즈 등 촬영 장비 구매
                    </p>
                  </div>
                  <div className="rounded-[5px] border-l-4 border-(--surface-strong-border) bg-(--surface-muted) p-4">
                    <h4 className="mb-2 text-[1.1rem] leading-[1.4] font-medium text-(--text-primary)">
                      동아리 행사 운영비
                    </h4>
                    <p className="text-sm leading-[1.6] text-(--text-muted)">
                      사진 기술 교육 및 워크샵 비용
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-16 flex flex-col items-center justify-center gap-2 rounded-xl border border-(--surface-border) bg-(--surface-elevated) p-8 text-sm text-(--text-muted) shadow-[0_2px_4px_var(--shadow-strong)]">
            <p>
              후원해 주신 분들의 성함은 전시회에 특별히 감사의 말씀과 함께 소개됩니다.
            </p>
            <p>작은 관심과 응원이 저희에게 큰 힘이 됩니다.</p>
            <p>후원금 사용 내역은 60기 운영진으로 연락주시면 열람하실 수 있습니다.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
