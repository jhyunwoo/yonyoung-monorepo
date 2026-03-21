import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { isAdminRole, isPresidentRole } from "@/features/auth/model/auth-shared";
import { requireDashboardGeneration } from "@/app/(dashboard)/dashboard/[generationName]/_lib/resolve-generation";
import GenerationExhibitionDetail from "@/app/(dashboard)/dashboard/[generationName]/exhibitions/_components/generation-exhibition-detail";

export default async function GenerationExhibitionDetailPage({
  params,
}: Readonly<{
  params: Promise<{ generationName: string; id: string }>;
}>) {
  const [{ id }, generation, session] = await Promise.all([
    params,
    requireDashboardGeneration(params),
    serverAuthGuard.requireSession(),
  ]);

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <GenerationExhibitionDetail
        exhibitionId={id}
        generationId={generation.id}
        generationName={generation.name}
        generationPath={generation.path}
        canManage={isAdminRole(session.user.role)}
        canDelete={isPresidentRole(session.user.role)}
      />
    </main>
  );
}
