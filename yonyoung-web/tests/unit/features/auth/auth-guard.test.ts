import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const readCookieHeaderMock = vi.hoisted(() => vi.fn());
const resolveApiBaseUrlMock = vi.hoisted(() => vi.fn());
const readServerForwardedRequestContextMock = vi.hoisted(() =>
  vi.fn(async () => ({
    host: "yonyoung.yonsei.ac.kr",
    protocol: "https" as const,
    origin: "https://yonyoung.yonsei.ac.kr",
  })),
);

vi.mock("@/features/auth/server/auth-server", () => ({
  fetchSessionFromApi: vi.fn(),
}));

vi.mock("@/shared/http/http", () => {
  const asRecord = (value: unknown): Record<string, unknown> | null => {
    if (typeof value !== "object" || value === null) {
      return null;
    }
    return value as Record<string, unknown>;
  };

  return {
    asRecord,
    applyForwardedRequestContextHeaders: (
      headers: Headers,
      context: { host: string | null; protocol: "http" | "https"; origin: string | null },
    ) => {
      if (context.host) {
        headers.set("x-forwarded-host", context.host);
      }
      headers.set("x-forwarded-proto", context.protocol);
      if (context.origin) {
        headers.set("origin", context.origin);
      }
      return headers;
    },
    unwrapDataEnvelope: <T>(payload: unknown): T | null => {
      const record = asRecord(payload);
      if (record && "data" in record) {
        return (record as { data: T | null }).data ?? null;
      }
      return payload as T;
    },
    readCookieHeader: readCookieHeaderMock,
    resolveApiBaseUrl: resolveApiBaseUrlMock,
  };
});

vi.mock("@/server/http/request-context", () => ({
  readServerForwardedRequestContext: readServerForwardedRequestContextMock,
}));

import type { AuthSession } from "@/features/auth/model/auth-shared";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";

const createJsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });

const createSession = (): AuthSession => ({
  session: {
    id: "session-id",
    userId: "user-id",
    expiresAt: 0,
  },
  user: {
    id: "non-uuid-user-id",
    email: "member@example.com",
    name: "연영 회원",
    role: "regular_member",
  },
});

describe("features/auth/server/auth-guard", () => {
  beforeEach(() => {
    readCookieHeaderMock.mockReset();
    readCookieHeaderMock.mockResolvedValue("better-auth.session_token=session-token");
    resolveApiBaseUrlMock.mockReset();
    resolveApiBaseUrlMock.mockReturnValue("https://api.example.com");
    readServerForwardedRequestContextMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to users list by email when user-id lookup fails", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            error: {
              code: "NOT_FOUND",
              message: "Not Found",
            },
          },
          404,
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            error: {
              code: "BAD_REQUEST",
              message: "id 형식이 올바르지 않습니다.",
            },
          },
          400,
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          data: [
            {
              id: "user-id",
              email: "member@example.com",
              generationId: "gen-59",
              generationIds: ["gen-59", "gen-58"],
            },
          ],
        }),
      );

    const profile = await serverAuthGuard.getCurrentUserProfile(createSession());

    expect(profile).toEqual({
      id: "user-id",
      email: "member@example.com",
      generationId: "gen-59",
      generationIds: ["gen-59", "gen-58"],
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.example.com/api/users/me");
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://api.example.com/api/users/non-uuid-user-id",
    );
    expect(fetchMock.mock.calls[2]?.[0]).toBe("https://api.example.com/api/users");
  });

  it("prefers /api/users/me when available", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createJsonResponse({
        data: {
          id: "user-id",
          email: "member@example.com",
          generationId: "gen-59",
          generationIds: ["gen-59"],
        },
      }),
    );

    const profile = await serverAuthGuard.getCurrentUserProfile(createSession());

    expect(profile).toEqual({
      id: "user-id",
      email: "member@example.com",
      generationId: "gen-59",
      generationIds: ["gen-59"],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.example.com/api/users/me");
    const requestHeaders = (fetchMock.mock.calls[0]?.[1] as RequestInit | undefined)
      ?.headers as Headers;
    expect(requestHeaders.get("x-forwarded-host")).toBe("yonyoung.yonsei.ac.kr");
    expect(requestHeaders.get("x-forwarded-proto")).toBe("https");
    expect(requestHeaders.get("origin")).toBe("https://yonyoung.yonsei.ac.kr");
  });
});
