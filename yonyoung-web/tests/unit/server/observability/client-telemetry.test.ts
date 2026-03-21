import { describe, expect, it } from "vitest";
import {
  normalizeObservedRoute,
  summarizeClientErrorForLog,
  summarizeRouterTransitionForLog,
  summarizeWebVitalForLog,
} from "@/server/observability/client-telemetry";

describe("server/observability/client-telemetry", () => {
  it("normalizes client supplied paths to a pathname only value", () => {
    expect(normalizeObservedRoute("/dashboard/members?email=user@example.com#frag")).toBe(
      "/dashboard/members",
    );
    expect(normalizeObservedRoute("https://evil.example.com/not-a-path")).toBe("/unknown");
  });

  it("summarizes client error payloads without logging raw message, stack, or metadata values", () => {
    const summary = summarizeClientErrorForLog({
      message: "TypeError: user@example.com leaked",
      stack: "Error: boom\n    at example (secret.js:1:1)",
      metadata: {
        email: "user@example.com",
        token: "secret-token",
      },
    });

    expect(summary).toEqual({
      messagePresent: true,
      messageLength: 34,
      stackPresent: true,
      stackLineCount: 2,
      metadataKeyCount: 2,
      metadataKeys: ["email", "token"],
    });
    expect(JSON.stringify(summary)).not.toContain("user@example.com");
    expect(JSON.stringify(summary)).not.toContain("secret-token");
  });

  it("summarizes router transitions with sanitized target routes", () => {
    expect(
      summarizeRouterTransitionForLog({
        metadata: {
          url: "/dashboard/members?email=user@example.com#frag",
          navigationType: "push",
        },
      }),
    ).toEqual({
      navigationType: "push",
      targetRoute: "/dashboard/members",
    });

    expect(
      summarizeRouterTransitionForLog({
        metadata: {
          url: "https://evil.example.com/not-a-path",
        },
      }),
    ).toEqual({
      navigationType: null,
      targetRoute: "/unknown",
    });
  });

  it("preserves numeric web-vitals fields while leaving path handling to the caller", () => {
    expect(
      summarizeWebVitalForLog({
        id: "v1-123",
        name: "LCP",
        value: 1234,
        rating: "good",
        delta: 100,
        navigationType: "navigate",
        sampledAt: 1700000000000,
      }),
    ).toEqual({
      id: "v1-123",
      name: "LCP",
      value: 1234,
      rating: "good",
      delta: 100,
      navigationType: "navigate",
      sampledAt: 1700000000000,
    });
  });
});
