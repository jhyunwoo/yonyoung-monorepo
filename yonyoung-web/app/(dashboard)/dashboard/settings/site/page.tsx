import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import SiteSettingsForm from "@/app/(dashboard)/dashboard/settings/site/site-settings-form";

export default async function SettingsSitePage() {
  await serverAuthGuard.requirePresidentAccess();

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <SiteSettingsForm />
    </main>
  );
}
