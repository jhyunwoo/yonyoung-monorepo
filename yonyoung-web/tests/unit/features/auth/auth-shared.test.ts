import { describe, expect, it } from "vitest";

import {
  AUTH_PENDING_APPROVAL_PATH,
  AUTH_PROFILE_PATH,
  DASHBOARD_PATH,
  canAccessAdminPage,
  canManageGenerations,
  canManageGlobalUsers,
  getRoleFromSession,
  hasCompletedRequiredProfile,
  isAdminRole,
  isAdminSession,
  isPresidentOrVicePresidentRole,
  isPresidentRole,
  isUnverifiedRole,
  resolvePostSignInPath,
} from "@/features/auth/model/auth-shared";

describe("features/auth/model/auth-shared", () => {
  const presidentSession = { user: { role: "president" } };
  const memberSession = { user: { role: "regular_member" } };
  const unverifiedSession = { user: { role: "unverified" } };

  it("reads role and admin predicates from session", () => {
    expect(getRoleFromSession(presidentSession)).toBe("president");
    expect(getRoleFromSession({ user: { role: 1 } })).toBeNull();

    expect(isAdminRole("manager")).toBe(true);
    expect(isAdminRole("regular_member")).toBe(false);

    expect(isAdminSession(presidentSession)).toBe(true);
    expect(isAdminSession(memberSession)).toBe(false);
  });

  it("checks role helpers", () => {
    expect(isUnverifiedRole("unverified")).toBe(true);
    expect(isUnverifiedRole("manager")).toBe(false);

    expect(isPresidentRole("president")).toBe(true);
    expect(isPresidentRole("vice_president")).toBe(false);

    expect(isPresidentOrVicePresidentRole("president")).toBe(true);
    expect(isPresidentOrVicePresidentRole("vice_president")).toBe(true);
    expect(isPresidentOrVicePresidentRole("manager")).toBe(false);
  });

  it("checks access permissions", () => {
    expect(canAccessAdminPage(null)).toBe(false);
    expect(canAccessAdminPage(unverifiedSession)).toBe(false);
    expect(canAccessAdminPage(memberSession)).toBe(true);

    expect(canManageGenerations(null)).toBe(false);
    expect(canManageGenerations(memberSession)).toBe(false);
    expect(canManageGenerations(presidentSession)).toBe(true);

    expect(canManageGlobalUsers(null)).toBe(false);
    expect(canManageGlobalUsers(memberSession)).toBe(false);
    expect(canManageGlobalUsers({ user: { role: "vice_president" } })).toBe(true);
  });

  it("checks profile completion wrapper", () => {
    expect(
      hasCompletedRequiredProfile({
        familyName: "김",
        givenName: "연영",
        college: "공과대학",
        department: "컴퓨터과학과",
        studentNumber: "2023000001",
        phoneNumber: "010-1234-5678",
      }),
    ).toBe(true);
    expect(hasCompletedRequiredProfile({ familyName: "김" })).toBe(false);
  });

  it("resolves post sign-in path", () => {
    expect(resolvePostSignInPath({ role: "unverified", isProfileComplete: false })).toBe(
      AUTH_PROFILE_PATH,
    );
    expect(resolvePostSignInPath({ role: "unverified", isProfileComplete: true })).toBe(
      AUTH_PENDING_APPROVAL_PATH,
    );
    expect(resolvePostSignInPath({ role: "regular_member", isProfileComplete: false })).toBe(
      AUTH_PROFILE_PATH,
    );
    expect(resolvePostSignInPath({ role: "manager", isProfileComplete: true })).toBe(
      DASHBOARD_PATH,
    );
  });
});
