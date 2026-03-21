"use server";

import { forbidden } from "next/navigation";
import { headers } from "next/headers";
import { updateTag } from "next/cache";
import { z } from "zod";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { canManageGlobalUsers } from "@/features/auth/model/auth-shared";
import {
  assertAdminWriteAccess,
  type AdminWriteAccessScope,
} from "@/features/dashboard/actions/admin-write-access";
import { readCookieHeader } from "@/shared/http/http";
import { CACHE_TAGS, type AdminCacheTag, type PublicCacheTag } from "@/server/cache/tags";
import { HonoApiError, honoRequest } from "@/server/http/hono-client";
import {
  apiActivityImageSchema,
  apiActivitySchema,
  apiBulkUpdateUserRoleInputSchema,
  apiCreateActivityImageInputSchema,
  apiCreateActivityInputSchema,
  apiCreateExhibitionImageInputSchema,
  apiCreateExhibitionInputSchema,
  apiCreateGenerationInputSchema,
  apiCreateGenerationNoticeInputSchema,
  apiCreateGlobalNoticeInputSchema,
  apiCreateLinktreeInputSchema,
  apiCreateLinktreeItemInputSchema,
  apiCreateMarketCommentInputSchema,
  apiCreateMarketItemInputSchema,
  apiExhibitionImageSchema,
  apiExhibitionSchema,
  apiGenerationNoticeSchema,
  apiGenerationSchema,
  apiGlobalNoticeSchema,
  apiLinktreeItemSchema,
  apiLinktreeSchema,
  apiMarketCommentSchema,
  apiMarketItemSchema,
  apiMarketPushSubscriptionInputSchema,
  apiMemberProfileUpdateInputSchema,
  apiRecruitingPlanSchema,
  apiSiteSettingsSchema,
  apiUpdateActivityImageBatchItemInputSchema,
  apiUpdateActivityImageInputSchema,
  apiUpdateActivityInputSchema,
  apiUpdateExhibitionImageBatchItemInputSchema,
  apiUpdateExhibitionImageInputSchema,
  apiUpdateExhibitionInputSchema,
  apiUpdateGenerationInputSchema,
  apiUpdateGenerationNoticeInputSchema,
  apiUpdateGlobalNoticeInputSchema,
  apiUpdateLinktreeInputSchema,
  apiUpdateLinktreeItemInputSchema,
  apiUpdateMarketCommentInputSchema,
  apiUpdateMarketItemInputSchema,
  apiUpdateMarketItemStatusInputSchema,
  apiUpdateSiteSettingsInputSchema,
  apiUpdateUserInputSchema,
  apiUpsertCurrentRecruitingPlanInputSchema,
  apiUserSchema,
} from "@/shared/contracts/api-schemas";
import type {
  ApiActivity,
  ApiActivityImage,
  ApiBulkUpdateUserRoleInput,
  ApiCreateActivityImageInput,
  ApiCreateActivityInput,
  ApiCreateExhibitionImageInput,
  ApiCreateExhibitionInput,
  ApiCreateGenerationInput,
  ApiCreateGenerationNoticeInput,
  ApiCreateGlobalNoticeInput,
  ApiCreateLinktreeInput,
  ApiCreateLinktreeItemInput,
  ApiCreateMarketCommentInput,
  ApiCreateMarketItemInput,
  ApiExhibition,
  ApiExhibitionImage,
  ApiGeneration,
  ApiGenerationNotice,
  ApiGlobalNotice,
  ApiLinktree,
  ApiLinktreeItem,
  ApiMarketComment,
  ApiMarketItem,
  ApiMarketPushSubscriptionInput,
  ApiMemberProfileUpdateInput,
  ApiRecruitingPlan,
  ApiSiteSettings,
  ApiUpdateActivityImageBatchItemInput,
  ApiUpdateActivityImageInput,
  ApiUpdateActivityInput,
  ApiUpdateExhibitionImageBatchItemInput,
  ApiUpdateExhibitionImageInput,
  ApiUpdateExhibitionInput,
  ApiUpdateGenerationInput,
  ApiUpdateGenerationNoticeInput,
  ApiUpdateGlobalNoticeInput,
  ApiUpdateLinktreeInput,
  ApiUpdateLinktreeItemInput,
  ApiUpdateMarketCommentInput,
  ApiUpdateMarketItemInput,
  ApiUpdateMarketItemStatusInput,
  ApiUpdateSiteSettingsInput,
  ApiUpdateUserInput,
  ApiUpsertCurrentRecruitingPlanInput,
  ApiUser,
} from "@/shared/contracts/api-contracts";

