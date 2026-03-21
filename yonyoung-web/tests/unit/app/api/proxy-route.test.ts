import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { CSRF_HEADER_NAME, CSRF_HEADER_VALUE } from "@/shared/security/csrf";

describe("app/api/[...path]/route", () => {
  const originalApiBaseUrl = process.env.API_BASE_URL;

  beforeEach(() => {
    process.env.API_BASE_URL = "https://api.example.com";
    vi.resetModules();
  });

  afterEach(() => {
    process.env.API_BASE_URL = originalApiBaseUrl;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([
    {
      label: "audit GET requests",
      method: "GET",
      url: "https://yonyoung.yonsei.ac.kr/api/audit/activity/fd3f8274-4f0a-4b5b-be59-0ca7918f710a?limit=20",
      path: ["audit", "activity", "fd3f8274-4f0a-4b5b-be59-0ca7918f710a"],
      upstreamUrl:
        "https://api.example.com/api/audit/activity/fd3f8274-4f0a-4b5b-be59-0ca7918f710a?limit=20",
    },
    {
      label: "notice image presign requests",
      method: "POST",
      url: "https://yonyoung.yonsei.ac.kr/api/notices/presign/image",
      path: ["notices", "presign", "image"],
      upstreamUrl: "https://api.example.com/api/notices/presign/image",
    },
    {
      label: "recruiting image presign requests",
      method: "POST",
      url: "https://yonyoung.yonsei.ac.kr/api/recruiting/presign/image",
      path: ["recruiting", "presign", "image"],
      upstreamUrl: "https://api.example.com/api/recruiting/presign/image",
    },
  ])("forwards $label to the upstream API", async ({ method, path, upstreamUrl, url }) => {
    const fetchSpy = vi.fn(async () =>
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control": "private, no-store, max-age=0",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const handlers = await import("@/app/api/[...path]/route");
    const request = new NextRequest(url, {
      method,
      headers: {
        cookie: "__Secure-better-auth.session_token=session-token",
        origin: "https://yonyoung.yonsei.ac.kr",
        "sec-fetch-site": "same-origin",
        "x-request-id": "req-1",
        ...(method === "POST" ? { [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE } : {}),
      },
    });

    const handler = method === "POST" ? handlers.POST : handlers.GET;
    const response = await handler(request, {
      params: Promise.resolve({ path }),
    });

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith(
      upstreamUrl,
      expect.objectContaining({
        method,
        cache: "no-store",
        redirect: "manual",
      }),
    );

    const [, init] = fetchSpy.mock.calls[0] ?? [];
    const headers = init?.headers as Headers;
    expect(headers.get("cookie")).toBe("__Secure-better-auth.session_token=session-token");
    expect(headers.get("x-request-id")).toBe("req-1");
    expect(headers.get("x-forwarded-host")).toBe("yonyoung.yonsei.ac.kr");
    expect(headers.get("x-forwarded-proto")).toBe("https");
  });

  it("returns 404 for blocked or unknown proxy prefixes", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { GET } = await import("@/app/api/[...path]/route");
    const request = new NextRequest("https://yonyoung.yonsei.ac.kr/api/unknown/path", {
      method: "GET",
    });

    const response = await GET(request, {
      params: Promise.resolve({
        path: ["unknown", "path"],
      }),
    });

    expect(response.status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
