import "server-only";
import { getRequestContext } from "@/server/observability/context";
import { redact } from "@/server/observability/redact";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogPayload = {
  event: string;
  status?: number;
  durationMs?: number;
  route?: string;
  method?: string;
  requestId?: string;
  traceId?: string;
  error?: unknown;
  [key: string]: unknown;
};

const emit = (level: LogLevel, payload: LogPayload): void => {
  const context = getRequestContext();
  const base = {
    ts: new Date().toISOString(),
    level,
    event: payload.event,
    requestId: payload.requestId ?? context?.requestId,
    traceId: payload.traceId ?? context?.traceId,
    route: payload.route ?? context?.route,
    method: payload.method ?? context?.method,
    status: payload.status,
    durationMs: payload.durationMs,
  };

  const merged = {
    ...payload,
    ...base,
  };

  const line = JSON.stringify(redact(merged));

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  if (level === "debug") {
    console.debug(line);
    return;
  }

  console.log(line);
};

export const logger = {
  debug: (payload: LogPayload) => emit("debug", payload),
  info: (payload: LogPayload) => emit("info", payload),
  warn: (payload: LogPayload) => emit("warn", payload),
  error: (payload: LogPayload) => emit("error", payload),
};
