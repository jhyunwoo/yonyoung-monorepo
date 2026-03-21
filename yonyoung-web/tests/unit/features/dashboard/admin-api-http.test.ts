import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminRequest } from "@/features/dashboard/api/admin-api/http";
import {
  CSRF_HEADER_NAME,
  CSRF_HEADER_VALUE,
} from "@/shared/security/csrf";

describe("features/dashboard/api/admin-api/http", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.API_BASE_URL = "https://app.example.com";
  });

  it("adds the CSRF header to state-changing requests", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    await adminRequest<{ ok: boolean }>("/market/items", "POST", { title: "camera" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers[CSRF_HEADER_NAME]).toBe(CSRF_HEADER_VALUE);
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("does not add the CSRF header to read-only requests", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    await adminRequest<unknown[]>("/market/items", "GET");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers[CSRF_HEADER_NAME]).toBeUndefined();
  });
});