const ADMIN_API_BASE_PATH = "/api";
const MARKET_PUSH_SUBSCRIPTIONS_PATH = "/market/push-subscriptions";

type CacheTag = AdminCacheTag | PublicCacheTag;

export type AdminWriteActionFailure = {
  ok: false;
  errorMessage: string;
  status: number;
  code: string;
  requestId: string | null;
};

export type AdminWriteActionResult<T> =
  | {
      ok: true;
      data: T;
    }
  | AdminWriteActionFailure;

export type BulkUpdateUsersRoleActionResult = AdminWriteActionResult<ApiUser[]>;

const tagsToUpdate = (tags: readonly CacheTag[]): void => {
  for (const tag of tags) {
    updateTag(tag);
  }
};

const readCorrelationHeaders = async (): Promise<{
  requestId: string;
  traceId: string;
}> => {
  const requestHeaders = await headers();
  const requestId = requestHeaders.get("x-request-id")?.trim() || crypto.randomUUID();
  const traceId = requestHeaders.get("x-trace-id")?.trim() || crypto.randomUUID();

  return {
    requestId,
    traceId,
  };
};

const requireAdminAccess = async (scope: AdminWriteAccessScope = "verified_member") => {
  const session = await serverAuthGuard.requireSession();
  assertAdminWriteAccess(session, scope);
};

const readNoContentSchema = z
  .unknown()
  .optional()
  .nullable()
  .transform(() => undefined);

const toAdminWriteActionFailure = (
  error: HonoApiError,
): AdminWriteActionFailure => ({
  ok: false,
  errorMessage: error.message,
  status: error.status,
  code: error.code,
  requestId: error.requestId,
});

const writeRequest = async <TResponse>(input: {
  path: string;
  method: "POST" | "PATCH" | "DELETE";
  body?: unknown;
  responseSchema: z.ZodType<TResponse>;
  tags: readonly CacheTag[];
  timeoutMs?: number;
  requireAdminAccess?: boolean;
  accessScope?: AdminWriteAccessScope;
}): Promise<AdminWriteActionResult<TResponse>> => {
  if (input.requireAdminAccess !== false) {
    await requireAdminAccess(input.accessScope);
  }

  const cookieHeader = await readCookieHeader();
  const { requestId, traceId } = await readCorrelationHeaders();

  try {
    const result = await honoRequest<TResponse>({
      path: `${ADMIN_API_BASE_PATH}${input.path}`,
      method: input.method,
      body: input.body,
      cache: "no-store",
      responseSchema: input.responseSchema,
      timeoutMs: input.timeoutMs ?? 45_000,
      requestId,
      traceId,
      cookieHeader,
    });

    tagsToUpdate(input.tags);

    return {
      ok: true,
      data: result,
    };
  } catch (error) {
    if (error instanceof HonoApiError) {
      return toAdminWriteActionFailure(error);
    }

    throw error;
  }
};

export const createGenerationAction = async (
  input: ApiCreateGenerationInput,
): Promise<AdminWriteActionResult<ApiGeneration>> => {
  const payload = apiCreateGenerationInputSchema.parse(input);
  return writeRequest({
    path: "/generations",
    method: "POST",
    body: payload,
    responseSchema: apiGenerationSchema,
    accessScope: "leadership",
    tags: [
      CACHE_TAGS.admin.generations,
      CACHE_TAGS.admin.users,
      CACHE_TAGS.public.generations,
      CACHE_TAGS.public.photographers,
    ],
  });
};

