import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PUBLIC_CACHE_CONTROL,
  respondWithPublicCache,
  withPublicCacheHeaders,
} from "../lib/http/public-cache";
import type HonoAppType from "../types/honoAppType";
import type { Context } from "hono";

type WaitUntilCollector = {
  waitUntil: (promise: Promise<unknown>) => void;
  flush: () => Promise<void>;
  calledTimes: () => number;
};

const createWaitUntilCollector = (): WaitUntilCollector => {
  const pending: Promise<unknown>[] = [];
  const waitUntilSpy = vi.fn((promise: Promise<unknown>) => {
    pending.push(promise.catch(() => undefined));
  });

  return {
    waitUntil: waitUntilSpy,
    flush: async () => {
      await Promise.all(pending);
    },
    calledTimes: () => waitUntilSpy.mock.calls.length,
  };
};

const createContext = (
  input?: {
    url?: string;
    headers?: HeadersInit;
    waitUntil?: (promise: Promise<unknown>) => void;
  },
) => {
  const url = input?.url ?? "https://example.com/api/public/activities";
  const variables = new Map<string, unknown>();
  return {
    req: {
      url,
      raw: new Request(url, {
        headers: input?.headers,
      }),
    },
    executionCtx: input?.waitUntil
      ? {
          waitUntil: input.waitUntil,
        }
      : undefined,
    set: (key: string, value: unknown) => {
      variables.set(key, value);
    },
    get: (key: string) => variables.get(key),
  } as unknown as Context<HonoAppType>;
};

const createCacheMock = () => ({
  match: vi.fn<() => Promise<Response | undefined>>(async () => undefined),
  put: vi.fn<(request: Request, response: Response) => Promise<void>>(
    async () => undefined,
  ),
  delete: vi.fn<(request: Request) => Promise<boolean>>(async () => true),
});

describe("public cache helpers", () => {
  const originalCaches = (globalThis as { caches?: unknown }).caches;

  afterEach(() => {
    (globalThis as { caches?: unknown }).caches = originalCaches;
    vi.restoreAllMocks();
  });

  it("cache.put 실패 시에도 정상 응답을 반환한다", async () => {
    const waitUntil = createWaitUntilCollector();
    (globalThis as { caches?: unknown }).caches = {
      default: {
        match: vi.fn(async () => undefined),
        put: vi.fn(async () => {
          throw new Error("cache write failed");
        }),
      },
    };

    const response = await respondWithPublicCache(
      createContext({ waitUntil: waitUntil.waitUntil }),
      async () =>
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(PUBLIC_CACHE_CONTROL);
    expect(waitUntil.calledTimes()).toBe(1);

    await waitUntil.flush();
  });

  it("실패 응답은 cache-control 헤더를 주입하지 않는다", async () => {
    const response = withPublicCacheHeaders(
      new Response("boom", {
        status: 500,
      }),
    );

    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBeNull();
  });

  it("캐시 hit 시 데이터 빌더를 다시 호출하지 않는다", async () => {
    const cached = new Response(JSON.stringify({ data: [{ id: "cached" }] }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": PUBLIC_CACHE_CONTROL,
        "x-public-cache-cached-at": `${Date.now()}`,
      },
    });

    const buildResponse = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ id: "fresh" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    (globalThis as { caches?: unknown }).caches = {
      default: {
        match: vi.fn(async () => cached.clone()),
        put: vi.fn(async () => undefined),
      },
    };

    const response = await respondWithPublicCache(createContext(), buildResponse);

    expect(response.status).toBe(200);
    expect(buildResponse).not.toHaveBeenCalled();
    expect(response.headers.get("x-public-cache-status")).toBe("hit");

    const body = (await response.json()) as { data: Array<{ id: string }> };
    expect(body.data[0]?.id).toBe("cached");
  });

  it("stale 캐시는 즉시 반환하고 waitUntil로 백그라운드 재검증한다", async () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);

    const cacheMock = createCacheMock();
    const waitUntil = createWaitUntilCollector();

    const staleCached = new Response(JSON.stringify({ data: [{ id: "stale" }] }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": PUBLIC_CACHE_CONTROL,
        "x-public-cache-cached-at": `${now - 130_000}`,
      },
    });

    cacheMock.match.mockResolvedValueOnce(staleCached.clone());
    (globalThis as { caches?: unknown }).caches = {
      default: cacheMock,
    };

    const buildResponse = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ id: "fresh" }] }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    const response = await respondWithPublicCache(
      createContext({ waitUntil: waitUntil.waitUntil }),
      buildResponse,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-public-cache-status")).toBe("stale");
    expect(await response.json()).toEqual({ data: [{ id: "stale" }] });
    expect(waitUntil.calledTimes()).toBe(1);

    await waitUntil.flush();

    expect(buildResponse).toHaveBeenCalledTimes(1);
    expect(cacheMock.put).toHaveBeenCalledTimes(1);
  });

  it("Authorization/Cookie 요청은 개인화 가능성이 있어 캐시를 우회한다", async () => {
    const cacheMock = createCacheMock();
    (globalThis as { caches?: unknown }).caches = {
      default: cacheMock,
    };

    const response = await respondWithPublicCache(
      createContext({
        headers: {
          cookie: "better-auth.session_token=session-token",
        },
      }),
      async () =>
        new Response(JSON.stringify({ data: [{ id: "fresh" }] }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
    );

    expect(response.status).toBe(200);
    expect(cacheMock.match).not.toHaveBeenCalled();
    expect(cacheMock.put).not.toHaveBeenCalled();
    expect(response.headers.get("x-public-cache-status")).toBe("bypass");
  });

  it("Set-Cookie를 포함한 응답은 캐시하지 않는다", async () => {
    const cacheMock = createCacheMock();
    const waitUntil = createWaitUntilCollector();
    (globalThis as { caches?: unknown }).caches = {
      default: cacheMock,
    };

    const response = await respondWithPublicCache(
      createContext({ waitUntil: waitUntil.waitUntil }),
      async () =>
        new Response(JSON.stringify({ data: [{ id: "fresh" }] }), {
          status: 200,
          headers: {
            "content-type": "application/json",
            "set-cookie": "sample-token=abc; Path=/; HttpOnly",
          },
        }),
    );

    expect(response.status).toBe(200);
    expect(waitUntil.calledTimes()).toBe(0);
    expect(cacheMock.put).not.toHaveBeenCalled();
    expect(response.headers.get("x-public-cache-status")).toBe("skip-store");
  });
});
