import type { Metadata } from "next";
import { headers } from "next/headers";
import { createPageMetadata } from "@/features/seo/metadata/seo";
import { getPublicCurrentRecruitingPlan } from "@/features/public/services/public-read-service";
import {
  HIGH_CONTRAST_RICH_TEXT_CLASS_NAMES,
  RichTextContent,
} from "@/features/media/rich-text/rich-text-content";
import PageTitleHero from "@/app/(home)/_components/page-title-hero";

const qualificationItems = [
  "사진에 대한 열정과 관심이 있는 분",
  "정기 활동 참여가 가능한 분",
  "1년 동안 사진을 정말로 즐기실 분",
];

const applicationSteps = [
  {
    title: "지원서 작성",
    description: "지원서를 작성하여 제출해주세요.",
  },
  {
    title: "면접",
    description: "지원서 검토 후 면접을 진행합니다.",
  },
  {
    title: "합격 통보",
    description: "합격자에게 개별적으로 연락드립니다.",
  },
];

export const metadata: Metadata = createPageMetadata({
  title: "RECRUITING | 연영회",
  description:
    "연영회 리크루팅 안내 페이지입니다. 올해 모집 계획, 모집 일정, 지원 자격, 지원 방법을 확인할 수 있습니다.",
  path: "/about/recruiting",
  keywords: ["연영회 리크루팅", "연영회 모집", "동아리 모집", "RECRUITING"],
});

const koreanDateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Seoul",
});

const formatKoreanDateTime = (timestampMs: number): string => {
  return koreanDateTimeFormatter.format(timestampMs);
};

type RecruitingStatus = "upcoming" | "open" | "closed";

const readRecruitingStatus = (
  nowTimestampMs: number,
  startAt: number,
  endAt: number,
): RecruitingStatus => {
  if (nowTimestampMs < startAt) {
    return "upcoming";
  }
  if (nowTimestampMs > endAt) {
    return "closed";
  }
  return "open";
};

const RECRUITING_STATUS_META: Record<
  RecruitingStatus,
  { label: string; className: string }
> = {
  upcoming: {
    label: "모집 예정",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  open: {
    label: "모집중",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  closed: {
    label: "모집 마감",
    className: "border-slate-300 bg-slate-100 text-slate-700",
  },
};

export default async function RecruitingPage() {
  await headers();
  const currentRecruitingPlan = await getPublicCurrentRecruitingPlan();
  const recruitingStatus = currentRecruitingPlan
    ? readRecruitingStatus(
        Date.now(),
        currentRecruitingPlan.recruitmentStartAt,
        currentRecruitingPlan.recruitmentEndAt,
      )
    : null;

  return (
    <div className="min-h-screen bg-(--bg-primary)" data-testid="about-recruiting-page">
      <div className="mx-auto max-w-300 px-4 md:px-8">
        <PageTitleHero title="RECRUITING" description="연영회 모집 안내" />
        <main className="mx-auto w-full max-w-300 space-y-10 pb-16 md:pb-20">
          <section className="space-y-3 border border-(--surface-border) p-5">
            <h2 className="text-[1.7rem] font-semibold text-(--text-primary)">
              모집 안내
            </h2>
            <p className="text-sm text-(--text-muted)">
              연영회는 연 1회, 3월 중 리크루팅을 실시합니다.
            </p>
          </section>

          <section
            className="space-y-4 border border-(--surface-border) p-5"
            data-testid="about-recruiting-plan"
          >
            <h2 className="text-[1.7rem] font-semibold text-(--text-primary)">
              올해 모집 계획
            </h2>

            {currentRecruitingPlan ? (
              <article className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-semibold text-(--text-primary)">
                    {currentRecruitingPlan.title}
                  </h3>
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${RECRUITING_STATUS_META[recruitingStatus!].className}`}
                  >
                    {RECRUITING_STATUS_META[recruitingStatus!].label}
                  </span>
                </div>

                <p className="text-sm text-(--text-muted)">
                  모집 기간:{" "}
                  {formatKoreanDateTime(currentRecruitingPlan.recruitmentStartAt)} ~{" "}
                  {formatKoreanDateTime(currentRecruitingPlan.recruitmentEndAt)}
                </p>

                <RichTextContent
                  html={currentRecruitingPlan.content}
                  className={`${HIGH_CONTRAST_RICH_TEXT_CLASS_NAMES} recruiting-rich-text-contrast`}
                />

                {currentRecruitingPlan.promotionImageUrls.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {currentRecruitingPlan.promotionImageUrls.map((imageUrl, index) => (
                      <div
                        key={`${imageUrl}-${index + 1}`}
                        className="overflow-hidden border border-(--surface-border) bg-(--surface-base)"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrl}
                          alt={`모집 홍보 이미지 ${index + 1}`}
                          className="block h-auto w-full"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            ) : (
              <div
                className="border border-(--surface-border) bg-(--surface-base) p-4 text-sm text-(--text-muted)"
                data-testid="about-recruiting-plan-empty"
              >
                올해 모집 계획 준비 중입니다.
              </div>
            )}
          </section>

          <section className="space-y-3 border border-(--surface-border) p-5">
            <h2 className="text-[1.7rem] font-semibold text-(--text-primary)">
              지원 자격
            </h2>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-(--text-muted)">
              {qualificationItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-3 border border-(--surface-border) p-5">
            <h2 className="text-[1.7rem] font-semibold text-(--text-primary)">
              지원 방법
            </h2>
            <div className="space-y-3" data-testid="about-recruiting-steps">
              {applicationSteps.map((step, index) => (
                <article
                  key={step.title}
                  className="flex gap-3 border border-(--surface-border) p-3"
                >
                  <div className="inline-flex h-7 w-7 shrink-0 items-center justify-center border border-(--surface-border) text-sm font-semibold text-(--text-primary)">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-(--text-primary)">
                      {step.title}
                    </h3>
                    <p className="text-sm text-(--text-muted)">{step.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
