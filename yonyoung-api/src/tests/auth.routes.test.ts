import { describe, expect, it, vi, beforeEach } from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";
import { registerAuthRoutes } from "../modules/auth";
import type HonoAppType from "../types/honoAppType";

vi.mock("../lib/auth", () => ({
  createAuth: vi.fn(),
}));

import { createAuth } from "../lib/auth";

describe("auth routes", () => {
  const mockCreateAuth = vi.mocked(createAuth);
  const bindings = { db: {} as D1Database } as HonoAppType["Bindings"];

  beforeEach(() => {
    mockCreateAuth.mockReset();
  });

  it("/api/auth/* GET 요청은 Better Auth handler에 위임한다", async () => {
    const handler = vi.fn(async () => new Response("ok", { status: 200 }));
    mockCreateAuth.mockReturnValue({ handler } as never);

    const app = new OpenAPIHono<HonoAppType>();
    registerAuthRoutes(app);

    const response = await app.request("/api/auth/get-session", {
      method: "GET",
    }, bindings);

    expect(response.status).toBe(200);
    expect(mockCreateAuth).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("/api/auth/* POST 요청은 Better Auth handler에 위임한다", async () => {
    const handler = vi.fn(async () => new Response("ok", { status: 200 }));
    mockCreateAuth.mockReturnValue({ handler } as never);

    const app = new OpenAPIHono<HonoAppType>();
    registerAuthRoutes(app);

    const response = await app.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ email: "tester@example.com", password: "secret" }),
    }, bindings);

    expect(response.status).toBe(200);
    expect(mockCreateAuth).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
