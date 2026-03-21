import type { Context } from "hono";
import { getActorFromSession } from "../auth/session";
import { createAuth } from "../auth";
import { Actor } from "../authorization/types";
import HonoAppType from "../../types/honoAppType";
import { parseBooleanEnv, parseNumberEnv } from "../../bindings/env";
import { resolveD1Database } from "../../infra/db/client";
import { resolveR2Bucket } from "../../infra/r2/client";
import { DataService, PresignService } from "./types";
import { createR2PresignService } from "../storage/presign";
import type { OpenAPIDocument } from "../openapi/merge";
import { getDbDataService } from "../db/factory";
import { resolveDocsEnabled } from "../config/runtime-env";
import { createD1SequentialSession, resolveD1SessionMode } from "../db/d1-session";
import { createRetryingD1Database } from "../db/d1-client";
import { readR2TotalUsageBytes } from "../storage/usage";

export type ResolveActor = (
  c: Context<HonoAppType>,
) => Promise<Actor | null> | Actor | null;

export type GetDataService = (c: Context<HonoAppType>) => DataService;

export type GetPresignService = (c: Context<HonoAppType>) => PresignService;

export type ReadR2TotalUsageBytes = (
  c: Context<HonoAppType>,
) => Promise<number>;

export type GetAuthOpenApiSchema = (
  c: Context<HonoAppType>,
) => Promise<OpenAPIDocument>;

export type IsDocsEnabled = (c: Context<HonoAppType>) => boolean;

export type AppDependencies = {
  resolveActor: ResolveActor;
  getDataService: GetDataService;
  getPresignService: GetPresignService;
  readR2TotalUsageBytes: ReadR2TotalUsageBytes;
  getAuthOpenApiSchema: GetAuthOpenApiSchema;
  isDocsEnabled: IsDocsEnabled;
};

export const createDefaultDependencies = (): AppDependencies => ({
  resolveActor: getActorFromSession,
  isDocsEnabled: (c) => resolveDocsEnabled(c.env),
  getDataService: (c) => {
    const cached = c.get("dataService");
    if (cached) {
      return cached;
    }

    const database = resolveD1Database(c.env);
    const sessionMode = resolveD1SessionMode(c.env.D1_SESSION_CONSISTENCY);
    const session = createD1SequentialSession(database, {
      mode: sessionMode,
    });

    const retryEnabled = parseBooleanEnv(c.env.D1_WRITE_RETRY_ENABLED, true);
    const databaseWithRetry = createRetryingD1Database(session.database, {
      enabled: retryEnabled,
      options: {
        maxRetries: parseNumberEnv(c.env.D1_WRITE_RETRY_MAX_RETRIES, 2),
        baseDelayMs: parseNumberEnv(c.env.D1_WRITE_RETRY_BASE_DELAY_MS, 25),
        maxDelayMs: parseNumberEnv(c.env.D1_WRITE_RETRY_MAX_DELAY_MS, 500),
      },
    });

    const dataService = getDbDataService(databaseWithRetry as D1Database);
    c.set("dataService", dataService);
    return dataService;
  },
  getPresignService: (c) => createR2PresignService(c.env),
  readR2TotalUsageBytes: (c) => readR2TotalUsageBytes(resolveR2Bucket(c.env)),
  getAuthOpenApiSchema: async (c) => {
    const database = resolveD1Database(c.env);
    const auth = createAuth(database, c.env);
    const request = new Request(
      new URL("/api/auth/open-api/generate-schema", c.req.url),
      {
        method: "GET",
        headers: c.req.raw.headers,
      },
    );
    const response = await auth.handler(request);
    if (!response.ok) {
      throw new Error("인증 OpenAPI 스키마 조회에 실패했습니다.");
    }
    return (await response.json()) as OpenAPIDocument;
  },
});
