import { notFound } from "next/navigation";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { requireDashboardGeneration } from "@/app/(dashboard)/dashboard/[generationName]/_lib/resolve-generation";
import MemberDetailClient from "@/app/(dashboard)/dashboard/[generationName]/members/[memberId]/member-detail-client";

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

export default async function GenerationMemberDetailPage({
  params,
}: Readonly<{
  params: Promise<{ generationName: string; memberId: string }>;
}>) {
  const [{ memberId: rawMemberId }, generation, session] = await Promise.all([
    params,
    requireDashboardGeneration(params),
    serverAuthGuard.requireSession(),
  ]);
  const profile = await serverAuthGuard.getCurrentUserProfile(session);
  const viewerId =
    profile && typeof profile.id === "string" && profile.id.trim().length > 0
      ? profile.id.trim()
      : session.user.id;

  const memberId = decodeMemberId(rawMemberId);
  if (!memberId) {
    notFound();
  }

  return (
    <MemberDetailClient
      generation={generation}
      memberId={memberId}
      viewer={{
        id: viewerId,
        role: session.user.role ?? null,
      }}
    />
  );
}
