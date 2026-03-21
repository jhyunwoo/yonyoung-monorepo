import { redirect } from "next/navigation";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { isAdminRole } from "@/features/auth/model/auth-shared";
import { requireDashboardGeneration } from "@/app/(dashboard)/dashboard/[generationName]/_lib/resolve-generation";
import ActivityCreateForm from "@/app/(dashboard)/dashboard/[generationName]/activities/_components/activity-create-form";

export default async function GenerationActivityCreatePage({
  params,
}: Readonly<{
  params: Promise<{ generationName: string }>;
}>) {
  const [generation, session] = await Promise.all([
    requireDashboardGeneration(params),
    serverAuthGuard.requireSession(),
  ]);

  if (!isAdminRole(session.user.role)) {
    redirect(`${generation.path}/activities`);
  }

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <ActivityCreateForm
        generationId={generation.id}
        generationPath={generation.path}
        generationName={generation.name}
      />
    </main>
  );
}
