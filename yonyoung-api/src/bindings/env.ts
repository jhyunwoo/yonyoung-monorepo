import { z } from "zod";
import type { Bindings } from "./types";

const stringBooleanSchema = z
  .enum(["true", "false", "1", "0", "yes", "no", "on", "off"])
  .optional();

const runtimeEnvSchema = z
  .object({
    BETTER_AUTH_URL: z.string().url().optional(),
    BETTER_AUTH_TRUSTED_ORIGINS: z.string().optional(),
    BETTER_AUTH_SECRET: z.string().optional(),
    BETTER_AUTH_EMAIL_AND_PASSWORD_ENABLED: stringBooleanSchema,
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    R2_S3_ENDPOINT: z.string().url().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET: z.string().optional(),
    R2_PUBLIC_BASE_URL: z.string().url().optional(),
    R2_PUBLIC_URL_SIGNING_SECRET: z.string().optional(),
    DOCS_ENABLED: stringBooleanSchema,
    DOCS_AUTH_IN_PROD: stringBooleanSchema,
    D1_SESSION_CONSISTENCY: z.string().optional(),
    D1_WRITE_RETRY_ENABLED: stringBooleanSchema,
    D1_WRITE_RETRY_MAX_RETRIES: z.string().optional(),
    D1_WRITE_RETRY_BASE_DELAY_MS: z.string().optional(),
    D1_WRITE_RETRY_MAX_DELAY_MS: z.string().optional(),
    PERF_ANALYTICS_ENABLED: stringBooleanSchema,
    PERF_ANALYTICS_SAMPLE_RATE: z.string().optional(),
    CSP_REPORT_ONLY: stringBooleanSchema,
    VAPID_PUBLIC_KEY: z.string().optional(),
    VAPID_PRIVATE_KEY: z.string().optional(),
    VAPID_SUBJECT: z.string().optional(),
  })
  .passthrough();

export type ParsedRuntimeEnv = z.infer<typeof runtimeEnvSchema>;

export const parseEnv = (env: Bindings): ParsedRuntimeEnv => {
  return runtimeEnvSchema.parse(env);
};

export const parseBooleanEnv = (
  value: string | undefined,
  fallback: boolean,
): boolean => {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
};

export const parseNumberEnv = (
  value: string | undefined,
  fallback: number,
): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : fallback;
};
