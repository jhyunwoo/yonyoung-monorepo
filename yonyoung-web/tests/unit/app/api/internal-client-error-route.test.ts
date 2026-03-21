import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

vi.mock("@/server/observability/logger", () => ({
  logger,
}));

const createRequest = (body: Record<string, unknown>) =>
  new NextRequest("https://app.example.com/api/internal/client-error", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://app.example.com",
      "sec-fetch-site": "same-origin",
      "x-request-id": "req-1",
      "x-trace-id": "trace-1",
    },
    body: JSON.stringify(body),
  });

describe("app/api/internal/client-error/route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs router transition telemetry at info level with sanitized route details", async () => {
    const { POST } = await import("@/app/api/internal/client-error/route");
    const response = await POST(
      createRequest({
        event: "router.transition.start",
        path: "/?email=user@example.com",
        metadata: {
          url: "/dashboard/members?email=user@example.com#frag",
          navigationType: "push",
        },
        sampledAt: 1700000000000,
      }),
    );

    expect(response.status).toBe(202);
    expect(logger.info).toHaveBeenCalledWith({
      event: "router.transition.start",
      route: "/",
      status: 202,
      requestId: "req-1",
      traceId: "trace-1",
      ingestPath: "/api/internal/client-error",
      ingestMethod: "POST",
      transition: {
        navigationType: "push",
        targetRoute: "/dashboard/members",
      },
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("keeps real client errors at warn level", async () => {
    const { POST } = await import("@/app/api/internal/client-error/route");
    const response = await POST(
      createRequest({
        event: "client.error",
        path: "/dashboard?email=user@example.com",
        message: "TypeError: user@example.com leaked",
        stack: "Error: boom\n    at example (secret.js:1:1)",
        metadata: {
          email: "user@example.com",
          token: "secret-token",
        },
        sampledAt: 1700000000000,
      }),
    );

    expect(response.status).toBe(202);
    expect(logger.warn).toHaveBeenCalledWith({
      event: "client.error",
      route: "/dashboard",
      status: 202,
      requestId: "req-1",
      traceId: "trace-1",
      ingestPath: "/api/internal/client-error",
      ingestMethod: "POST",
      error: {
        messagePresent: true,
        messageLength: 34,
        stackPresent: true,
        stackLineCount: 2,
        metadataKeyCount: 2,
        metadataKeys: ["email", "token"],
      },
    });
    expect(logger.info).not.toHaveBeenCalled();
  });
});