export const updateGenerationAction = async (
  id: string,
  input: ApiUpdateGenerationInput,
): Promise<AdminWriteActionResult<ApiGeneration>> => {
  const payload = apiUpdateGenerationInputSchema.parse(input);
  return writeRequest({
    path: `/generations/${id}`,
    method: "PATCH",
    body: payload,
    responseSchema: apiGenerationSchema,
    accessScope: "leadership",
    tags: [
      CACHE_TAGS.admin.generations,
      CACHE_TAGS.admin.users,
      CACHE_TAGS.public.generations,
      CACHE_TAGS.public.photographers,
    ],
  });
};

export const deleteGenerationAction = async (
  id: string,
): Promise<AdminWriteActionResult<void>> => {
  return writeRequest({
    path: `/generations/${id}`,
    method: "DELETE",
    responseSchema: readNoContentSchema,
    accessScope: "leadership",
    tags: [
      CACHE_TAGS.admin.generations,
      CACHE_TAGS.admin.users,
      CACHE_TAGS.public.generations,
      CACHE_TAGS.public.photographers,
    ],
  });
};

export const createActivityAction = async (
  input: ApiCreateActivityInput,
): Promise<AdminWriteActionResult<ApiActivity>> => {
  const payload = apiCreateActivityInputSchema.parse(input);
  return writeRequest({
    path: "/activities",
    method: "POST",
    body: payload,
    responseSchema: apiActivitySchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.activities, CACHE_TAGS.public.activities],
  });
};

export const updateActivityAction = async (
  id: string,
  input: ApiUpdateActivityInput,
): Promise<AdminWriteActionResult<ApiActivity>> => {
  const payload = apiUpdateActivityInputSchema.parse(input);
  return writeRequest({
    path: `/activities/${id}`,
    method: "PATCH",
    body: payload,
    responseSchema: apiActivitySchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.activities, CACHE_TAGS.public.activities],
  });
};

export const deleteActivityAction = async (
  id: string,
): Promise<AdminWriteActionResult<void>> => {
  return writeRequest({
    path: `/activities/${id}`,
    method: "DELETE",
    responseSchema: readNoContentSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.activities, CACHE_TAGS.public.activities],
  });
};

export const addActivityImageAction = async (
  id: string,
  input: ApiCreateActivityImageInput,
): Promise<AdminWriteActionResult<ApiActivityImage>> => {
  const payload = apiCreateActivityImageInputSchema.parse(input);
  return writeRequest({
    path: `/activities/${id}/images`,
    method: "POST",
    body: payload,
    responseSchema: apiActivityImageSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.activities, CACHE_TAGS.public.activities],
  });
};

export const addActivityImagesAction = async (
  id: string,
  inputs: ApiCreateActivityImageInput[],
): Promise<AdminWriteActionResult<ApiActivityImage[]>> => {
  const payload = z.array(apiCreateActivityImageInputSchema).parse(inputs);
  return writeRequest({
    path: `/activities/${id}/images/batch`,
    method: "POST",
    body: payload,
    responseSchema: z.array(apiActivityImageSchema),
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.activities, CACHE_TAGS.public.activities],
  });
};

export const updateActivityImageAction = async (
  id: string,
  imageId: string,
  input: ApiUpdateActivityImageInput,
): Promise<AdminWriteActionResult<ApiActivityImage>> => {
  const payload = apiUpdateActivityImageInputSchema.parse(input);
  return writeRequest({
    path: `/activities/${id}/images/${imageId}`,
    method: "PATCH",
    body: payload,
    responseSchema: apiActivityImageSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.activities, CACHE_TAGS.public.activities],
  });
};

export const updateActivityImagesAction = async (
  id: string,
  inputs: ApiUpdateActivityImageBatchItemInput[],
): Promise<AdminWriteActionResult<ApiActivityImage[]>> => {
  const payload = z.array(apiUpdateActivityImageBatchItemInputSchema).parse(inputs);
  return writeRequest({
    path: `/activities/${id}/images/batch`,
    method: "PATCH",
    body: payload,
    responseSchema: z.array(apiActivityImageSchema),
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.activities, CACHE_TAGS.public.activities],
  });
};

export const deleteActivityImageAction = async (
  id: string,
  imageId: string,
): Promise<AdminWriteActionResult<void>> => {
  return writeRequest({
    path: `/activities/${id}/images/${imageId}`,
    method: "DELETE",
    responseSchema: readNoContentSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.activities, CACHE_TAGS.public.activities],
  });
};

