import { redirect } from "next/navigation";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import SignInPageClient from "@/app/(dashboard)/auth/sign-in/sign-in-page-client";

export default async function SignInPage() {
  const session = await serverAuthGuard.getSession();
  if (session) {
    const redirectPath = await serverAuthGuard.resolveAdminLandingPath(session);
    redirect(redirectPath);
  }

  return <SignInPageClient />;
}
