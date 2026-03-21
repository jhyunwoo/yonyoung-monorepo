import { Context } from "hono";
import HonoAppType from "../../types/honoAppType";
import { runInBackground } from "./background-task";

const PUBLIC_CACHE_TTL_SECONDS = 120;
const PUBLIC_CACHE_STALE_REVALIDATE_SECONDS = 300;
const PUBLIC_CACHE_MAX_AGE_SECONDS = 30;
const CACHE_STATUS_HEADER = "X-Public-Cache-Status";
const CACHED_AT_HEADER = "X-Public-Cache-Cached-At";
const CACHEABLE_RESPONSE_FORBIDDEN_HEADERS = ["set-cookie"] as const;
const PERSONALIZATION_HEADERS = ["authorization", "cookie"] as const;

export const PUBLIC_CACHE_CONTROL = `public, max-age=${PUBLIC_CACHE_MAX_AGE_SECONDS}, s-maxage=${PUBLIC_CACHE_TTL_SECONDS}`;

const getDefaultCache = (): Cache | null => {
  const cacheStorage = (
    globalThis as typeof globalThis & {
      caches?: CacheStorage & { default?: Cache };
    }
  ).caches;
  return cacheStorage?.default ?? null;
};

const hasHeaderValue = (
  headers: Headers,
  names: readonly string[],
): boolean => {
  return names.some((name) => {
    const value = headers.get(name);
    return typeof value === "string" && value.trim().length > 0;
  });
};

const shouldBypassPublicCache = (request: Request): boolean =>
  hasHeaderValue(request.headers, PERSONALIZATION_HEADERS);

const isCacheableResponse = (response: Response): boolean => {
  if (!response.ok) {
    return false;
  }

  return !hasHeaderValue(
    response.headers,
    CACHEABLE_RESPONSE_FORBIDDEN_HEADERS,
  );
};

const addCacheStatusHeader = (
  response: Response,
  status: "hit" | "miss" | "stale" | "bypass" | "skip-store",
): Response => {
  const headers = new Headers(response.headers);
  headers.set(CACHE_STATUS_HEADER, status);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const annotateCacheMetadata = (
  response: Response,
  cachedAtMs: number,
): Response => {
  if (!isCacheableResponse(response)) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", PUBLIC_CACHE_CONTROL);
  headers.set(CACHED_AT_HEADER, `${cachedAtMs}`);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const readCachedAt = (response: Response): number | null => {
  const value = response.headers.get(CACHED_AT_HEADER);
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const isFreshCache = (cachedAt: number, now: number): boolean =>
  now - cachedAt <= PUBLIC_CACHE_TTL_SECONDS * 1000;

const isStaleButRevalidatable = (cachedAt: number, now: number): boolean =>
  now - cachedAt <=
  (PUBLIC_CACHE_TTL_SECONDS + PUBLIC_CACHE_STALE_REVALIDATE_SECONDS) * 1000;

const setCacheStatusVariable = (
  c: Context<HonoAppType>,
  status: "hit" | "miss" | "stale" | "bypass" | "skip-store",
) => {
  c.set("cacheStatus", status);
};

export const withPublicCacheHeaders = (response: Response): Response => {
  return annotateCacheMetadata(response, Date.now());
};

export const respondWithPublicCache = async (
  c: Context<HonoAppType>,
  buildResponse: () => Promise<Response>,
): Promise<Response> => {
  const request = c.req.raw;
  if (shouldBypassPublicCache(request)) {
    setCacheStatusVariable(c, "bypass");
    const response = withPublicCacheHeaders(await buildResponse());
    return addCacheStatusHeader(response, "bypass");
  }

  const cache = getDefaultCache();
  if (!cache) {
    setCacheStatusVariable(c, "skip-store");
    const response = withPublicCacheHeaders(await buildResponse());
    return addCacheStatusHeader(response, "skip-store");
  }

  const cacheKey = new Request(c.req.url, { method: "GET" });
  const now = Date.now();

  try {
    const cached = await cache.match(cacheKey);
    if (cached) {
      const cachedAt = readCachedAt(cached);
      if (cachedAt !== null) {
        if (isFreshCache(cachedAt, now)) {
          setCacheStatusVariable(c, "hit");
          return addCacheStatusHeader(cached, "hit");
        }

        if (isStaleButRevalidatable(cachedAt, now)) {
          setCacheStatusVariable(c, "stale");
          await runInBackground(
            c,
            (async () => {
              const refreshed = annotateCacheMetadata(await buildResponse(), Date.now());
              if (!isCacheableResponse(refreshed)) {
                return;
              }
              await cache.put(cacheKey, refreshed.clone());
            })(),
          );
          return addCacheStatusHeader(cached, "stale");
        }
      }
    }
  } catch {
    // ignore cache lookup failures and continue with origin response
  }

  const response = annotateCacheMetadata(await buildResponse(), now);
  if (!isCacheableResponse(response)) {
    setCacheStatusVariable(c, "skip-store");
    return addCacheStatusHeader(response, "skip-store");
  }

  setCacheStatusVariable(c, "miss");
  await runInBackground(
    c,
    cache.put(cacheKey, response.clone()),
    {
      fallback: "await",
    },
  );

  return addCacheStatusHeader(response, "miss");
};
