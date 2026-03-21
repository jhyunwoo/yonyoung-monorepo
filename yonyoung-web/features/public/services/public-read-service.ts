import "server-only";
import { cacheTag } from "next/cache";
import { z } from "zod";
import {
  apiActivitySchema,
  apiExhibitionSchema,
  apiGenerationSchema,
  apiLinktreeSchema,
  apiPublicGenerationWithMembersSchema,
  apiRecruitingPlanSchema,
  apiSiteSettingsSchema,
} from "@/shared/contracts/api-schemas";
import type {
  ApiActivity,
  ApiExhibition,
  ApiGeneration,
  ApiLinktree,
  ApiLinktreeItem,
  ApiPublicGenerationWithMembers,
  ApiRecruitingPlan,
  ApiSiteSettings,
} from "@/shared/contracts/api-contracts";
import { DEFAULT_SITE_SETTINGS } from "@/shared/contracts/api-contracts";
import { HonoApiError, honoRequest } from "@/server/http/hono-client";
import { CACHE_TAGS } from "@/server/cache/tags";
import { logger } from "@/server/observability/logger";

export const PUBLIC_CACHE_TAGS = CACHE_TAGS.public;

type PublicLinkItem = ApiLinktreeItem & {
  groupName: string;
};

const readPublic = async <T>(path: string, schema: z.ZodType<T>): Promise<T> => {
  return honoRequest<T>({
    path,
    method: "GET",
    responseSchema: schema,
    timeoutMs: 10_000,
  });
};

const readPublicWithFallback = async <T>(input: {
  path: string;
  schema: z.ZodType<T>;
  fallback: T;
  event: string;
}): Promise<T> => {
  try {
    return await readPublic<T>(input.path, input.schema);
  } catch (error) {
    logger.warn({
      event: input.event,
      route: input.path,
      method: "GET",
      status: error instanceof HonoApiError ? error.status : 500,
      error:
        error instanceof HonoApiError
          ? {
            code: error.code,
            requestId: error.requestId,
            message: error.message,
          }
          : {
            message: error instanceof Error ? error.message : "Unknown error",
          },
    });

    return input.fallback;
  }
};

export const listPublicActivities = async (): Promise<ApiActivity[]> => {
  "use cache";

  cacheTag(PUBLIC_CACHE_TAGS.activities);

  return readPublicWithFallback({
    path: "/api/public/activities",
    schema: z.array(apiActivitySchema),
    fallback: [],
    event: "public.activities.read_fallback",
  });
};

export const getPublicActivityById = async (id: string): Promise<ApiActivity> => {
  "use cache";

  cacheTag(PUBLIC_CACHE_TAGS.activities);

  return readPublic<ApiActivity>(`/api/public/activities/${id}`, apiActivitySchema);
};

export const listPublicExhibitions = async (): Promise<ApiExhibition[]> => {
  "use cache";

  cacheTag(PUBLIC_CACHE_TAGS.exhibitions);

  return readPublicWithFallback({
    path: "/api/public/exhibitions",
    schema: z.array(apiExhibitionSchema),
    fallback: [],
    event: "public.exhibitions.read_fallback",
  });
};

export const getPublicExhibitionById = async (id: string): Promise<ApiExhibition> => {
  "use cache";

  cacheTag(PUBLIC_CACHE_TAGS.exhibitions);

  return readPublic<ApiExhibition>(`/api/public/exhibitions/${id}`, apiExhibitionSchema);
};

export const listPublicLinktrees = async (): Promise<ApiLinktree[]> => {
  "use cache";

  cacheTag(PUBLIC_CACHE_TAGS.linktree);

  return readPublicWithFallback({
    path: "/api/public/linktree",
    schema: z.array(apiLinktreeSchema),
    fallback: [],
    event: "public.linktree.read_fallback",
  });
};

export const getPublicSiteSettings = async (): Promise<ApiSiteSettings> => {
  "use cache";

  cacheTag(PUBLIC_CACHE_TAGS.siteSettings);

  return readPublicWithFallback({
    path: "/api/public/site-settings",
    schema: apiSiteSettingsSchema,
    fallback: DEFAULT_SITE_SETTINGS,
    event: "public.site-settings.read_fallback",
  });
};

export const getPublicCurrentRecruitingPlan =
  async (): Promise<ApiRecruitingPlan | null> => {
    "use cache";

    cacheTag(PUBLIC_CACHE_TAGS.recruitingPlan);

    return readPublicWithFallback({
      path: "/api/public/recruiting-plan/current",
      schema: apiRecruitingPlanSchema.nullable(),
      fallback: null,
      event: "public.recruiting-plan.read_fallback",
    });
  };

export const listPublicGenerations = async (): Promise<ApiGeneration[]> => {
  "use cache";

  cacheTag(PUBLIC_CACHE_TAGS.generations);

  return readPublicWithFallback({
    path: "/api/public/generations",
    schema: z.array(apiGenerationSchema),
    fallback: [],
    event: "public.generations.read_fallback",
  });
};

export const listPublicPhotographers = async (): Promise<
  ApiPublicGenerationWithMembers[]
> => {
  "use cache";

  cacheTag(PUBLIC_CACHE_TAGS.photographers);

  return readPublicWithFallback({
    path: "/api/public/photographers",
    schema: z.array(apiPublicGenerationWithMembersSchema),
    fallback: [],
    event: "public.photographers.read_fallback",
  });
};

export const flattenLinktreeItems = (linktrees: ApiLinktree[]): PublicLinkItem[] => {
  return linktrees.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      groupName: group.name,
    })),
  );
};

export const safeList = async <T>(loader: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await loader();
  } catch {
    return fallback;
  }
};
