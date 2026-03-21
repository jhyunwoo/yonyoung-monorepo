import LinktreeCreateForm from "@/app/(dashboard)/_components/linktree-create-form";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { isAdminRole } from "@/features/auth/model/auth-shared";

export default async function SettingsLinktreeCreatePage() {
  const session = await serverAuthGuard.requireSession();

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <LinktreeCreateForm
        canWrite={isAdminRole(session.user.role)}
        listPath="/dashboard/settings/linktree"
      />
    </main>
  );
}
