import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { isAdminRole } from "@/features/auth/model/auth-shared";
import { requireDashboardGeneration } from "@/app/(dashboard)/dashboard/[generationName]/_lib/resolve-generation";
import GenerationActivityDetail from "@/app/(dashboard)/dashboard/[generationName]/activities/_components/generation-activity-detail";

export default async function GenerationActivityDetailPage({
  params,
}: Readonly<{
  params: Promise<{ generationName: string; activityId: string }>;
}>) {
  const [{ activityId }, generation, session] = await Promise.all([
    params,
    requireDashboardGeneration(params),
    serverAuthGuard.requireSession(),
  ]);

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <GenerationActivityDetail
        activityId={activityId}
        generationId={generation.id}
        generationName={generation.name}
        generationPath={generation.path}
        canManage={isAdminRole(session.user.role)}
        canDelete={isAdminRole(session.user.role)}
      />
    </main>
  );
}
