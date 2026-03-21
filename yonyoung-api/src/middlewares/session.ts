import type { MiddlewareHandler } from "hono";
import type HonoAppType from "../types/honoAppType";
import type { AppDependencies } from "../lib/services/dependencies";

const SKIP_SESSION_PREFIXES = [
  "/api/auth",
  "/api/public",
  "/api/openapi.json",
  "/api/docs",
  "/doc",
  "/ui",
  "/health",
] as const;

const shouldSkipSessionResolution = (path: string): boolean =>
  SKIP_SESSION_PREFIXES.some((prefix) => path.startsWith(prefix));

export const sessionMiddleware = (
  dependencies: AppDependencies,
): MiddlewareHandler<HonoAppType> => {
  return async (c, next) => {
    c.set("actor", null);

    if (!shouldSkipSessionResolution(c.req.path) && (c.env?.db || c.env?.DB)) {
      c.set("actorResolved", true);
      const actor = await dependencies.resolveActor(c);
      c.set("actor", actor);
    }

    await next();
  };
};
