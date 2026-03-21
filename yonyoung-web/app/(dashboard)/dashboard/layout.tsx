import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { DASHBOARD_PATH } from "@/features/auth/model/auth-shared";

export default async function DashboardRouteLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await serverAuthGuard.requireSession();
  const redirectPath = await serverAuthGuard.resolveAdminLandingPath(session);

  if (redirectPath !== DASHBOARD_PATH) {
    redirect(redirectPath);
  }

  return <>{children}</>;
}
