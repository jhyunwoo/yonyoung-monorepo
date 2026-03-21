import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    toString: () => "mock_session=abc123",
  })),
}));

import {
  AdminApiError,
  applyForwardedRequestContextHeaders,
  asRecord,
  clearTimeoutController,
  createTimeoutController,
  isRecord,
  normalizeBaseUrl,
  normalizePath,
  parseApiErrorEnvelope,
  parseJsonBody,
  readCookieHeader,
  resolveApiBaseUrl,
  resolveBaseUrl,
  resolveForwardedRequestContext,
  unwrapDataEnvelope,
} from "@/shared/http/http";

const originalWindow = globalThis.window;
const originalApiBaseUrl = process.env.API_BASE_URL;

describe("shared/http/http", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    process.env.API_BASE_URL = "http://127.0.0.1:4010/";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    if (originalWindow === undefined) {
      // @ts-expect-error test cleanup
      delete globalThis.window;
    } else {
      // @ts-expect-error test cleanup
      globalThis.window = originalWindow;
    }
    process.env.API_BASE_URL = originalApiBaseUrl;
  });

  it("normalizes base paths and relative paths", () => {
    expect(normalizeBaseUrl("https://example.com///")).toBe("https://example.com");
    expect(normalizePath("users")).toBe("/users");
    expect(normalizePath("/users")).toBe("/users");
  });

  it("resolves first non-empty base URL candidate", () => {
    const resolved = resolveBaseUrl(
      ["", undefined, "  ", " https://a.com/ ", "https://b.com"],
      "https://fallback.com/",
    );
    expect(resolved).toBe("https://a.com");

    expect(resolveBaseUrl([undefined, ""], "https://fallback.com///")).toBe(
      "https://fallback.com",
    );
  });

  it("parses API error envelopes safely", () => {
    expect(
      parseApiErrorEnvelope({
        error: { code: "BAD_REQUEST", message: "bad", requestId: "req-1" },
      }),
    ).toEqual({
      error: { code: "BAD_REQUEST", message: "bad", requestId: "req-1" },
    });

    expect(
      parseApiErrorEnvelope({ error: { code: 1, message: "bad", requestId: "r" } }),
    ).toBeNull();
    expect(parseApiErrorEnvelope(null)).toBeNull();
    expect(isRecord({})).toBe(true);
    expect(isRecord(null)).toBe(false);
  });

  it("provides AdminApiError fields", () => {
    const error = new AdminApiError({
      status: 400,
      code: "BAD_REQUEST",
      message: "x",
      requestId: "rid",
    });
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AdminApiError");
    expect(error.status).toBe(400);
    expect(error.code).toBe("BAD_REQUEST");
    expect(error.requestId).toBe("rid");
  });

  it("creates and clears timeout controllers", () => {
    const abortSpy = vi.spyOn(AbortController.prototype, "abort");
    createTimeoutController(1000);
    vi.advanceTimersByTime(1000);
    expect(abortSpy).toHaveBeenCalledTimes(1);

    const second = createTimeoutController(1000);
    clearTimeoutController(second.timeoutId);
    vi.advanceTimersByTime(1000);
    expect(abortSpy).toHaveBeenCalledTimes(1);
  });

  it("parses JSON and non-JSON response bodies", async () => {
    const jsonResponse = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    const textResponse = new Response("plain", {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
    const noBodyResponse = new Response("", {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
    const noContentResponse = new Response(null, { status: 204 });

    await expect(parseJsonBody(jsonResponse)).resolves.toEqual({ ok: true });
    await expect(parseJsonBody(textResponse)).resolves.toBe("plain");
    await expect(parseJsonBody(noBodyResponse)).resolves.toBeNull();
    await expect(parseJsonBody(noContentResponse)).resolves.toBeNull();
  });

  it("unwraps data envelopes", () => {
    expect(asRecord({ a: 1 })).toEqual({ a: 1 });
    expect(asRecord(null)).toBeNull();
    expect(unwrapDataEnvelope<{ id: string }>({ data: { id: "1" } })).toEqual({
      id: "1",
    });
    expect(unwrapDataEnvelope<{ id: string }>({ id: "2" })).toEqual({ id: "2" });
  });

  it("reads cookie headers from next/headers", async () => {
    await expect(readCookieHeader()).resolves.toBe("mock_session=abc123");
  });

  it("resolves forwarded request context from proxy-aware headers", () => {
    expect(
      resolveForwardedRequestContext({
        host: "api.yonyoung.moveto.kr",
        forwardedHost: "yonyoung.yonsei.ac.kr",
        forwardedProto: "https",
        origin: "https://yonyoung.yonsei.ac.kr/dashboard",
      }),
    ).toEqual({
      host: "yonyoung.yonsei.ac.kr",
      protocol: "https",
      origin: "https://yonyoung.yonsei.ac.kr",
    });

    expect(
      resolveForwardedRequestContext({
        host: "localhost:3000",
      }),
    ).toEqual({
      host: "localhost:3000",
      protocol: "http",
      origin: "http://localhost:3000",
    });
  });

  it("applies forwarded request context headers for upstream auth checks", () => {
    const headers = applyForwardedRequestContextHeaders(
      new Headers({
        Accept: "application/json",
      }),
      {
        host: "yonyoung.yonsei.ac.kr",
        protocol: "https",
        origin: "https://yonyoung.yonsei.ac.kr",
      },
    );

    expect(headers.get("x-forwarded-host")).toBe("yonyoung.yonsei.ac.kr");
    expect(headers.get("x-forwarded-proto")).toBe("https");
    expect(headers.get("origin")).toBe("https://yonyoung.yonsei.ac.kr");
  });

  it("resolves API base URL for client and server", () => {
    const fakeWindow = {
      location: {
        origin: "http://localhost:3000/",
      },
    } as unknown as Window;

    // @ts-expect-error test assignment
    globalThis.window = fakeWindow;
    expect(resolveApiBaseUrl()).toBe("http://localhost:3000");

    // @ts-expect-error test cleanup
    delete globalThis.window;
    expect(resolveApiBaseUrl({ clientSide: false })).toBe("http://127.0.0.1:4010");
  });

  it("throws when server API base URL is missing", () => {
    delete process.env.API_BASE_URL;
    expect(() => resolveApiBaseUrl({ clientSide: false })).toThrow(
      "API_BASE_URL is required on the server runtime.",
    );
  });
});
