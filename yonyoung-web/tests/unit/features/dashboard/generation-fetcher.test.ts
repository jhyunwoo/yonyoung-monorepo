import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchGenerationsFromServer } from "@/features/dashboard/generation/generation-fetcher";

describe("features/dashboard/generation/generation-fetcher", () => {
  const originalApiBaseUrl = process.env.API_BASE_URL;

  beforeEach(() => {
    process.env.API_BASE_URL = "http://127.0.0.1:4010";
  });

  afterEach(() => {
    process.env.API_BASE_URL = originalApiBaseUrl;
    vi.unstubAllGlobals();
  });

  it("returns generation list from array response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify([
            { id: "gen-59", name: "59기", sortOrder: 59 },
            { id: "invalid" },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    await expect(fetchGenerationsFromServer()).resolves.toEqual([
      { id: "gen-59", name: "59기", sortOrder: 59 },
    ]);
  });

  it("returns generation list from data envelope response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            data: [
              { id: "gen-58", name: "58기", sortOrder: 58 },
              { id: "broken", sortOrder: "x" },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    await expect(fetchGenerationsFromServer()).resolves.toEqual([
      { id: "gen-58", name: "58기", sortOrder: 58 },
    ]);
  });

  it("returns empty array on non-ok, invalid payload, or errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
    await expect(fetchGenerationsFromServer()).resolves.toEqual([]);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ hello: "world" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    await expect(fetchGenerationsFromServer()).resolves.toEqual([]);

    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network");
    }));
    await expect(fetchGenerationsFromServer()).resolves.toEqual([]);
  });
});
