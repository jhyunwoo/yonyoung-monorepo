import { describe, expect, it, vi } from "vitest";
import {
  IDs,
  createActor,
  createDataServiceMock,
  createTestApp,
  expectErrorCode,
  fn,
  readJson,
} from "./test-helpers";

describe("dashboard routes", () => {
  it("GET /api/admin/dashboard는 generationSortOrder 기반 집계를 반환한다", async () => {
    const list = vi.fn().mockResolvedValue({
      objects: [{ size: 3 * 1024 * 1024 * 1024 }],
      truncated: false,
      cursor: undefined,
    });
    const getAdminDashboardStats = fn(async () => ({
      usersTotal: 21,
      unverifiedUsersTotal: 3,
      generationsTotal: 5,
      selectedGenerationMembersTotal: 9,
      selectedGenerationActivitiesTotal: 12,
      selectedGenerationExhibitionsTotal: 2,
      linktreeLinksTotal: 33,
    }));

    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ getAdminDashboardStats }),
    });

    const response = await app.request(
      "/api/admin/dashboard?generationSortOrder=11",
      undefined,
      {
        r2: {
          list,
        },
      },
    );
    expect(response.status).toBe(200);
    const body = await readJson<{
      data: {
        usersTotal: number;
        selectedGenerationMembersTotal: number;
        r2StorageUsedBytes: number;
        r2StorageLimitBytes: number;
        r2StorageUsageAvailable: boolean;
      };
    }>(response);
    expect(body.data.usersTotal).toBe(21);
    expect(body.data.selectedGenerationMembersTotal).toBe(9);
    expect(body.data.r2StorageUsedBytes).toBe(3 * 1024 * 1024 * 1024);
    expect(body.data.r2StorageLimitBytes).toBe(10 * 1024 * 1024 * 1024);
    expect(body.data.r2StorageUsageAvailable).toBe(true);
    expect(getAdminDashboardStats).toHaveBeenCalledWith(11);
  });

  it("GET /api/admin/dashboard는 R2 조회 실패 시에도 200과 조회불가 상태를 반환한다", async () => {
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({
        getAdminDashboardStats: fn(async () => ({
          usersTotal: 21,
          unverifiedUsersTotal: 3,
          generationsTotal: 5,
          selectedGenerationMembersTotal: 9,
          selectedGenerationActivitiesTotal: 12,
          selectedGenerationExhibitionsTotal: 2,
          linktreeLinksTotal: 33,
        })),
      }),
    });

    const response = await app.request("/api/admin/dashboard", undefined, {
      r2: {
        list: vi.fn(async () => {
          throw new Error("R2 unavailable");
        }),
      },
    });
    expect(response.status).toBe(200);
    const body = await readJson<{
      data: {
        r2StorageUsedBytes: number;
        r2StorageLimitBytes: number;
        r2StorageUsageAvailable: boolean;
      };
    }>(response);
    expect(body.data.r2StorageUsedBytes).toBe(0);
    expect(body.data.r2StorageLimitBytes).toBe(10 * 1024 * 1024 * 1024);
    expect(body.data.r2StorageUsageAvailable).toBe(false);
  });

  it("GET /api/admin/dashboard는 잘못된 쿼리에 400을 반환한다", async () => {
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({
        getAdminDashboardStats: fn(async () => ({
          usersTotal: 0,
          unverifiedUsersTotal: 0,
          generationsTotal: 0,
          selectedGenerationMembersTotal: 0,
          selectedGenerationActivitiesTotal: 0,
          selectedGenerationExhibitionsTotal: 0,
          linktreeLinksTotal: 0,
        })),
      }),
    });

    const response = await app.request("/api/admin/dashboard?generationSortOrder=not-number");
    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("GET /api/admin/dashboard는 인증되지 않은 요청에 401을 반환한다", async () => {
    const app = createTestApp({ actor: null });
    const response = await app.request("/api/admin/dashboard");
    expect(response.status).toBe(401);
    await expectErrorCode(response, "UNAUTHORIZED");
  });

  it("GET /api/admin/dashboard는 권한 없는 역할에 403을 반환한다", async () => {
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({
        getAdminDashboardStats: fn(async () => ({
          usersTotal: 0,
          unverifiedUsersTotal: 0,
          generationsTotal: 0,
          selectedGenerationMembersTotal: 0,
          selectedGenerationActivitiesTotal: 0,
          selectedGenerationExhibitionsTotal: 0,
          linktreeLinksTotal: 0,
        })),
      }),
    });

    const response = await app.request("/api/admin/dashboard");
    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
  });
});
