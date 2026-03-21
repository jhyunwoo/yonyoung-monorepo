import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import GenerationManagementClient from "@/app/(dashboard)/dashboard/settings/generations/generation-management-client";

export default async function SettingsGenerationsPage() {
  await serverAuthGuard.requirePresidentAccess();

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <GenerationManagementClient />
    </main>
  );
}
