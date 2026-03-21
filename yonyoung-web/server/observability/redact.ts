import "server-only";

const SENSITIVE_KEYS = [
  "authorization",
  "cookie",
  "set-cookie",
  "password",
  "secret",
  "token",
  "apikey",
  "api-key",
  "x-api-key",
  "access-token",
  "refresh-token",
];

const isSensitiveKey = (key: string): boolean => {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEYS.some((sensitive) => normalized.includes(sensitive));
};

const redactValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      output[key] = isSensitiveKey(key) ? "[REDACTED]" : redactValue(item);
    }
    return output;
  }

  return value;
};

export const redact = <T>(payload: T): T => redactValue(payload) as T;
