import type { Actor } from "../lib/authorization/types";
import type { DataService } from "../lib/services/types";

export type Bindings = CloudflareBindings & {
  DB?: D1Database;
  db?: D1Database;
  R2?: R2Bucket;
  r2?: R2Bucket;
  PERF_ANALYTICS?: AnalyticsEngineDataset;
  BETTER_AUTH_URL?: string;
  BETTER_AUTH_TRUSTED_ORIGINS?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_EMAIL_AND_PASSWORD_ENABLED?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  R2_S3_ENDPOINT?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET?: string;
  R2_PUBLIC_BASE_URL?: string;
  R2_PUBLIC_URL_SIGNING_SECRET?: string;
  DOCS_ENABLED?: string;
  DOCS_AUTH_IN_PROD?: string;
  D1_SESSION_CONSISTENCY?: string;
  D1_WRITE_RETRY_ENABLED?: string;
  D1_WRITE_RETRY_MAX_RETRIES?: string;
  D1_WRITE_RETRY_BASE_DELAY_MS?: string;
  D1_WRITE_RETRY_MAX_DELAY_MS?: string;
  PERF_ANALYTICS_ENABLED?: string;
  PERF_ANALYTICS_SAMPLE_RATE?: string;
  CSP_REPORT_ONLY?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
};

export type AppVariables = {
  actor: Actor | null;
  requestId: string;
  correlationId: string;
  startedAt: number;
  cacheStatus: "hit" | "miss" | "stale" | "bypass" | "skip-store" | null;
  actorResolved: boolean;
  dataService: DataService | null;
};

export type HonoAppEnv = {
  Bindings: Bindings;
  Variables: AppVariables;
};
