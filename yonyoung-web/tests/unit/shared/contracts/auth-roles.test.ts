import { describe, expect, it } from "vitest";

import {
  isAdminRoleValue,
  isMemberLikeRoleValue,
  isUnverifiedRoleValue,
} from "@/shared/contracts/auth-roles";

describe("shared/contracts/auth-roles", () => {
  it("checks admin and member-like roles", () => {
    expect(isAdminRoleValue("manager")).toBe(true);
    expect(isAdminRoleValue("regular_member")).toBe(false);

    expect(isMemberLikeRoleValue("regular_member")).toBe(true);
    expect(isMemberLikeRoleValue("vice_president")).toBe(false);
  });

  it("checks unverified role regardless of case", () => {
    expect(isUnverifiedRoleValue("unverified")).toBe(true);
    expect(isUnverifiedRoleValue("UnVerified")).toBe(true);
    expect(isUnverifiedRoleValue("manager")).toBe(false);
  });
});
