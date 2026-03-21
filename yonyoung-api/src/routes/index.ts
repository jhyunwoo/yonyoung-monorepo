import { OpenAPIHono, type OpenAPIHonoOptions } from "@hono/zod-openapi";
import { registerActivityRoutes } from "../modules/activities";
import { registerAuditRoutes } from "../modules/audit";
import { registerAuthRoutes } from "../modules/auth";
import { registerDashboardRoutes } from "../modules/dashboard";
import { registerDocsRoutes } from "../modules/docs";
import { registerExhibitionRoutes } from "../modules/exhibitions";
import { registerGenerationRoutes } from "../modules/generations";
import { registerLinktreeRoutes } from "../modules/linktree";
import { registerMarketRoutes } from "../modules/market";
import { registerNoticeRoutes } from "../modules/notices";
import { registerPublicRoutes } from "../modules/public";
import { registerRecruitingPlanRoutes } from "../modules/recruiting-plan";
import { registerSiteSettingsRoutes } from "../modules/site-settings";
import { registerUploadRoutes } from "../modules/uploads";
import { registerUserRoutes } from "../modules/users";
import type { AppDependencies } from "../lib/services/dependencies";
import type HonoAppType from "../types/honoAppType";

const createDomainRouter = (
  register: (router: OpenAPIHono<HonoAppType>) => void,
  defaultHook: OpenAPIHonoOptions<HonoAppType>["defaultHook"],
): OpenAPIHono<HonoAppType> => {
  const router = new OpenAPIHono<HonoAppType>({ defaultHook });
  register(router);
  return router;
};

const mountDomainRouter = (
  app: OpenAPIHono<HonoAppType>,
  router: OpenAPIHono<HonoAppType>,
) => {
  app.route("/", router);
  app.openAPIRegistry.definitions.push(...router.openAPIRegistry.definitions);
};

export const mountDomainRouters = (
  app: OpenAPIHono<HonoAppType>,
  dependencies: AppDependencies,
  defaultHook: OpenAPIHonoOptions<HonoAppType>["defaultHook"],
) => {
  mountDomainRouter(
    app,
    createDomainRouter((router) => {
      registerAuthRoutes(router);
    }, defaultHook),
  );

  mountDomainRouter(
    app,
    createDomainRouter((router) => {
      registerGenerationRoutes(router, dependencies);
      registerNoticeRoutes(router, dependencies);
      registerMarketRoutes(router, dependencies);
      registerActivityRoutes(router, dependencies);
      registerExhibitionRoutes(router, dependencies);
      registerLinktreeRoutes(router, dependencies);
      registerUserRoutes(router, dependencies);
      registerSiteSettingsRoutes(router, dependencies);
      registerRecruitingPlanRoutes(router, dependencies);
      registerDashboardRoutes(router, dependencies);
      registerAuditRoutes(router, dependencies);
    }, defaultHook),
  );

  mountDomainRouter(
    app,
    createDomainRouter((router) => {
      registerUploadRoutes(router, dependencies);
      registerPublicRoutes(router, dependencies);
    }, defaultHook),
  );

  registerDocsRoutes(app, dependencies);
};