export const createExhibitionAction = async (
  input: ApiCreateExhibitionInput,
): Promise<AdminWriteActionResult<ApiExhibition>> => {
  const payload = apiCreateExhibitionInputSchema.parse(input);
  return writeRequest({
    path: "/exhibitions",
    method: "POST",
    body: payload,
    responseSchema: apiExhibitionSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.exhibitions, CACHE_TAGS.public.exhibitions],
  });
};

export const updateExhibitionAction = async (
  id: string,
  input: ApiUpdateExhibitionInput,
): Promise<AdminWriteActionResult<ApiExhibition>> => {
  const payload = apiUpdateExhibitionInputSchema.parse(input);
  return writeRequest({
    path: `/exhibitions/${id}`,
    method: "PATCH",
    body: payload,
    responseSchema: apiExhibitionSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.exhibitions, CACHE_TAGS.public.exhibitions],
  });
};

export const deleteExhibitionAction = async (
  id: string,
): Promise<AdminWriteActionResult<void>> => {
  return writeRequest({
    path: `/exhibitions/${id}`,
    method: "DELETE",
    responseSchema: readNoContentSchema,
    accessScope: "leadership",
    tags: [CACHE_TAGS.admin.exhibitions, CACHE_TAGS.public.exhibitions],
  });
};

export const addExhibitionImageAction = async (
  id: string,
  input: ApiCreateExhibitionImageInput,
): Promise<AdminWriteActionResult<ApiExhibitionImage>> => {
  const payload = apiCreateExhibitionImageInputSchema.parse(input);
  return writeRequest({
    path: `/exhibitions/${id}/images`,
    method: "POST",
    body: payload,
    responseSchema: apiExhibitionImageSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.exhibitions, CACHE_TAGS.public.exhibitions],
  });
};

export const addExhibitionImagesAction = async (
  id: string,
  inputs: ApiCreateExhibitionImageInput[],
): Promise<AdminWriteActionResult<ApiExhibitionImage[]>> => {
  const payload = z.array(apiCreateExhibitionImageInputSchema).parse(inputs);
  return writeRequest({
    path: `/exhibitions/${id}/images/batch`,
    method: "POST",
    body: payload,
    responseSchema: z.array(apiExhibitionImageSchema),
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.exhibitions, CACHE_TAGS.public.exhibitions],
  });
};

export const updateExhibitionImageAction = async (
  id: string,
  imageId: string,
  input: ApiUpdateExhibitionImageInput,
): Promise<AdminWriteActionResult<ApiExhibitionImage>> => {
  const payload = apiUpdateExhibitionImageInputSchema.parse(input);
  return writeRequest({
    path: `/exhibitions/${id}/images/${imageId}`,
    method: "PATCH",
    body: payload,
    responseSchema: apiExhibitionImageSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.exhibitions, CACHE_TAGS.public.exhibitions],
  });
};

export const updateExhibitionImagesAction = async (
  id: string,
  inputs: ApiUpdateExhibitionImageBatchItemInput[],
): Promise<AdminWriteActionResult<ApiExhibitionImage[]>> => {
  const payload = z.array(apiUpdateExhibitionImageBatchItemInputSchema).parse(inputs);
  return writeRequest({
    path: `/exhibitions/${id}/images/batch`,
    method: "PATCH",
    body: payload,
    responseSchema: z.array(apiExhibitionImageSchema),
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.exhibitions, CACHE_TAGS.public.exhibitions],
  });
};

export const deleteExhibitionImageAction = async (
  id: string,
  imageId: string,
): Promise<AdminWriteActionResult<void>> => {
  return writeRequest({
    path: `/exhibitions/${id}/images/${imageId}`,
    method: "DELETE",
    responseSchema: readNoContentSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.exhibitions, CACHE_TAGS.public.exhibitions],
  });
};

export const createLinktreeAction = async (
  input: ApiCreateLinktreeInput,
): Promise<AdminWriteActionResult<ApiLinktree>> => {
  const payload = apiCreateLinktreeInputSchema.parse(input);
  return writeRequest({
    path: "/linktree",
    method: "POST",
    body: payload,
    responseSchema: apiLinktreeSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.linktree, CACHE_TAGS.public.linktree],
  });
};

