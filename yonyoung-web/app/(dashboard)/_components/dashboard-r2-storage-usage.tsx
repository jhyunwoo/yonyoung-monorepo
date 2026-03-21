import { getCachedAdminDashboardStats } from "@/features/dashboard/cache/admin-dashboard-cache";
import { readCookieHeader } from "@/shared/http/http";
import R2StorageUsageCard from "@/app/(dashboard)/_components/r2-storage-usage-card";

export default async function DashboardR2StorageUsage() {
  const cookieHeader = await readCookieHeader();
  const stats = await getCachedAdminDashboardStats(cookieHeader);
  return <R2StorageUsageCard stats={stats} />;
}
