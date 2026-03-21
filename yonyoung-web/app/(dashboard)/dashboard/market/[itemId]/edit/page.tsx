import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { buildDashboardViewerProfile } from "@/features/dashboard/members/user-profile";
import MarketItemEditPageClient from "@/app/(dashboard)/dashboard/market/[itemId]/edit/market-item-edit-page-client";

export default async function DashboardMarketItemEditPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const session = await serverAuthGuard.requireSession();
  const profile = await serverAuthGuard.getCurrentUserProfile(session);
  const viewer = buildDashboardViewerProfile(session.user, profile);
  const { itemId } = await params;

  return (
    <MarketItemEditPageClient
      itemId={itemId}
      viewer={{
        id: viewer.id,
        displayName: viewer.displayName,
        role: viewer.role,
      }}
    />
  );
}
