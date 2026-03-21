import { redirect } from "next/navigation";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { toEditableUserProfile } from "@/features/dashboard/members/user-profile";
import AuthProfileForm from "@/app/(dashboard)/auth/profile/profile-form";

const normalizeRole = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveProfileUserId = (
  profile: Record<string, unknown> | null,
  fallbackUserId: string,
): string => {
  if (!profile) {
    return fallbackUserId;
  }

  const rawId = profile.id;
  if (typeof rawId !== "string") {
    return fallbackUserId;
  }

  const trimmed = rawId.trim();
  return trimmed.length > 0 ? trimmed : fallbackUserId;
};

const readDashboardProfileData = async (): Promise<{
  role: string | null;
  initialProfile: ReturnType<typeof toEditableUserProfile>;
  resolvedUserId: string;
} | null> => {
  const session = await serverAuthGuard.getSession();
  if (!session) {
    return null;
  }

  const profile = await serverAuthGuard.getCurrentUserProfile(session);
  const initialProfile = toEditableUserProfile(profile ?? session.user);

  return {
    role: normalizeRole(session.user.role),
    initialProfile,
    resolvedUserId: resolveProfileUserId(profile, session.user.id),
  };
};

export default async function DashboardProfilePage() {
  const data = await readDashboardProfileData();
  if (!data) {
    redirect("/auth/sign-in");
  }

  const { role, initialProfile, resolvedUserId } = data;

  return (
    <AuthProfileForm
      userId={resolvedUserId}
      role={role}
      mode="dashboard"
      initialProfile={initialProfile}
    />
  );
}
