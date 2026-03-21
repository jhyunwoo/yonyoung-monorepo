import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("public-read-service", () => {
  beforeEach(() => {
    process.env.API_BASE_URL = "https://api.example.com";
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("parses successful public activities response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "act-1",
                title: "테스트 활동",
                description: "설명",
                startDate: 1700000000000,
                endDate: 1700003600000,
                coverImageUrl: "https://cdn.example.com/a.jpg",
                generationId: "gen-1",
                createdAt: 1700000000000,
                updatedAt: 1700003600000,
                updatedBy: null,
                detailImages: [],
              },
            ],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
      ),
    );

    const { listPublicActivities } =
      await import("@/features/public/services/public-read-service");
    const result = await listPublicActivities();

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("act-1");
  });

  it("returns fallback empty list when schema validation fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [{ invalid: true }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const { listPublicActivities } =
      await import("@/features/public/services/public-read-service");
    const result = await listPublicActivities();

    expect(result).toEqual([]);
  });

  it("returns fallback empty list when request aborts/times out", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

    const { listPublicActivities } =
      await import("@/features/public/services/public-read-service");
    const result = await listPublicActivities();

    expect(result).toEqual([]);
  });
});
