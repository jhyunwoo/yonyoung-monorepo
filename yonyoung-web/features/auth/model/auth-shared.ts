import {
  ADMIN_ROLE_VALUES,
  PRESIDENT_ROLE,
  isAdminRoleValue,
  isUnverifiedRoleValue,
  type CoreRole,
} from "@/shared/contracts/auth-roles";
import { hasCompletedRequiredProfileFields } from "@/shared/contracts/auth-profile";

type KnownAuthRole = CoreRole;
type AuthRole = KnownAuthRole | (string & {});
type AdminRole = (typeof ADMIN_ROLE_VALUES)[number];

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  familyName?: string | null;
  givenName?: string | null;
  college?: string | null;
  department?: string | null;
  studentNumber?: string | null;
  phoneNumber?: string | null;
  collaborationAvailable?: boolean | null;
  personalLink?: string | null;
  role?: AuthRole | null;
  generationId?: string | null;
  generationIds?: string[];
  latestGenerationSortOrder?: number | null;
};

export type AuthSession = {
  session: {
    id: string;
    userId: string;
    expiresAt: string | number;
  };
  user: AuthUser;
};

export const DASHBOARD_PATH = "/dashboard";
export const AUTH_PROFILE_PATH = "/auth/profile";
export const AUTH_PENDING_APPROVAL_PATH = "/auth/pending-approval";

export const hasCompletedRequiredProfile = (
  user: Record<string, unknown> | null | undefined,
): boolean => hasCompletedRequiredProfileFields(user);

type SessionWithRole =
  | {
      user?: {
        role?: unknown;
        [key: string]: unknown;
      };
    }
  | null
  | undefined;

/**
 * getRoleFromSession 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
 * @param session 인증/인가 상태를 포함한 세션 정보입니다.
 * @returns 조회/계산된 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const getRoleFromSession = (session: SessionWithRole): AuthRole | null => {
  const rawRole = session?.user?.role;
  if (typeof rawRole !== "string" || rawRole.length === 0) {
    return null;
  }

  return rawRole as AuthRole;
};

/**
 * isAdminRole 조건을 평가해 사용 가능 여부를 판별합니다.
 * @param role 권한 판단에 사용되는 역할 정보입니다.
 * @returns 조건 판별 결과(boolean)를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const isAdminRole = (role: unknown): role is AdminRole => isAdminRoleValue(role);

/**
 * isAdminSession 조건을 평가해 사용 가능 여부를 판별합니다.
 * @param session 인증/인가 상태를 포함한 세션 정보입니다.
 * @returns 조건 판별 결과(boolean)를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const isAdminSession = (session: SessionWithRole): boolean =>
  isAdminRole(getRoleFromSession(session));

/**
 * isUnverifiedRole 조건을 평가해 사용 가능 여부를 판별합니다.
 * @param role 권한 판단에 사용되는 역할 정보입니다.
 * @returns 조건 판별 결과(boolean)를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const isUnverifiedRole = (role: unknown): boolean => isUnverifiedRoleValue(role);

/**
 * isPresidentRole 조건을 평가해 사용 가능 여부를 판별합니다.
 * @param role 권한 판단에 사용되는 역할 정보입니다.
 * @returns 조건 판별 결과(boolean)를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const isPresidentRole = (role: unknown): role is typeof PRESIDENT_ROLE =>
  typeof role === "string" && role === PRESIDENT_ROLE;

export const isPresidentOrVicePresidentRole = (role: unknown): boolean =>
  typeof role === "string" && (role === "president" || role === "vice_president");

/**
 * canAccessAdminPage 조건을 평가해 사용 가능 여부를 판별합니다.
 * @param session 인증/인가 상태를 포함한 세션 정보입니다.
 * @returns 조건 판별 결과(boolean)를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const canAccessAdminPage = (session: SessionWithRole): boolean => {
  if (!session) {
    return false;
  }

  return !isUnverifiedRole(getRoleFromSession(session));
};

/**
 * canManageGenerations 조건을 평가해 사용 가능 여부를 판별합니다.
 * @param session 인증/인가 상태를 포함한 세션 정보입니다.
 * @returns 조건 판별 결과(boolean)를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const canManageGenerations = (session: SessionWithRole): boolean => {
  if (!session) {
    return false;
  }

  return isPresidentOrVicePresidentRole(getRoleFromSession(session));
};

/**
 * canManageGlobalUsers 조건을 평가해 사용 가능 여부를 판별합니다.
 * @param session 인증/인가 상태를 포함한 세션 정보입니다.
 * @returns 조건 판별 결과(boolean)를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const canManageGlobalUsers = (session: SessionWithRole): boolean => {
  if (!session) {
    return false;
  }

  return isPresidentOrVicePresidentRole(getRoleFromSession(session));
};

export const resolvePostSignInPath = (input: {
  role: unknown;
  isProfileComplete: boolean;
}):
  | typeof DASHBOARD_PATH
  | typeof AUTH_PROFILE_PATH
  | typeof AUTH_PENDING_APPROVAL_PATH => {
  if (isUnverifiedRole(input.role)) {
    return input.isProfileComplete ? AUTH_PENDING_APPROVAL_PATH : AUTH_PROFILE_PATH;
  }

  return input.isProfileComplete ? DASHBOARD_PATH : AUTH_PROFILE_PATH;
};
