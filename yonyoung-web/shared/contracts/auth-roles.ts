export const CORE_ROLE_VALUES = [
  "president",
  "vice_president",
  "manager",
  "new_member",
  "associate_member",
  "regular_member",
  "unverified",
] as const;

export type CoreRole = (typeof CORE_ROLE_VALUES)[number];

export const ADMIN_ROLE_VALUES = ["president", "vice_president", "manager"] as const;

export type AdminRole = (typeof ADMIN_ROLE_VALUES)[number];

export const MEMBER_LIKE_ROLE_VALUES = [
  "new_member",
  "associate_member",
  "regular_member",
] as const;

export type MemberLikeRole = (typeof MEMBER_LIKE_ROLE_VALUES)[number];

export const PRESIDENT_ROLE = "president";
export const UNVERIFIED_ROLE = "unverified";

export const isAdminRoleValue = (role: unknown): role is AdminRole =>
  typeof role === "string" && (ADMIN_ROLE_VALUES as readonly string[]).includes(role);

export const isMemberLikeRoleValue = (role: unknown): role is MemberLikeRole =>
  typeof role === "string" &&
  (MEMBER_LIKE_ROLE_VALUES as readonly string[]).includes(role);

export const isUnverifiedRoleValue = (role: unknown): boolean =>
  typeof role === "string" && role.toLowerCase() === UNVERIFIED_ROLE;
