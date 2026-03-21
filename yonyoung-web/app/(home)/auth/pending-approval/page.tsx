import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import {
  hasCompletedRequiredProfile,
  isUnverifiedRole,
} from "@/features/auth/model/auth-shared";
import { createPageMetadata } from "@/features/seo/metadata/seo";
import { toEditableUserProfile } from "@/features/dashboard/members/user-profile";

export const metadata: Metadata = createPageMetadata({
  title: "승인 대기 | 연영회",
  description: "연영회 계정 승인 대기 상태와 다음 절차를 확인하세요.",
  path: "/auth/pending-approval",
});

export default async function PendingApprovalPage() {
  const session = await serverAuthGuard.requireSession();
  const profile = await serverAuthGuard.getCurrentUserProfile(session);
  const initialProfile = toEditableUserProfile(profile ?? session.user);
  const isProfileComplete = hasCompletedRequiredProfile(initialProfile);
  const sessionEmail = typeof session.user.email === "string" ? session.user.email : "";

  if (!isUnverifiedRole(session.user.role)) {
    redirect(isProfileComplete ? "/dashboard" : "/auth/profile");
  }

  if (!isProfileComplete) {
    redirect("/auth/profile");
  }

  return (
    <section
      className="flex min-h-[calc(100dvh-var(--public-header-height-mobile))] flex-col justify-center px-4 md:min-h-[calc(100dvh-var(--public-header-height-desktop))] md:px-8"
      data-testid="auth-pending-approval-page"
    >
      <div className="mx-auto w-full max-w-[1200px] border border-(--surface-border) p-7 md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--text-muted)">
          Approval Pending
        </p>
        <h1 className="mt-3 text-[2.2rem] leading-tight font-semibold text-(--text-primary) md:text-[2.8rem]">
          기본 정보 입력이 완료되었습니다.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-(--text-muted) md:text-base">
          기본 정보 입력이 완료되었습니다. 관리자가 계정 권한을 변경하면 Dashboard에
          접근할 수 있습니다.
        </p>

        <div className="mt-8 border border-(--surface-border) bg-(--surface-muted) p-4 text-sm text-(--text-muted)">
          계정:{" "}
          <span className="font-medium text-(--text-primary)">{sessionEmail}</span>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex border border-(--surface-strong-border) px-4 py-2 text-sm font-semibold text-(--text-primary) transition hover:bg-(--surface-muted)"
          >
            홈으로 이동
          </Link>
          <Link
            href="/auth/pending-approval"
            className="inline-flex border border-(--surface-strong-border) bg-(--accent) px-4 py-2 text-sm font-semibold text-(--accent-foreground) transition hover:opacity-90"
          >
            상태 새로고침
          </Link>
        </div>
      </div>
    </section>
  );
}
