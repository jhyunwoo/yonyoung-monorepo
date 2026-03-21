import "server-only";
import { z } from "zod";

const EnvSchema = z.object({
  API_BASE_URL: z.url().transform((value) => value.replace(/\/+$/, "")),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  REVALIDATE_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().optional(),
});

type Env = z.infer<typeof EnvSchema>;

let cachedEnv: Env | null = null;

const formatZodIssues = (issues: z.core.$ZodIssue[]): string =>
  issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ");

export const getEnv = (): Env => {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment variables: ${formatZodIssues(parsed.error.issues)}`,
    );
  }

  cachedEnv = parsed.data;
  return cachedEnv;
};

export const getApiBaseUrl = (): string => getEnv().API_BASE_URL;
