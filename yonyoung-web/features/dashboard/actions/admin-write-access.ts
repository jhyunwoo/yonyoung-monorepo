import { forbidden } from "next/navigation";
import type { AuthSession } from "@/features/auth/model/auth-shared";
import {
  canAccessAdminPage,
  canManageGenerations,
  canManageGlobalUsers,
  isAdminSession,
} from "@/features/auth/model/auth-shared";

export type AdminWriteAccessScope =
  | "verified_member"
  | "manager"
  | "leadership"
  | "user_manager";

export const canPerformAdminWrite = (
  session: AuthSession | null | undefined,
  scope: AdminWriteAccessScope,
): boolean => {
  switch (scope) {
    case "verified_member":
      return canAccessAdminPage(session);
    case "manager":
      return isAdminSession(session);
    case "leadership":
      return canManageGenerations(session);
    case "user_manager":
      return canManageGlobalUsers(session);
    default:
      return false;
  }
};

export const assertAdminWriteAccess = (
  session: AuthSession | null | undefined,
  scope: AdminWriteAccessScope,
): void => {
  if (!canPerformAdminWrite(session, scope)) {
    forbidden();
  }
};