export const updateLinktreeAction = async (
  id: string,
  input: ApiUpdateLinktreeInput,
): Promise<AdminWriteActionResult<ApiLinktree>> => {
  const payload = apiUpdateLinktreeInputSchema.parse(input);
  return writeRequest({
    path: `/linktree/${id}`,
    method: "PATCH",
    body: payload,
    responseSchema: apiLinktreeSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.linktree, CACHE_TAGS.public.linktree],
  });
};

export const deleteLinktreeAction = async (
  id: string,
): Promise<AdminWriteActionResult<void>> => {
  return writeRequest({
    path: `/linktree/${id}`,
    method: "DELETE",
    responseSchema: readNoContentSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.linktree, CACHE_TAGS.public.linktree],
  });
};

export const addLinktreeItemAction = async (
  id: string,
  input: ApiCreateLinktreeItemInput,
): Promise<AdminWriteActionResult<ApiLinktreeItem>> => {
  const payload = apiCreateLinktreeItemInputSchema.parse(input);
  return writeRequest({
    path: `/linktree/${id}/items`,
    method: "POST",
    body: payload,
    responseSchema: apiLinktreeItemSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.linktree, CACHE_TAGS.public.linktree],
  });
};

export const updateLinktreeItemAction = async (
  id: string,
  itemId: string,
  input: ApiUpdateLinktreeItemInput,
): Promise<AdminWriteActionResult<ApiLinktreeItem>> => {
  const payload = apiUpdateLinktreeItemInputSchema.parse(input);
  return writeRequest({
    path: `/linktree/${id}/items/${itemId}`,
    method: "PATCH",
    body: payload,
    responseSchema: apiLinktreeItemSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.linktree, CACHE_TAGS.public.linktree],
  });
};

export const deleteLinktreeItemAction = async (
  id: string,
  itemId: string,
): Promise<AdminWriteActionResult<void>> => {
  return writeRequest({
    path: `/linktree/${id}/items/${itemId}`,
    method: "DELETE",
    responseSchema: readNoContentSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.linktree, CACHE_TAGS.public.linktree],
  });
};

export const createGenerationNoticeAction = async (
  generationId: string,
  input: ApiCreateGenerationNoticeInput,
): Promise<AdminWriteActionResult<ApiGenerationNotice>> => {
  const payload = apiCreateGenerationNoticeInputSchema.parse(input);
  return writeRequest({
    path: `/generations/${generationId}/notices`,
    method: "POST",
    body: payload,
    responseSchema: apiGenerationNoticeSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.notices],
  });
};

export const updateGenerationNoticeAction = async (
  generationId: string,
  noticeId: string,
  input: ApiUpdateGenerationNoticeInput,
): Promise<AdminWriteActionResult<ApiGenerationNotice>> => {
  const payload = apiUpdateGenerationNoticeInputSchema.parse(input);
  return writeRequest({
    path: `/generations/${generationId}/notices/${noticeId}`,
    method: "PATCH",
    body: payload,
    responseSchema: apiGenerationNoticeSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.notices],
  });
};

export const deleteGenerationNoticeAction = async (
  generationId: string,
  noticeId: string,
): Promise<AdminWriteActionResult<void>> => {
  return writeRequest({
    path: `/generations/${generationId}/notices/${noticeId}`,
    method: "DELETE",
    responseSchema: readNoContentSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.notices],
  });
};

export const createGlobalNoticeAction = async (
  input: ApiCreateGlobalNoticeInput,
): Promise<AdminWriteActionResult<ApiGlobalNotice>> => {
  const payload = apiCreateGlobalNoticeInputSchema.parse(input);
  return writeRequest({
    path: "/global-notices",
    method: "POST",
    body: payload,
    responseSchema: apiGlobalNoticeSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.notices],
  });
};

export const updateGlobalNoticeAction = async (
  id: string,
  input: ApiUpdateGlobalNoticeInput,
): Promise<AdminWriteActionResult<ApiGlobalNotice>> => {
  const payload = apiUpdateGlobalNoticeInputSchema.parse(input);
  return writeRequest({
    path: `/global-notices/${id}`,
    method: "PATCH",
    body: payload,
    responseSchema: apiGlobalNoticeSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.notices],
  });
};

