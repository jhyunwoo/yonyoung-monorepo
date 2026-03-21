import { describe, expect, it } from "vitest";
import { createTestApp, readJson } from "../../src/tests/test-helpers";

describe("openapi docs endpoints", () => {
  it("serves OpenAPI JSON on /doc and /api/openapi.json", async () => {
    const app = createTestApp({ actor: null, isDocsEnabled: true });

    const docResponse = await app.request("/doc");
    expect(docResponse.status).toBe(200);

    const docBody = await readJson<{
      openapi: string;
      info: { title: string; version: string };
      paths: Record<string, unknown>;
      components: Record<string, unknown>;
    }>(docResponse);

    expect(docBody.openapi).toMatch(/^3\./);
    expect(typeof docBody.info.title).toBe("string");
    expect(typeof docBody.info.version).toBe("string");
    expect(docBody.paths).toBeTypeOf("object");
    expect(docBody.components).toBeTypeOf("object");

    const legacyDocResponse = await app.request("/api/openapi.json");
    expect(legacyDocResponse.status).toBe(200);
  });

  it("serves docs UI on /ui and /api/docs", async () => {
    const app = createTestApp({ actor: null, isDocsEnabled: true });

    const uiResponse = await app.request("/ui");
    expect(uiResponse.status).toBe(200);
    expect(uiResponse.headers.get("content-type")).toContain("text/html");

    const legacyUiResponse = await app.request("/api/docs");
    expect(legacyUiResponse.status).toBe(200);
    expect(legacyUiResponse.headers.get("content-type")).toContain("text/html");
  });

  it("returns 404 for all docs aliases when docs are disabled", async () => {
    const app = createTestApp({ actor: null, isDocsEnabled: false });

    const responses = await Promise.all([
      app.request("/doc"),
      app.request("/api/openapi.json"),
      app.request("/ui"),
      app.request("/api/docs"),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(404);
    }
  });
});
