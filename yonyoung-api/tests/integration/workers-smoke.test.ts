import { env } from "cloudflare:test";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app/createApp";
import { createHealthyBindings } from "../setup/mock-bindings";

describe("workers integration smoke", () => {
  it("GET /health returns 200 with healthy bindings", async () => {
    const app = createApp();

    const response = await app.request("/health", {}, createHealthyBindings());

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      status: string;
      summary: { unhealthy: number };
    };
    expect(body.status).toBe("healthy");
    expect(body.summary.unhealthy).toBe(0);
  });

  it("can pass cloudflare:test env into app.request for env-bound routes", async () => {
    const envProbeApp = new Hono<{
      Bindings: {
        BETTER_AUTH_URL?: string;
      };
    }>();
    envProbeApp.get("/env-check", (c) => {
      return c.json({
        hasBetterAuthUrl: Boolean(c.env.BETTER_AUTH_URL),
      });
    });

    const response = await envProbeApp.request("/env-check", {}, env);

    expect(response.status).toBe(200);
    const body = (await response.json()) as { hasBetterAuthUrl: boolean };
    expect(body.hasBetterAuthUrl).toBe(true);
  });
});