export const deleteGlobalNoticeAction = async (
  id: string,
): Promise<AdminWriteActionResult<void>> => {
  return writeRequest({
    path: `/global-notices/${id}`,
    method: "DELETE",
    responseSchema: readNoContentSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.notices],
  });
};

export const createMarketItemAction = async (
  input: ApiCreateMarketItemInput,
): Promise<AdminWriteActionResult<ApiMarketItem>> => {
  const payload = apiCreateMarketItemInputSchema.parse(input);
  return writeRequest({
    path: "/market/items",
    method: "POST",
    body: payload,
    responseSchema: apiMarketItemSchema,
    tags: [CACHE_TAGS.admin.market],
  });
};

export const updateMarketItemAction = async (
  id: string,
  input: ApiUpdateMarketItemInput,
): Promise<AdminWriteActionResult<ApiMarketItem>> => {
  const payload = apiUpdateMarketItemInputSchema.parse(input);
  return writeRequest({
    path: `/market/items/${id}`,
    method: "PATCH",
    body: payload,
    responseSchema: apiMarketItemSchema,
    tags: [CACHE_TAGS.admin.market],
  });
};

export const updateMarketItemStatusAction = async (
  id: string,
  input: ApiUpdateMarketItemStatusInput,
): Promise<AdminWriteActionResult<ApiMarketItem>> => {
  const payload = apiUpdateMarketItemStatusInputSchema.parse(input);
  return writeRequest({
    path: `/market/items/${id}/status`,
    method: "PATCH",
    body: payload,
    responseSchema: apiMarketItemSchema,
    tags: [CACHE_TAGS.admin.market],
  });
};

export const deleteMarketItemAction = async (
  id: string,
): Promise<AdminWriteActionResult<void>> => {
  return writeRequest({
    path: `/market/items/${id}`,
    method: "DELETE",
    responseSchema: readNoContentSchema,
    tags: [CACHE_TAGS.admin.market],
  });
};

export const createMarketCommentAction = async (
  id: string,
  input: ApiCreateMarketCommentInput,
): Promise<AdminWriteActionResult<ApiMarketComment>> => {
  const payload = apiCreateMarketCommentInputSchema.parse(input);
  return writeRequest({
    path: `/market/items/${id}/comments`,
    method: "POST",
    body: payload,
    responseSchema: apiMarketCommentSchema,
    tags: [CACHE_TAGS.admin.market],
  });
};

export const updateMarketCommentAction = async (
  id: string,
  input: ApiUpdateMarketCommentInput,
): Promise<AdminWriteActionResult<ApiMarketComment>> => {
  const payload = apiUpdateMarketCommentInputSchema.parse(input);
  return writeRequest({
    path: `/market/comments/${id}`,
    method: "PATCH",
    body: payload,
    responseSchema: apiMarketCommentSchema,
    tags: [CACHE_TAGS.admin.market],
  });
};

export const deleteMarketCommentAction = async (
  id: string,
): Promise<AdminWriteActionResult<void>> => {
  return writeRequest({
    path: `/market/comments/${id}`,
    method: "DELETE",
    responseSchema: readNoContentSchema,
    tags: [CACHE_TAGS.admin.market],
  });
};

export const upsertMarketPushSubscriptionAction = async (
  input: ApiMarketPushSubscriptionInput,
): Promise<AdminWriteActionResult<void>> => {
  const payload = apiMarketPushSubscriptionInputSchema.parse(input);
  return writeRequest({
    path: MARKET_PUSH_SUBSCRIPTIONS_PATH,
    method: "POST",
    body: payload,
    responseSchema: readNoContentSchema,
    tags: [CACHE_TAGS.admin.market],
  });
};

export const deleteMarketPushSubscriptionAction = async (
  input: ApiMarketPushSubscriptionInput,
): Promise<AdminWriteActionResult<void>> => {
  const payload = apiMarketPushSubscriptionInputSchema.parse(input);
  return writeRequest({
    path: MARKET_PUSH_SUBSCRIPTIONS_PATH,
    method: "DELETE",
    body: payload,
    responseSchema: readNoContentSchema,
    tags: [CACHE_TAGS.admin.market],
  });
};

