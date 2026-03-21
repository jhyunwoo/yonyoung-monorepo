import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import {
  ApiActivitySchema,
  ApiExhibitionSchema,
  ApiGenerationSchema,
  ApiIdParamSchema,
  ApiLinktreeSchema,
  ApiPublicGenerationWithMembersSchema,
  ApiRecruitingPlanSchema,
  ApiSiteSettingsSchema,
} from "../lib/openapi/schemas";
import { dataResponse, errorResponses } from "../lib/openapi/responses";
import { badRequest, internalError, notFound, ok } from "../lib/http/response";
import { respondWithPublicCache } from "../lib/http/public-cache";
import { AppDependencies } from "../lib/services/dependencies";
import HonoAppType from "../types/honoAppType";
import { sanitizeRichTextHtml } from "../lib/content/rich-text";
import { sanitizeExhibitionRichText } from "../lib/content/exhibition-rich-text";
import { createR2Client, resolveR2Bucket } from "../infra/r2/client";
import {
  ALLOWED_IMAGE_CONTENT_TYPES,
  parseManagedObjectKey,
  resolvePublicObjectSigningSecrets,
  verifySignedPublicObjectSignature,
} from "../lib/storage/presign";

type App = OpenAPIHono<HonoAppType>;
const PUBLIC_MEDIA_CACHE_CONTROL =
  "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

const sanitizeExhibitionDescriptionField = <T extends { description: string }>(
  exhibition: T,
): T => ({
  ...exhibition,
  description: sanitizeExhibitionRichText(exhibition.description),
});

const sanitizeActivityDescriptionField = <T extends { description: string }>(
  activity: T,
): T => ({
  ...activity,
  description: sanitizeRichTextHtml(activity.description),
});

const CONTENT_TYPE_BY_EXTENSION = {
  avif: "image/avif",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} satisfies Record<
  string,
  (typeof ALLOWED_IMAGE_CONTENT_TYPES)[number]
>;

const resolvePublicMediaContentType = (
  objectKey: string,
  metadataContentType: string | null | undefined,
): (typeof ALLOWED_IMAGE_CONTENT_TYPES)[number] | null => {
  const normalizedContentType = metadataContentType?.trim().toLowerCase();
  if (
    normalizedContentType &&
    ALLOWED_IMAGE_CONTENT_TYPES.includes(
      normalizedContentType as (typeof ALLOWED_IMAGE_CONTENT_TYPES)[number],
    )
  ) {
    return normalizedContentType as (typeof ALLOWED_IMAGE_CONTENT_TYPES)[number];
  }

  const fileName = objectKey.split("/").at(-1)?.toLowerCase() ?? "";
  const extension = fileName.split(".").at(-1);
  if (!extension) {
    return null;
  }

  if (!(extension in CONTENT_TYPE_BY_EXTENSION)) {
    return null;
  }

  return CONTENT_TYPE_BY_EXTENSION[extension as keyof typeof CONTENT_TYPE_BY_EXTENSION];
};

const listPublicActivitiesRoute = createRoute({
  method: "get",
  path: "/api/public/activities",
  tags: ["Public"],
  operationId: "listPublicActivities",
  responses: {
    200: dataResponse(ApiActivitySchema.array(), "공개 활동 목록 조회 성공"),
  },
});

const listPublicExhibitionsRoute = createRoute({
  method: "get",
  path: "/api/public/exhibitions",
  tags: ["Public"],
  operationId: "listPublicExhibitions",
  responses: {
    200: dataResponse(ApiExhibitionSchema.array(), "공개 전시 목록 조회 성공"),
  },
});

const getPublicActivityByIdRoute = createRoute({
  method: "get",
  path: "/api/public/activities/{id}",
  tags: ["Public"],
  operationId: "getPublicActivityById",
  request: {
    params: ApiIdParamSchema,
  },
  responses: {
    200: dataResponse(ApiActivitySchema, "공개 활동 상세 조회 성공"),
    400: errorResponses[400],
    404: errorResponses[404],
  },
});

const getPublicExhibitionByIdRoute = createRoute({
  method: "get",
  path: "/api/public/exhibitions/{id}",
  tags: ["Public"],
  operationId: "getPublicExhibitionById",
  request: {
    params: ApiIdParamSchema,
  },
  responses: {
    200: dataResponse(ApiExhibitionSchema, "공개 전시 상세 조회 성공"),
    400: errorResponses[400],
    404: errorResponses[404],
  },
});

