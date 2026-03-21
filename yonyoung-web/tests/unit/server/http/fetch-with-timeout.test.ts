import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchWithTimeout, FetchTimeoutError } from "@/server/http/fetch-with-timeout";

describe("server/http/fetch-with-timeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("returns fetch response when completed before timeout", async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ ok: true })));
    vi.stubGlobal("fetch", fetchSpy);

    const response = await fetchWithTimeout("http://example.com", { method: "GET" }, 2000);

    expect(response.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [, init] = fetchSpy.mock.calls[0] as [RequestInfo, RequestInit];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("throws FetchTimeoutError when aborted", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_: RequestInfo | URL, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const abortError = new Error("aborted");
            abortError.name = "AbortError";
            reject(abortError);
          });
        });
      }),
    );

    const promise = fetchWithTimeout("http://example.com", { method: "GET" }, 1000);
    vi.advanceTimersByTime(1000);

    await expect(promise).rejects.toEqual(expect.any(FetchTimeoutError));
    await expect(promise).rejects.toMatchObject({ timeoutMs: 1000, name: "FetchTimeoutError" });
  });

  it("rethrows non-abort errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network down");
    }));

    await expect(fetchWithTimeout("http://example.com", { method: "GET" }, 1000)).rejects.toThrow(
      "network down",
    );
  });
});
