import { describe, expect, it } from "vitest";
import { canPerformAdminWrite } from "@/features/dashboard/actions/admin-write-access";
import type { AuthSession } from "@/features/auth/model/auth-shared";

const createSession = (role: string): AuthSession => ({
  session: {
    id: "session-1",
    userId: "user-1",
    expiresAt: Date.now() + 60_000,
  },
  user: {
    id: "user-1",
    email: "user@example.com",
    name: "User",
    role,
  },
});

describe("features/dashboard/actions/admin-write-access", () => {
  it("keeps member writes limited to verified-member scope", () => {
    const session = createSession("regular_member");

    expect(canPerformAdminWrite(session, "verified_member")).toBe(true);
    expect(canPerformAdminWrite(session, "manager")).toBe(false);
    expect(canPerformAdminWrite(session, "leadership")).toBe(false);
    expect(canPerformAdminWrite(session, "user_manager")).toBe(false);
  });

  it("requires admin or leadership roles for sensitive write scopes", () => {
    expect(canPerformAdminWrite(createSession("manager"), "manager")).toBe(true);
    expect(canPerformAdminWrite(createSession("manager"), "leadership")).toBe(false);
    expect(canPerformAdminWrite(createSession("vice_president"), "leadership")).toBe(
      true,
    );
    expect(canPerformAdminWrite(createSession("vice_president"), "user_manager")).toBe(
      true,
    );
  });
});
