import { redirect } from "next/navigation";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { isAdminRole } from "@/features/auth/model/auth-shared";
import { requireDashboardGeneration } from "@/app/(dashboard)/dashboard/[generationName]/_lib/resolve-generation";
import ExhibitionCreateForm from "@/app/(dashboard)/dashboard/[generationName]/exhibitions/_components/exhibition-create-form";

export default async function GenerationExhibitionCreatePage({
  params,
}: Readonly<{
  params: Promise<{ generationName: string }>;
}>) {
  const [generation, session] = await Promise.all([
    requireDashboardGeneration(params),
    serverAuthGuard.requireSession(),
  ]);

  if (!isAdminRole(session.user.role)) {
    redirect(`${generation.path}/exhibitions`);
  }

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <ExhibitionCreateForm
        generationId={generation.id}
        generationPath={generation.path}
        generationName={generation.name}
      />
    </main>
  );
}
