import { describe, expect, it, vi } from "vitest";
import { createApp } from "../app";

describe("session + authz optimization", () => {
  it("unauth 보호 라우트에서 resolveActor는 한 번만 호출된다", async () => {
    const resolveActor = vi.fn(async () => null);
    const app = createApp({
      resolveActor,
      isDocsEnabled: () => true,
      getAuthOpenApiSchema: async () => ({
        openapi: "3.1.1",
        info: { title: "auth", version: "1.0.0" },
        paths: {},
      }),
    });

    const response = await app.fetch(
      new Request("https://example.com/api/generations"),
      { DB: {} } as any,
    );

    expect(response.status).toBe(401);
    expect(resolveActor).toHaveBeenCalledTimes(1);
  });
});
