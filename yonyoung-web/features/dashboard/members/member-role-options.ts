import { CORE_ROLE_VALUES, type CoreRole } from "@/shared/contracts/auth-roles";
import { buildMemberRoleLabel } from "@/features/dashboard/members/member-role-label";

export type MemberRoleValue = CoreRole;
export type BulkMemberRoleValue = Exclude<
  MemberRoleValue,
  "president" | "vice_president"
>;

const BULK_MEMBER_ROLE_VALUES = CORE_ROLE_VALUES.filter(
  (value): value is BulkMemberRoleValue =>
    value !== "president" && value !== "vice_president",
);

export const isMemberRoleValue = (value: unknown): value is MemberRoleValue => {
  return (
    typeof value === "string" && (CORE_ROLE_VALUES as readonly string[]).includes(value)
  );
};

export const coerceMemberRoleValue = (
  value: unknown,
  fallback: MemberRoleValue = "regular_member",
): MemberRoleValue => {
  return isMemberRoleValue(value) ? value : fallback;
};

export const isBulkMemberRoleValue = (value: unknown): value is BulkMemberRoleValue => {
  return (
    typeof value === "string" &&
    (BULK_MEMBER_ROLE_VALUES as readonly string[]).includes(value)
  );
};

export const coerceBulkMemberRoleValue = (
  value: unknown,
  fallback: BulkMemberRoleValue = "regular_member",
): BulkMemberRoleValue => {
  return isBulkMemberRoleValue(value) ? value : fallback;
};

export const MEMBER_ROLE_OPTIONS = CORE_ROLE_VALUES.map((value) => ({
  value,
  label: buildMemberRoleLabel(value),
}));

export const BULK_MEMBER_ROLE_OPTIONS = BULK_MEMBER_ROLE_VALUES.map((value) => ({
  value,
  label: buildMemberRoleLabel(value),
}));