export const updateSiteSettingsAction = async (
  input: ApiUpdateSiteSettingsInput,
): Promise<AdminWriteActionResult<ApiSiteSettings>> => {
  const parsedPayload = apiUpdateSiteSettingsInputSchema.safeParse(input);
  if (!parsedPayload.success) {
    const firstIssue = parsedPayload.error.issues[0];
    const firstPath = firstIssue?.path[0];
    const issueMessage =
      firstPath === "footerEmail"
        ? "이메일 형식이 올바르지 않습니다."
        : firstPath === "donateAccountNumber"
          ? "계좌번호는 숫자와 -만 입력할 수 있으며 최대 50자입니다."
          : "기본 설정 입력값 형식을 확인해 주세요.";

    return {
      ok: false,
      errorMessage: issueMessage,
      status: 400,
      code: "VALIDATION_ERROR",
      requestId: null,
    };
  }

  const payload = parsedPayload.data;
  return writeRequest({
    path: "/site-settings",
    method: "PATCH",
    body: payload,
    responseSchema: apiSiteSettingsSchema,
    accessScope: "leadership",
    tags: [CACHE_TAGS.admin.siteSettings, CACHE_TAGS.public.siteSettings],
  });
};

export const upsertCurrentRecruitingPlanAction = async (
  input: ApiUpsertCurrentRecruitingPlanInput,
): Promise<AdminWriteActionResult<ApiRecruitingPlan>> => {
  const payload = apiUpsertCurrentRecruitingPlanInputSchema.parse(input);
  return writeRequest({
    path: "/recruiting-plan/current",
    method: "PATCH",
    body: payload,
    responseSchema: apiRecruitingPlanSchema,
    accessScope: "leadership",
    tags: [CACHE_TAGS.admin.recruitingPlan, CACHE_TAGS.public.recruitingPlan],
  });
};

export const updateUserAction = async (
  id: string,
  input: ApiUpdateUserInput,
): Promise<AdminWriteActionResult<ApiUser>> => {
  const session = await serverAuthGuard.requireSession();
  const canManageUsers = canManageGlobalUsers(session);
  let payload: ApiUpdateUserInput | ApiMemberProfileUpdateInput;

  if (canManageUsers) {
    payload = apiUpdateUserInputSchema.parse(input);
  } else {
    const profile = await serverAuthGuard.getCurrentUserProfile(session);
    const currentProfileId =
      profile && typeof profile.id === "string" ? profile.id.trim() : "";
    const allowedUserIds = new Set(
      [session.user.id, currentProfileId].filter(
        (value): value is string => typeof value === "string" && value.length > 0,
      ),
    );

    if (!allowedUserIds.has(id)) {
      forbidden();
    }

    payload = apiMemberProfileUpdateInputSchema.parse(input);
  }

  return writeRequest({
    path: `/users/${id}`,
    method: "PATCH",
    body: payload,
    responseSchema: apiUserSchema,
    requireAdminAccess: canManageUsers,
    tags: [
      CACHE_TAGS.admin.users,
      CACHE_TAGS.admin.generations,
      CACHE_TAGS.public.photographers,
    ],
  });
};

export const bulkUpdateUsersRoleAction = async (
  input: ApiBulkUpdateUserRoleInput,
): Promise<BulkUpdateUsersRoleActionResult> => {
  const payload = apiBulkUpdateUserRoleInputSchema.parse(input);
  return writeRequest({
    path: "/users/bulk-role",
    method: "PATCH",
    body: payload,
    responseSchema: apiUserSchema.array(),
    accessScope: "user_manager",
    tags: [
      CACHE_TAGS.admin.users,
      CACHE_TAGS.admin.generations,
      CACHE_TAGS.public.photographers,
    ],
  });
};

export const deleteUserAction = async (
  id: string,
): Promise<AdminWriteActionResult<void>> => {
  return writeRequest({
    path: `/users/${id}`,
    method: "DELETE",
    responseSchema: readNoContentSchema,
    accessScope: "user_manager",
    tags: [
      CACHE_TAGS.admin.users,
      CACHE_TAGS.admin.generations,
      CACHE_TAGS.public.photographers,
    ],
  });
};
