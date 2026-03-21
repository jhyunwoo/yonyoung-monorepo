import { notFound } from "next/navigation";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import MemberDetailClient from "@/app/(dashboard)/dashboard/settings/members/[memberId]/member-detail-client";

const decodeMemberId = (rawMemberId: string): string | null => {
  const trimmedMemberId = rawMemberId.trim();
  if (trimmedMemberId.length === 0) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(trimmedMemberId).trim();
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
};

export default async function SettingsMemberDetailPage({
  params,
}: Readonly<{
  params: Promise<{ memberId: string }>;
}>) {
  const [{ memberId: rawMemberId }, session] = await Promise.all([
    params,
    serverAuthGuard.requireGlobalUserManagementAccess(),
  ]);

  const memberId = decodeMemberId(rawMemberId);
  if (!memberId) {
    notFound();
  }

  return (
    <MemberDetailClient memberId={memberId} viewerRole={session.user.role ?? null} />
  );
}
