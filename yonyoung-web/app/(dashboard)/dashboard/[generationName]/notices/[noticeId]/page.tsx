import NoticeDetail from "@/app/(dashboard)/_components/notice-detail";
import { requireDashboardGeneration } from "@/app/(dashboard)/dashboard/[generationName]/_lib/resolve-generation";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { isAdminRole } from "@/features/auth/model/auth-shared";

export default async function GenerationNoticeDetailPage({
  params,
}: Readonly<{
  params: Promise<{ generationName: string; noticeId: string }>;
}>) {
  const resolvedParams = await params;
  const [generation, session] = await Promise.all([
    requireDashboardGeneration(
      Promise.resolve({
        generationName: resolvedParams.generationName,
      }),
    ),
    serverAuthGuard.requireSession(),
  ]);
  const noticesBasePath = `${generation.path}/notices`;

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <NoticeDetail
        scope="generation"
        generationId={generation.id}
        noticeId={resolvedParams.noticeId}
        canWrite={isAdminRole(session.user.role)}
        listPath={noticesBasePath}
        heading={`${generation.name} 공지 상세`}
        description="공지 내용을 확인하고 필요하면 바로 수정하거나 삭제할 수 있습니다."
      />
    </main>
  );
}
