import { describe, expect, it } from "vitest";
import { AdminApiError } from "@/shared/http/http";
import {
  bindAdminWriteAction,
  unwrapAdminWriteActionResult,
} from "@/features/dashboard/api/admin-api/action-results";

describe("features/dashboard/api/admin-api/action-results", () => {
  it("unwraps successful admin write results", async () => {
    const action = bindAdminWriteAction(async (id: string) => ({
      ok: true as const,
      data: { id, title: "Updated" },
    }));

    await expect(action("notice-1")).resolves.toEqual({
      id: "notice-1",
      title: "Updated",
    });
    expect(
      unwrapAdminWriteActionResult({
        ok: true,
        data: ["a", "b"],
      }),
    ).toEqual(["a", "b"]);
  });

  it("rethrows serialized admin write failures as AdminApiError", async () => {
    const action = bindAdminWriteAction(async () => ({
      ok: false as const,
      errorMessage: "본인보다 높거나 같은 등급의 사용자는 변경할 수 없습니다.",
      status: 403,
      code: "FORBIDDEN",
      requestId: "req-123",
    }));

    await expect(action()).rejects.toMatchObject<Partial<AdminApiError>>({
      name: "AdminApiError",
      message: "본인보다 높거나 같은 등급의 사용자는 변경할 수 없습니다.",
      status: 403,
      code: "FORBIDDEN",
      requestId: "req-123",
    });
  });
});
