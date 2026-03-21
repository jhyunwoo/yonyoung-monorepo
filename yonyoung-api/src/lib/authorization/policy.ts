import {
  isMemberLikeRoleValue,
  normalizeLegacyRole,
} from "../../shared/auth/roles";
import { Action, Resource, Role } from "./types";

type PermissionMatrix = Record<Role, Record<Resource, Record<Action, boolean>>>;

const allTrue = {
  create: true,
  read: true,
  update: true,
  delete: true,
} as const;

const readOnly = {
  create: false,
  read: true,
  update: false,
  delete: false,
} as const;

const noAccess = {
  create: false,
  read: false,
  update: false,
  delete: false,
} as const;

const roleLevel: Record<Role, number> = {
  unverified: 0,
  new_member: 1,
  associate_member: 1,
  regular_member: 1,
  manager: 2,
  vice_president: 3,
  president: 4,
};

/**
 * 역할 문자열을 내부 권한 역할로 정규화한다.
 * 알 수 없는 값은 보수적으로 "unverified"로 처리한다.
 */
export const normalizeRole = (rawRole: string | null | undefined): Role => {
  return normalizeLegacyRole(rawRole);
};

/**
 * canAssignRole 조건을 평가해 사용 가능 여부를 판별합니다.
 * @param actorRole 권한 판단에 사용되는 역할 정보입니다.
 * @param targetRoleRaw 권한 판단에 사용되는 역할 정보입니다.
 * @returns 조건 판별 결과(boolean)를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const canAssignRole = (
  actorRole: Role,
  targetRoleRaw: string | null | undefined,
): boolean => {
  const targetRole = normalizeRole(targetRoleRaw);
  return roleLevel[targetRole] <= roleLevel[actorRole];
};

/**
 * isMemberLikeRole 조건을 평가해 사용 가능 여부를 판별합니다.
 * @param role 권한 판단에 사용되는 역할 정보입니다.
 * @returns 조건 판별 결과(boolean)를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const isMemberLikeRole = (role: Role): boolean => {
  return isMemberLikeRoleValue(role);
};

const permissionMatrix: PermissionMatrix = {
  president: {
    generation: { ...allTrue },
    activity: { ...allTrue },
    notice: { ...allTrue },
    market: { ...allTrue },
    exhibition: { ...allTrue },
    linktree: { ...allTrue },
    user: { ...allTrue },
  },
  vice_president: {
    generation: { ...allTrue, delete: false },
    activity: { ...allTrue },
    notice: { ...allTrue },
    market: { ...allTrue },
    exhibition: { ...allTrue, delete: false },
    linktree: { ...allTrue },
    user: { ...allTrue },
  },
  manager: {
    generation: { ...readOnly },
    activity: { create: true, read: true, update: true, delete: true },
    notice: { create: true, read: true, update: true, delete: true },
    market: { create: true, read: true, update: true, delete: true },
    exhibition: { create: true, read: true, update: true, delete: false },
    linktree: { create: true, read: true, update: true, delete: true },
    user: { ...readOnly },
  },
  new_member: {
    generation: { ...readOnly },
    activity: { ...readOnly },
    notice: { ...readOnly },
    market: { create: true, read: true, update: true, delete: true },
    exhibition: { ...readOnly },
    linktree: { ...readOnly },
    user: { ...noAccess },
  },
  associate_member: {
    generation: { ...readOnly },
    activity: { ...readOnly },
    notice: { ...readOnly },
    market: { create: true, read: true, update: true, delete: true },
    exhibition: { ...readOnly },
    linktree: { ...readOnly },
    user: { ...noAccess },
  },
  regular_member: {
    generation: { ...readOnly },
    activity: { ...readOnly },
    notice: { ...readOnly },
    market: { create: true, read: true, update: true, delete: true },
    exhibition: { ...readOnly },
    linktree: { ...readOnly },
    user: { ...noAccess },
  },
  unverified: {
    generation: { ...noAccess },
    activity: { ...noAccess },
    notice: { ...noAccess },
    market: { ...noAccess },
    exhibition: { ...noAccess },
    linktree: { ...noAccess },
    user: { ...noAccess },
  },
};

/**
 * can 조건을 평가해 사용 가능 여부를 판별합니다.
 * @param role 권한 판단에 사용되는 역할 정보입니다.
 * @param resource 응답 데이터 또는 응답 객체입니다.
 * @param action 함수 로직에서 사용하는 입력값입니다.
 * @returns 조건 판별 결과(boolean)를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const can = (role: Role, resource: Resource, action: Action): boolean => {
  return permissionMatrix[role][resource][action];
};
