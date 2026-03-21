import { resolveApiBaseUrl } from "@/shared/http/http";
import { applyForwardedRequestContextHeaders } from "@/shared/http/http";
import type {
  ApiActivity,
  ApiAdminDashboardStats,
  ApiExhibition,
  ApiGenerationMemberSummary,
  ApiGenerationNotice,
  ApiGlobalNotice,
  ApiLinktree,
} from "@/shared/contracts/api-contracts";
import { unwrapDataEnvelope } from "@/shared/http/http";
import { readServerForwardedRequestContext } from "@/server/http/request-context";

const ADMIN_API_BASE_PATH = "/api";

const readAdminCollection = async <T>(
  path: string,
  cookieHeader: string | null,
): Promise<T[]> => {
  const headers = new Headers({
    Accept: "application/json",
  });

  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
    applyForwardedRequestContextHeaders(
      headers,
      await readServerForwardedRequestContext(),
    );
  }

  try {
    const response = await fetch(`${resolveApiBaseUrl()}${ADMIN_API_BASE_PATH}${path}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json().catch(() => null)) as unknown;
    const rows = unwrapDataEnvelope<T[]>(payload);

    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
};

const readAdminData = async <T>(
  path: string,
  cookieHeader: string | null,
): Promise<T | null> => {
  const headers = new Headers({
    Accept: "application/json",
  });

  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
    applyForwardedRequestContextHeaders(
      headers,
      await readServerForwardedRequestContext(),
    );
  }

  try {
    const response = await fetch(`${resolveApiBaseUrl()}${ADMIN_API_BASE_PATH}${path}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json().catch(() => null)) as unknown;
    return unwrapDataEnvelope<T>(payload);
  } catch {
    return null;
  }
};

export const listCachedActivities = async (
  generationId: string,
  cookieHeader: string | null,
): Promise<ApiActivity[]> => {
  const query = new URLSearchParams({ generationId });
  return readAdminCollection<ApiActivity>(
    `/activities?${query.toString()}`,
    cookieHeader,
  );
};

export const listCachedExhibitions = async (
  generationId: string,
  cookieHeader: string | null,
): Promise<ApiExhibition[]> => {
  const query = new URLSearchParams({ generationId });
  return readAdminCollection<ApiExhibition>(
    `/exhibitions?${query.toString()}`,
    cookieHeader,
  );
};

export const listCachedGenerationNotices = async (
  generationId: string,
  cookieHeader: string | null,
): Promise<ApiGenerationNotice[]> => {
  return readAdminCollection<ApiGenerationNotice>(
    `/generations/${encodeURIComponent(generationId)}/notices`,
    cookieHeader,
  );
};

export const listCachedGlobalNotices = async (
  cookieHeader: string | null,
): Promise<ApiGlobalNotice[]> => {
  return readAdminCollection<ApiGlobalNotice>("/global-notices", cookieHeader);
};

export const listCachedLinktrees = async (
  cookieHeader: string | null,
): Promise<ApiLinktree[]> => {
  return readAdminCollection<ApiLinktree>("/linktree", cookieHeader);
};

export const listCachedGenerationMembers = async (
  generationId: string,
  cookieHeader: string | null,
): Promise<ApiGenerationMemberSummary[]> => {
  return readAdminCollection<ApiGenerationMemberSummary>(
    `/generations/${encodeURIComponent(generationId)}/members`,
    cookieHeader,
  );
};

export const getCachedAdminDashboardStats = async (
  cookieHeader: string | null,
  generationSortOrder: number | null = null,
): Promise<ApiAdminDashboardStats | null> => {
  const search = new URLSearchParams();
  if (typeof generationSortOrder === "number" && Number.isFinite(generationSortOrder)) {
    search.set("generationSortOrder", String(generationSortOrder));
  }

  const suffix = search.size > 0 ? `?${search.toString()}` : "";
  return readAdminData<ApiAdminDashboardStats>(`/admin/dashboard${suffix}`, cookieHeader);
};
