import { describe, expect, it } from "vitest";
import {
  IDs,
  createActor,
  createDataServiceMock,
  createTestApp,
  expectErrorCode,
  fn,
  readJson,
} from "./test-helpers";

describe("audit routes", () => {
  it("manager는 activity 감사 로그를 조회할 수 있다", async () => {
    const listAuditLogs = fn(async () => [
      {
        id: "a0000000-0000-4000-8000-000000000001",
        resourceType: "activity" as const,
        resourceId: IDs.activity,
        action: "update" as const,
        actor: {
          id: IDs.manager,
          name: "manager-name",
          familyName: null,
          givenName: null,
          role: "manager",
        },
        changedFields: ["title"],
        createdAt: new Date("2030-01-01T00:00:00.000Z"),
      },
    ]);

    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ listAuditLogs }),
    });

    const response = await app.request(
      `/api/audit/activity/${IDs.activity}?limit=5`,
    );

    expect(response.status).toBe(200);
    const body = await readJson<{
      data: Array<{
        id: string;
        actor: { familyName: string | null; givenName: string | null } | null;
      }>;
    }>(response);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.id).toBe("a0000000-0000-4000-8000-000000000001");
    expect(body.data[0]?.actor?.familyName).toBeNull();
    expect(body.data[0]?.actor?.givenName).toBeNull();
    expect(listAuditLogs).toHaveBeenCalledWith("activity", IDs.activity, 5);
  });

  it("manager는 generation_notice 감사 로그를 조회할 수 있다", async () => {
    const listAuditLogs = fn(async () => []);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ listAuditLogs }),
    });

    const response = await app.request(
      `/api/audit/generation_notice/${IDs.generationNotice}`,
    );

    expect(response.status).toBe(200);
    expect(listAuditLogs).toHaveBeenCalledWith(
      "generation_notice",
      IDs.generationNotice,
      20,
    );
  });

  it("resourceType별 권한 리소스를 매핑해 감사 로그를 조회한다", async () => {
    const listAuditLogs = fn(async () => []);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ listAuditLogs }),
    });

    const samples = [
      { resourceType: "generation", resourceId: IDs.generation },
      { resourceType: "exhibition", resourceId: IDs.exhibition },
      { resourceType: "linktree", resourceId: IDs.linktree },
      { resourceType: "linktree_item", resourceId: IDs.linktreeItem },
      { resourceType: "global_notice", resourceId: IDs.globalNotice },
      { resourceType: "market_item", resourceId: "88000000-0000-4000-8000-000000000001" },
      { resourceType: "market_comment", resourceId: "99000000-0000-4000-8000-000000000001" },
    ] as const;

    for (const sample of samples) {
      const response = await app.request(
        `/api/audit/${sample.resourceType}/${sample.resourceId}?limit=7`,
      );
      expect(response.status).toBe(200);
      expect(listAuditLogs).toHaveBeenCalledWith(
        sample.resourceType,
        sample.resourceId,
        7,
      );
    }
  });

  it("잘못된 limit 파라미터는 400을 반환한다", async () => {
    const listAuditLogs = fn(async () => []);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ listAuditLogs }),
    });

    const response = await app.request(
      `/api/audit/activity/${IDs.activity}?limit=0`,
    );

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(listAuditLogs).not.toHaveBeenCalled();
  });

  it("limit 타입이 잘못되면 400을 반환한다", async () => {
    const listAuditLogs = fn(async () => []);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ listAuditLogs }),
    });

    const response = await app.request(
      `/api/audit/activity/${IDs.activity}?limit=not-a-number`,
    );

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(listAuditLogs).not.toHaveBeenCalled();
  });

  it("resourceId가 UUID 형식이 아니면 400을 반환한다", async () => {
    const listAuditLogs = fn(async () => []);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ listAuditLogs }),
    });

    const response = await app.request("/api/audit/activity/not-a-uuid");

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(listAuditLogs).not.toHaveBeenCalled();
  });

  it("user 감사 로그는 UUID가 아닌 resourceId도 허용한다", async () => {
    const listAuditLogs = fn(async () => []);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ listAuditLogs }),
    });

    const response = await app.request("/api/audit/user/non-uuid-user-id");

    expect(response.status).toBe(200);
    expect(listAuditLogs).toHaveBeenCalledWith("user", "non-uuid-user-id", 20);
  });

  it("unverified 사용자는 감사 로그 조회 권한이 없다", async () => {
    const listAuditLogs = fn(async () => []);
    const app = createTestApp({
      actor: createActor("unverified", IDs.member),
      dataService: createDataServiceMock({ listAuditLogs }),
    });

    const response = await app.request(`/api/audit/activity/${IDs.activity}`);

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(listAuditLogs).not.toHaveBeenCalled();
  });

  it("인증되지 않은 사용자는 401을 반환한다", async () => {
    const listAuditLogs = fn(async () => []);
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ listAuditLogs }),
    });

    const response = await app.request(`/api/audit/activity/${IDs.activity}`);

    expect(response.status).toBe(401);
    await expectErrorCode(response, "UNAUTHORIZED");
    expect(listAuditLogs).not.toHaveBeenCalled();
  });
});
