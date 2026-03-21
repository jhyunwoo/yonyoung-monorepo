import { describe, expect, it, vi, beforeEach } from "vitest";
import { z } from "zod";

const fetchWithTimeoutMock = vi.hoisted(() => vi.fn());
const getApiBaseUrlMock = vi.hoisted(() => vi.fn(() => "http://127.0.0.1:4010"));
const readServerForwardedRequestContextMock = vi.hoisted(() =>
  vi.fn(async () => ({
    host: "yonyoung.yonsei.ac.kr",
    protocol: "https" as const,
    origin: "https://yonyoung.yonsei.ac.kr",
  })),
);

vi.mock("@/server/env", () => ({
  getApiBaseUrl: getApiBaseUrlMock,
}));

vi.mock("@/server/http/fetch-with-timeout", () => {
  class MockFetchTimeoutError extends Error {
    readonly timeoutMs: number;

    constructor(timeoutMs: number) {
      super(`Request timed out after ${timeoutMs}ms`);
      this.name = "FetchTimeoutError";
      this.timeoutMs = timeoutMs;
    }
  }

  return {
    FetchTimeoutError: MockFetchTimeoutError,
    fetchWithTimeout: fetchWithTimeoutMock,
  };
});

vi.mock("@/server/http/request-context", () => ({
  readServerForwardedRequestContext: readServerForwardedRequestContextMock,
}));

import { HonoApiError, honoRequest } from "@/server/http/hono-client";

const responseSchema = z.object({ id: z.string(), name: z.string() });

describe("server/http/hono-client", () => {
  beforeEach(() => {
    fetchWithTimeoutMock.mockReset();
    getApiBaseUrlMock.mockReset();
    getApiBaseUrlMock.mockReturnValue("http://127.0.0.1:4010");
    readServerForwardedRequestContextMock.mockClear();
  });

  it("sends request and extracts data envelope", async () => {
    fetchWithTimeoutMock.mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "u1", name: "Kim" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await honoRequest({
      path: "users/u1",
      method: "GET",
      responseSchema,
      requestId: "req-1",
      traceId: "trace-1",
      cookieHeader: "mock_role=member",
    });

    expect(result).toEqual({ id: "u1", name: "Kim" });
    expect(fetchWithTimeoutMock).toHaveBeenCalledOnce();

    const [url, init] = fetchWithTimeoutMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://127.0.0.1:4010/users/u1");
    expect(init.method).toBe("GET");
    expect(init.headers).toBeInstanceOf(Headers);
    const headers = init.headers as Headers;
    expect(headers.get("x-request-id")).toBe("req-1");
    expect(headers.get("x-trace-id")).toBe("trace-1");
    expect(headers.get("cookie")).toBe("mock_role=member");
    expect(headers.get("x-forwarded-host")).toBe("yonyoung.yonsei.ac.kr");
    expect(headers.get("x-forwarded-proto")).toBe("https");
    expect(headers.get("origin")).toBe("https://yonyoung.yonsei.ac.kr");
    expect(readServerForwardedRequestContextMock).toHaveBeenCalledOnce();
  });

  it("throws parsed API error on non-2xx responses", async () => {
    fetchWithTimeoutMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "FORBIDDEN",
            message: "No permission",
            requestId: "rid-1",
          },
        }),
        { status: 403, headers: { "content-type": "application/json" } },
      ),
    );

    await expect(honoRequest({ path: "/secure", responseSchema })).rejects.toMatchObject({
      name: "HonoApiError",
      status: 403,
      code: "FORBIDDEN",
      requestId: "rid-1",
      message: "No permission",
    });
  });

  it("throws generic API status error when error envelope is absent", async () => {
    fetchWithTimeoutMock.mockResolvedValue(new Response("no-json", { status: 500 }));

    await expect(honoRequest({ path: "/broken", responseSchema })).rejects.toMatchObject({
      name: "HonoApiError",
      status: 500,
      code: "UNKNOWN",
      message: "API request failed with status 500",
    });
  });

  it("handles API error envelope without requestId", async () => {
    fetchWithTimeoutMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "FORBIDDEN",
            message: "No permission",
          },
        }),
        { status: 403, headers: { "content-type": "application/json" } },
      ),
    );

    await expect(honoRequest({ path: "/secure", responseSchema })).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
      requestId: null,
    });
  });

  it("maps timeout errors to 408 TIMEOUT", async () => {
    const { FetchTimeoutError } = await import("@/server/http/fetch-with-timeout");
    fetchWithTimeoutMock.mockRejectedValue(new FetchTimeoutError(1000));

    await expect(honoRequest({ path: "/slow", responseSchema })).rejects.toMatchObject({
      status: 408,
      code: "TIMEOUT",
    });
  });

  it("passes through HonoApiError and wraps unknown errors", async () => {
    fetchWithTimeoutMock.mockRejectedValue(
      new HonoApiError({ status: 409, code: "CONFLICT", message: "Conflict" }),
    );

    await expect(
      honoRequest({ path: "/conflict", responseSchema }),
    ).rejects.toMatchObject({ status: 409, code: "CONFLICT", message: "Conflict" });

    fetchWithTimeoutMock.mockRejectedValue(new Error("network"));
    await expect(honoRequest({ path: "/network", responseSchema })).rejects.toMatchObject(
      { status: 500, code: "UNKNOWN", message: "network" },
    );

    fetchWithTimeoutMock.mockRejectedValue("boom");
    await expect(honoRequest({ path: "/network", responseSchema })).rejects.toMatchObject(
      {
        status: 500,
        code: "UNKNOWN",
        message: "알 수 없는 오류가 발생했습니다.",
      },
    );
  });

  it("sends JSON body and content-type for mutation requests", async () => {
    fetchWithTimeoutMock.mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "u2", name: "Lee" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await honoRequest({
      path: "/users",
      method: "POST",
      body: { name: "Lee" },
      responseSchema,
      timeoutMs: 55,
    });

    const [, init, timeoutMs] = fetchWithTimeoutMock.mock.calls[0] as [
      string,
      RequestInit,
      number,
    ];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ name: "Lee" }));
    const headers = init.headers as Headers;
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(timeoutMs).toBe(55);
  });

  it("returns generic unknown error when success response is not parseable JSON", async () => {
    fetchWithTimeoutMock.mockResolvedValue(
      new Response("plain text", {
        status: 200,
        headers: { "content-type": "text/plain" },
      }),
    );

    await expect(
      honoRequest({ path: "/users/plain", responseSchema }),
    ).rejects.toMatchObject({
      status: 500,
      code: "UNKNOWN",
    });
  });
});