const listPublicLinktreeRoute = createRoute({
  method: "get",
  path: "/api/public/linktree",
  tags: ["Public"],
  operationId: "listPublicLinktree",
  responses: {
    200: dataResponse(ApiLinktreeSchema.array(), "공개 링크트리 목록 조회 성공"),
  },
});

const getPublicSiteSettingsRoute = createRoute({
  method: "get",
  path: "/api/public/site-settings",
  tags: ["Public"],
  operationId: "getPublicSiteSettings",
  responses: {
    200: dataResponse(ApiSiteSettingsSchema, "공개 사이트 기본 설정 조회 성공"),
  },
});

const getPublicCurrentRecruitingPlanRoute = createRoute({
  method: "get",
  path: "/api/public/recruiting-plan/current",
  tags: ["Public"],
  operationId: "getPublicCurrentRecruitingPlan",
  responses: {
    200: dataResponse(
      ApiRecruitingPlanSchema.nullable(),
      "공개 현재 연도 모집 계획 조회 성공",
    ),
  },
});

const listPublicGenerationsRoute = createRoute({
  method: "get",
  path: "/api/public/generations",
  tags: ["Public"],
  operationId: "listPublicGenerations",
  responses: {
    200: dataResponse(ApiGenerationSchema.array(), "공개 기수 목록 조회 성공"),
  },
});

const listPublicPhotographersRoute = createRoute({
  method: "get",
  path: "/api/public/photographers",
  tags: ["Public"],
  operationId: "listPublicPhotographers",
  responses: {
    200: dataResponse(
      ApiPublicGenerationWithMembersSchema.array(),
      "공개 기수별 사진가 목록 조회 성공",
    ),
  },
});

