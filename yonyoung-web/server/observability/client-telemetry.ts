import "server-only";

const MAX_METADATA_KEYS = 20;
const UNKNOWN_ROUTE = "/unknown";

const trimToNull = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const normalizeObservedRoute = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) {
    return UNKNOWN_ROUTE;
  }

  try {
    return new URL(trimmed, "https://telemetry.invalid").pathname || "/";
  } catch {
    return UNKNOWN_ROUTE;
  }
};

export const summarizeClientErrorForLog = (input: {
  message?: string;
  stack?: string;
  metadata?: Record<string, unknown>;
}) => {
  const message = trimToNull(input.message);
  const stack = trimToNull(input.stack);
  const metadataKeys = Object.keys(input.metadata ?? {}).sort().slice(0, MAX_METADATA_KEYS);

  return {
    messagePresent: message !== null,
    messageLength: message?.length ?? 0,
    stackPresent: stack !== null,
    stackLineCount: stack ? stack.split(/\r?\n/).filter(Boolean).length : 0,
    metadataKeyCount: metadataKeys.length,
    metadataKeys,
  };
};

const readMetadataString = (
  metadata: Record<string, unknown> | undefined,
  key: string,
): string | null => {
  const value = metadata?.[key];
  return typeof value === "string" ? trimToNull(value) : null;
};

export const summarizeRouterTransitionForLog = (input: {
  metadata?: Record<string, unknown>;
}) => {
  const navigationType = readMetadataString(input.metadata, "navigationType");
  const targetUrl = readMetadataString(input.metadata, "url");

  return {
    navigationType,
    targetRoute: targetUrl ? normalizeObservedRoute(targetUrl) : UNKNOWN_ROUTE,
  };
};

export const summarizeWebVitalForLog = (input: {
  id: string;
  name: string;
  value: number;
  rating: string;
  delta?: number;
  navigationType?: string;
  sampledAt?: number;
}) => ({
  id: input.id,
  name: input.name,
  value: input.value,
  rating: input.rating,
  delta: input.delta,
  navigationType: input.navigationType,
  sampledAt: input.sampledAt,
});
