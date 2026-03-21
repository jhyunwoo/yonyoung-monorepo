export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogPayload = {
  event: string;
  requestId?: string;
  timestamp?: string;
} & Record<string, unknown>;

export type LogEntry = LogPayload & {
  level: LogLevel;
};

const REDACTION_PATTERNS = [
  /(authorization|cookie|token|secret|password)\s*[:=]\s*([^\n\r,;]+)/gi,
  /bearer\s+[a-z0-9._-]+/gi,
] as const;

const sanitizeString = (value: string): string => {
  return REDACTION_PATTERNS.reduce(
    (current, pattern) =>
      current.replace(pattern, (match, key?: string) => {
        if (typeof key === "string") {
          return `${key}=[REDACTED]`;
        }
        if (match.toLowerCase().startsWith("bearer ")) {
          return "Bearer [REDACTED]";
        }
        return "[REDACTED]";
      }),
    value,
  );
};

const sanitizeValue = (value: unknown): unknown => {
  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, sanitizeValue(entry)]),
    );
  }

  return value;
};

const writeLog = (entry: LogEntry) => {
  const withTimestamp: LogEntry = {
    ...entry,
    timestamp: entry.timestamp ?? new Date().toISOString(),
  };
  const sanitized = sanitizeValue(withTimestamp);
  console.log(JSON.stringify(sanitized));
};

export const logger = {
  debug: (entry: LogPayload) => writeLog({ ...entry, level: "debug" }),
  info: (entry: LogPayload) => writeLog({ ...entry, level: "info" }),
  warn: (entry: LogPayload) => writeLog({ ...entry, level: "warn" }),
  error: (entry: LogPayload) => writeLog({ ...entry, level: "error" }),
};
