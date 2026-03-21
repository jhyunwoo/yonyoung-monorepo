import NoticeCreateForm from "@/app/(dashboard)/_components/notice-create-form";
import { requireDashboardGeneration } from "@/app/(dashboard)/dashboard/[generationName]/_lib/resolve-generation";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { isAdminRole } from "@/features/auth/model/auth-shared";

export default async function GenerationNoticeCreatePage({
  params,
}: Readonly<{
  params: Promise<{ generationName: string }>;
}>) {
  const [generation, session] = await Promise.all([
    requireDashboardGeneration(params),
    serverAuthGuard.requireSession(),
  ]);
  const noticesBasePath = `${generation.path}/notices`;

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <NoticeCreateForm
        scope="generation"
        generationId={generation.id}
        canWrite={isAdminRole(session.user.role)}
        basePath={noticesBasePath}
        listPath={noticesBasePath}
        heading={`${generation.name} 공지 작성`}
        description="공지 제목과 내용을 입력하고 저장하면 상세 화면으로 이동합니다."
      />
    </main>
  );
}
