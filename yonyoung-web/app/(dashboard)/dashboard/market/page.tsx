import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { buildDashboardViewerProfile } from "@/features/dashboard/members/user-profile";
import MarketPageClient from "@/app/(dashboard)/dashboard/market/market-page-client";

export default async function DashboardMarketPage() {
  const session = await serverAuthGuard.requireSession();
  const profile = await serverAuthGuard.getCurrentUserProfile(session);
  const viewer = buildDashboardViewerProfile(session.user, profile);

  return (
    <MarketPageClient
      viewer={{
        id: viewer.id,
        displayName: viewer.displayName,
        role: viewer.role,
      }}
    />
  );
}