/**
 * registerPublicRoutes 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param app 함수 로직에서 사용하는 입력값입니다.
 * @param dependencies 함수 로직에서 사용하는 입력값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const registerPublicRoutes = (
  app: App,
  dependencies: AppDependencies,
) => {
  app.get("/api/public/media/:objectKey{.+}", async (c) => {
    const objectKey = c.req.param("objectKey");
    if (typeof objectKey !== "string" || objectKey.length === 0) {
      return notFound(c);
    }

    const parsedObjectKey = parseManagedObjectKey(objectKey);
    if (!parsedObjectKey) {
      return notFound(c);
    }

    const signingSecrets = resolvePublicObjectSigningSecrets(c.env);
    if (signingSecrets.length === 0) {
      return internalError(
        c,
        "스토리지 공개 URL 서명 설정(R2_PUBLIC_URL_SIGNING_SECRET 또는 BETTER_AUTH_SECRET)이 누락되었습니다.",
      );
    }

    const signature = c.req.query("sig");
    const isValidSignature = await verifySignedPublicObjectSignature({
      objectKey,
      signature,
      signingSecrets,
    });
    if (!isValidSignature) {
      return notFound(c);
    }

    const bucket = resolveR2Bucket(c.env);
    const object = await createR2Client(bucket).getObject(objectKey);
    if (!object) {
      return notFound(c);
    }

    const contentType = resolvePublicMediaContentType(
      objectKey,
      object.httpMetadata?.contentType,
    );
    if (!contentType) {
      return notFound(c);
    }

    const headers = new Headers();
    headers.set("Cache-Control", PUBLIC_MEDIA_CACHE_CONTROL);
    headers.set("Content-Type", contentType);
    headers.set("X-Content-Type-Options", "nosniff");

    if (object.httpEtag) {
      headers.set("ETag", object.httpEtag);
    }

    if (typeof object.size === "number" && Number.isFinite(object.size)) {
      headers.set("Content-Length", String(object.size));
    }

    return new Response(object.body, {
      status: 200,
      headers,
    });
  });

  app.openapi(listPublicActivitiesRoute, async (c): Promise<any> =>
    respondWithPublicCache(c, async () => {
      const data = await dependencies.getDataService(c).listPublicActivities();
      return ok(c, data.map(sanitizeActivityDescriptionField));
    }),
  );

  app.openapi(getPublicActivityByIdRoute, async (c): Promise<any> =>
    respondWithPublicCache(c, async () => {
      const params = ApiIdParamSchema.safeParse(c.req.param());
      if (!params.success) {
        return badRequest(c, params.error.issues[0]?.message ?? "잘못된 요청입니다.");
      }

      const data = await dependencies
        .getDataService(c)
        .getActivityById(params.data.id);
      if (!data) {
        return notFound(c);
      }
      return ok(c, sanitizeActivityDescriptionField(data));
    }),
  );

  app.openapi(listPublicExhibitionsRoute, async (c): Promise<any> =>
    respondWithPublicCache(c, async () => {
      const data = await dependencies.getDataService(c).listPublicExhibitions();
      return ok(c, data.map(sanitizeExhibitionDescriptionField));
    }),
  );

  app.openapi(getPublicExhibitionByIdRoute, async (c): Promise<any> =>
    respondWithPublicCache(c, async () => {
      const params = ApiIdParamSchema.safeParse(c.req.param());
      if (!params.success) {
        return badRequest(c, params.error.issues[0]?.message ?? "잘못된 요청입니다.");
      }

      const data = await dependencies
        .getDataService(c)
        .getExhibitionById(params.data.id);
      if (!data) {
        return notFound(c);
      }
      return ok(c, sanitizeExhibitionDescriptionField(data));
    }),
  );

  app.openapi(listPublicLinktreeRoute, async (c): Promise<any> =>
    respondWithPublicCache(c, async () => {
      const data = await dependencies.getDataService(c).listLinktrees();
      return ok(c, data);
    }),
  );

  app.openapi(getPublicSiteSettingsRoute, async (c): Promise<any> =>
    respondWithPublicCache(c, async () => {
      const data = await dependencies.getDataService(c).getSiteSettings();
      return ok(c, data);
    }),
  );

  app.openapi(getPublicCurrentRecruitingPlanRoute, async (c): Promise<any> =>
    respondWithPublicCache(c, async () => {
      const data = await dependencies.getDataService(c).getCurrentRecruitingPlan();
      return ok(c, data);
    }),
  );

  app.openapi(listPublicGenerationsRoute, async (c): Promise<any> =>
    respondWithPublicCache(c, async () => {
      const data = await dependencies
        .getDataService(c)
        .listGenerations()
        .then((rows) => [...rows].sort((a, b) => a.sortOrder - b.sortOrder));
      return ok(c, data);
    }),
  );

  app.openapi(listPublicPhotographersRoute, async (c): Promise<any> =>
    respondWithPublicCache(c, async () => {
      const dataService = dependencies.getDataService(c);
      const [generations, users] = await Promise.all([
        dataService
          .listGenerations()
          .then((rows) => [...rows].sort((a, b) => a.sortOrder - b.sortOrder)),
        dataService.listUsers(),
      ]);

      const readMemberSortName = (member: {
        familyName: string | null;
        givenName: string | null;
        name: string;
      }): string => {
        const familyName = member.familyName?.trim() ?? "";
        const givenName = member.givenName?.trim() ?? "";
        if (familyName.length > 0 && givenName.length > 0) {
          return `${familyName}${givenName}`;
        }
        return member.name.trim();
      };

      const data = generations.map((generation) => {
        const members = users
          .filter((user) =>
            ((user.generationIds?.length ?? 0) > 0
              ? user.generationIds ?? []
              : user.generationId
                ? [user.generationId]
                : []
            ).includes(generation.id),
          )
          .map((user) => ({
            id: user.id,
            name: user.name,
            image: user.image,
            showcaseImageUrls: user.showcaseImageUrls,
            familyName: user.familyName,
            givenName: user.givenName,
            collaborationAvailable: user.collaborationAvailable,
            personalLink: user.personalLink,
            role: user.role,
            generationId: generation.id,
          }))
          .sort((a, b) =>
            readMemberSortName(a).localeCompare(readMemberSortName(b), "ko"),
          );

        return {
          id: generation.id,
          name: generation.name,
          sortOrder: generation.sortOrder,
          startDate: generation.startDate,
          endDate: generation.endDate,
          members,
        };
      });

      return ok(c, data);
    }),
  );
};
