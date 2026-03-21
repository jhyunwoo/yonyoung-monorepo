import { redirect } from "next/navigation";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { isAdminRole } from "@/features/auth/model/auth-shared";
import { requireDashboardGeneration } from "@/app/(dashboard)/dashboard/[generationName]/_lib/resolve-generation";
import ExhibitionEditForm from "@/app/(dashboard)/dashboard/[generationName]/exhibitions/_components/exhibition-edit-form";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const resolveInitialNoticeMessage = async (
  searchParams: SearchParams,
): Promise<string | null> => {
  const params = await searchParams;
  if (params.error !== "detail-upload-failed") {
    return null;
  }

  const messageParam = params.message;
  if (typeof messageParam === "string" && messageParam.trim().length > 0) {
    return `전시는 생성되었지만 일부 세부 이미지 업로드에 실패했습니다: ${messageParam}`;
  }

  return "전시는 생성되었지만 일부 세부 이미지 업로드에 실패했습니다. 이미지 업로드를 다시 시도해 주세요.";
};

export default async function GenerationExhibitionEditPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ generationName: string; id: string }>;
  searchParams: SearchParams;
}>) {
  const [{ id }, generation, session, initialMessage] = await Promise.all([
    params,
    requireDashboardGeneration(params),
    serverAuthGuard.requireSession(),
    resolveInitialNoticeMessage(searchParams),
  ]);

  if (!isAdminRole(session.user.role)) {
    redirect(`${generation.path}/exhibitions/${id}`);
  }

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <ExhibitionEditForm
        exhibitionId={id}
        generationId={generation.id}
        generationName={generation.name}
        generationPath={generation.path}
        initialMessage={initialMessage}
      />
    </main>
  );
}
