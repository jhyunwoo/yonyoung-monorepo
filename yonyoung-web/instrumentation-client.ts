type ClientErrorPayload = {
  event: "client.error" | "client.unhandledrejection" | "router.transition.start";
  path: string;
  message?: string;
  stack?: string;
  metadata?: Record<string, unknown>;
  sampledAt: number;
};

const ENDPOINT = "/api/internal/client-error";
const SAMPLE_RATE = 0.2;
const FLAG_KEY = "__yy_client_instrumentation_registered";

const deterministicSampleValue = (input: string): number => {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash / 2 ** 32;
};

const shouldSample = (key: string): boolean => {
  if (SAMPLE_RATE >= 1) {
    return true;
  }

  if (SAMPLE_RATE <= 0) {
    return false;
  }

  return deterministicSampleValue(key) < SAMPLE_RATE;
};

const report = (payload: ClientErrorPayload): void => {
  if (!shouldSample(`${payload.event}:${payload.path}:${payload.message ?? ""}`)) {
    return;
  }

  const body = JSON.stringify(payload);
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon(
      ENDPOINT,
      new Blob([body], { type: "application/json; charset=UTF-8" }),
    );
    return;
  }

  void fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    keepalive: true,
  });
};

const getPath = (): string => {
  if (typeof window === "undefined") {
    return "";
  }

  return `${window.location.pathname}${window.location.search}`;
};

const toMessage = (value: unknown): string => {
  if (value instanceof Error) {
    return value.message;
  }

  if (typeof value === "string") {
    return value;
  }

  return "Unknown client error";
};

const toStack = (value: unknown): string | undefined => {
  if (value instanceof Error && typeof value.stack === "string") {
    return value.stack;
  }

  return undefined;
};

const registerGlobalClientErrorHandlers = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  const globalWindow = window as Window & { [FLAG_KEY]?: boolean };
  if (globalWindow[FLAG_KEY]) {
    return;
  }

  globalWindow[FLAG_KEY] = true;

  window.addEventListener("error", (event) => {
    report({
      event: "client.error",
      path: getPath(),
      message: event.message || toMessage(event.error),
      stack: toStack(event.error),
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
      sampledAt: Date.now(),
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    report({
      event: "client.unhandledrejection",
      path: getPath(),
      message: toMessage(event.reason),
      stack: toStack(event.reason),
      sampledAt: Date.now(),
    });
  });
};

registerGlobalClientErrorHandlers();

export const onRouterTransitionStart = (
  url: string,
  navigationType: "push" | "replace" | "traverse",
): void => {
  report({
    event: "router.transition.start",
    path: getPath(),
    metadata: {
      url,
      navigationType,
    },
    sampledAt: Date.now(),
  });
};
