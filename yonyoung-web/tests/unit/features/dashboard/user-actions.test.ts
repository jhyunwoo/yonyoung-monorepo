import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiUser } from "@/shared/contracts/api-contracts";

const headersMock = vi.hoisted(() => vi.fn());
const updateTagMock = vi.hoisted(() => vi.fn());
const requireSessionMock = vi.hoisted(() => vi.fn());
const assertAdminWriteAccessMock = vi.hoisted(() => vi.fn());
const readCookieHeaderMock = vi.hoisted(() => vi.fn());
const honoRequestMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("next/cache", () => ({
  updateTag: updateTagMock,
}));

vi.mock("next/navigation", () => ({
  forbidden: vi.fn(() => {
    throw new Error("NEXT_FORBIDDEN");
  }),
}));

vi.mock("@/features/auth/server/auth-guard", () => ({
  serverAuthGuard: {
    requireSession: requireSessionMock,
  },
}));

vi.mock("@/features/dashboard/actions/admin-write-access", () => ({
  assertAdminWriteAccess: assertAdminWriteAccessMock,
}));

vi.mock("@/shared/http/http", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/http/http")>();

  return {
    ...actual,
    readCookieHeader: readCookieHeaderMock,
  };
});

vi.mock("@/server/http/hono-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/http/hono-client")>();

  return {
    ...actual,
    honoRequest: honoRequestMock,
  };
});

import {
  bulkUpdateUsersRoleAction,
  updateSiteSettingsAction,
} from "@/features/dashboard/actions/admin-write-actions";
import { HonoApiError } from "@/server/http/hono-client";

const createUser = (input: Partial<ApiUser> & Pick<ApiUser, "id" | "name" | "email">) =>
  ({
    id: input.id,
    name: input.name,
    email: input.email,
    image: input.image ?? null,
    showcaseImageUrls: input.showcaseImageUrls ?? [],
    familyName: input.familyName ?? null,
    givenName: input.givenName ?? null,
    college: input.college ?? null,
    department: input.department ?? null,
    studentNumber: input.studentNumber ?? null,
    phoneNumber: input.phoneNumber ?? null,
    collaborationAvailable: input.collaborationAvailable ?? false,
    personalLink: input.personalLink ?? null,
    role: input.role ?? "regular_member",
    generationId: input.generationId ?? null,
    generationIds: input.generationIds ?? [],
    createdAt: input.createdAt ?? 1,
    updatedAt: input.updatedAt ?? 1,
    updatedBy: input.updatedBy ?? null,
  }) satisfies ApiUser;

describe("features/dashboard/actions/admin-write-actions bulkUpdateUsersRoleAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    requireSessionMock.mockResolvedValue({
      session: {
        id: "session-1",
        userId: "user-1",
        expiresAt: Date.now() + 60_000,
      },
      user: {
        id: "user-1",
        email: "admin@example.com",
        name: "관리자",
        role: "vice_president",
      },
    });
    assertAdminWriteAccessMock.mockReturnValue(undefined);
    readCookieHeaderMock.mockResolvedValue("better-auth.session_token=session-token");
    headersMock.mockResolvedValue({
      get: (name: string) => {
        if (name === "x-request-id") {
          return "req-1";
        }

        if (name === "x-trace-id") {
          return "trace-1";
        }

        return null;
      },
    });
  });

  it("returns updated users on success", async () => {
    const updatedUsers = [
      createUser({
        id: "user-2",
        name: "홍길동",
        email: "user-2@example.com",
        role: "manager",
      }),
    ];
    honoRequestMock.mockResolvedValue(updatedUsers);

    const result = await bulkUpdateUsersRoleAction({
      userIds: ["user-2"],
      role: "manager",
    });

    expect(result).toEqual({
      ok: true,
      data: updatedUsers,
    });
    expect(honoRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/users/bulk-role",
        method: "PATCH",
        body: {
          userIds: ["user-2"],
          role: "manager",
        },
        requestId: "req-1",
        traceId: "trace-1",
        cookieHeader: "better-auth.session_token=session-token",
      }),
    );
    expect(updateTagMock).toHaveBeenCalledTimes(3);
  });

  it("returns a serializable failure result for api permission errors", async () => {
    honoRequestMock.mockRejectedValue(
      new HonoApiError({
        status: 403,
        code: "FORBIDDEN",
        message: "본인보다 높거나 같은 등급의 사용자는 변경할 수 없습니다.",
        requestId: "req-denied",
      }),
    );

    const result = await bulkUpdateUsersRoleAction({
      userIds: ["user-2"],
      role: "manager",
    });

    expect(result).toEqual({
      ok: false,
      errorMessage: "본인보다 높거나 같은 등급의 사용자는 변경할 수 없습니다.",
      status: 403,
      code: "FORBIDDEN",
      requestId: "req-denied",
    });
    expect(updateTagMock).not.toHaveBeenCalled();
  });

  it("returns a validation failure result for invalid site settings input", async () => {
    const result = await updateSiteSettingsAction({
      footerOpenChatUrl: "https://open.kakao.com/o/test",
      footerInstagramId: "yonyoung",
      donateAccountHolder: "연영회",
      donateBankName: "테스트은행",
      donateAccountNumber: "invalid account number!",
      footerEmail: "invalid-email",
      footerPhone: "010-1234-5678",
      footerAddress: "서울특별시 서대문구 연희로 50",
    });

    expect(result).toEqual({
      ok: false,
      errorMessage: "이메일 형식이 올바르지 않습니다.",
      status: 400,
      code: "VALIDATION_ERROR",
      requestId: null,
    });
    expect(honoRequestMock).not.toHaveBeenCalled();
    expect(updateTagMock).not.toHaveBeenCalled();
  });
});
