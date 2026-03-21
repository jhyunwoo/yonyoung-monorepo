import LinktreeGroupEditForm from "@/app/(dashboard)/_components/linktree-group-edit-form";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { isAdminRole } from "@/features/auth/model/auth-shared";

export default async function SettingsLinktreeEditPage({
  params,
}: Readonly<{
  params: Promise<{ linktreeId: string }>;
}>) {
  const [{ linktreeId }, session] = await Promise.all([
    params,
    serverAuthGuard.requireSession(),
  ]);

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <LinktreeGroupEditForm
        linktreeId={linktreeId}
        canWrite={isAdminRole(session.user.role)}
        listPath="/dashboard/settings/linktree"
      />
    </main>
  );
}
