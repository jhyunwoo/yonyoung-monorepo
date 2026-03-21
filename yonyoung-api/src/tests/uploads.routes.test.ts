import { describe, expect, it } from "vitest";
import {
  IDs,
  createActor,
  createPresignServiceMock,
  createTestApp,
  expectErrorCode,
  fn,
  readJson,
} from "./test-helpers";
import { MissingStorageConfigError } from "../lib/storage/presign";
import { UPLOAD_LIMITS } from "../lib/storage/presign";
import { R2_STORAGE_LIMIT_BYTES } from "../lib/storage/usage";

describe("upload presign routes", /** describe 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
  const resourceRoutes = [
    {
      path: "/api/activities/presign/cover",
      role: "manager" as const,
      expected: { resource: "activities", slot: "cover" as const },
    },
    {
      path: "/api/activities/presign/detail",
      role: "manager" as const,
      expected: { resource: "activities", slot: "detail" as const },
    },
    {
      path: "/api/exhibitions/presign/cover",
      role: "manager" as const,
      expected: { resource: "exhibitions", slot: "cover" as const },
    },
    {
      path: "/api/exhibitions/presign/detail",
      role: "manager" as const,
      expected: { resource: "exhibitions", slot: "detail" as const },
    },
    {
      path: "/api/notices/presign/image",
      role: "manager" as const,
      expected: { resource: "notices", slot: "image" as const },
    },
    {
      path: "/api/recruiting/presign/image",
      role: "manager" as const,
      expected: { resource: "notices", slot: "image" as const },
    },
    {
      path: "/api/market/presign/image",
      role: "regular_member" as const,
      expected: { resource: "market", slot: "image" as const },
    },
  ];

  for (const route of resourceRoutes) {
    it(`${route.path}는 인증되지 않은 요청에 401을 반환한다`, /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
      const app = createTestApp({ actor: null });
      const response = await app.request(route.path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: "cover.png",
          contentType: "image/png",
          fileSize: 1024,
        }),
      });

      expect(response.status).toBe(401);
      await expectErrorCode(response, "UNAUTHORIZED");
    });

    it(`${route.path}는 권한 없는 사용자에게 403을 반환한다`, /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
      const forbiddenRole =
        route.path.startsWith("/api/activities/") ||
        route.path.startsWith("/api/market/")
          ? ("unverified" as const)
          : ("regular_member" as const);
      const issuePresignedPutUrl = fn(
        /** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => ({
          uploadUrl: "https://upload.example.com/signed",
          objectKey: "object-key",
          publicUrl: "https://cdn.example.com/object-key",
          requiredHeaders: { "Content-Type": "image/png" },
        }),
      );
      const app = createTestApp({
        actor: createActor(forbiddenRole),
        presignService: createPresignServiceMock({ issuePresignedPutUrl }),
      });

      const response = await app.request(route.path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: "cover.png",
          contentType: "image/png",
          fileSize: 1024,
        }),
      });

      expect(response.status).toBe(403);
      await expectErrorCode(response, "FORBIDDEN");
      expect(issuePresignedPutUrl).not.toHaveBeenCalled();
    });

    it(`${route.path}는 본문 검증 실패 시 400을 반환한다`, /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
      const app = createTestApp({
        actor: createActor(route.role, IDs.manager),
      });

      const response = await app.request(route.path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileName: "" }),
      });

      expect(response.status).toBe(400);
      await expectErrorCode(response, "BAD_REQUEST");
    });

    it(`${route.path}는 JSON 본문이 깨졌으면 400을 반환한다`, async () => {
      const app = createTestApp({
        actor: createActor(route.role, IDs.manager),
      });
      const response = await app.request(route.path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      });

      expect(response.status).toBe(400);
      expect(await response.text()).toContain("Malformed");
    });

    it(`${route.path}는 presign 생성 성공 시 201과 URL을 반환한다`, /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
      const issuePresignedPutUrl = fn(
        /** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => ({
          uploadUrl: "https://upload.example.com/signed",
          objectKey: "object-key",
          publicUrl: "https://cdn.example.com/object-key",
          requiredHeaders: { "Content-Type": "image/png" },
        }),
      );
      const app = createTestApp({
        actor: createActor(route.role, IDs.manager),
        presignService: createPresignServiceMock({ issuePresignedPutUrl }),
      });

      const response = await app.request(route.path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: "cover.png",
          contentType: "image/png",
          fileSize: 1024,
        }),
      });

      expect(response.status).toBe(201);
      const body = await readJson<{
        data: { uploadUrl: string; publicUrl: string };
      }>(response);
      expect(body.data.uploadUrl).toContain("upload.example.com");
      expect(body.data.publicUrl).toContain("cdn.example.com");
      expect(issuePresignedPutUrl).toHaveBeenCalledWith({
        actorId: IDs.manager,
        resource: route.expected.resource,
        slot: route.expected.slot,
        fileName: "cover.png",
        contentType: "image/png",
        fileSize: 1024,
      });
    });

    it(`${route.path}는 버킷 10GB 한도 초과가 예상되면 413으로 업로드를 차단한다`, async () => {
      const issuePresignedPutUrl = fn(async () => ({
        uploadUrl: "https://upload.example.com/signed",
        objectKey: "object-key",
        publicUrl: "https://cdn.example.com/object-key",
        requiredHeaders: { "Content-Type": "image/png" },
      }));
      const app = createTestApp({
        actor: createActor(route.role, IDs.manager),
        presignService: createPresignServiceMock({ issuePresignedPutUrl }),
        readR2TotalUsageBytes: () => R2_STORAGE_LIMIT_BYTES - 512,
      });

      const response = await app.request(route.path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: "cover.png",
          contentType: "image/png",
          fileSize: 1024,
        }),
      });

      expect(response.status).toBe(413);
      await expectErrorCode(response, "BAD_REQUEST");
      expect(issuePresignedPutUrl).not.toHaveBeenCalled();
    });

    it(`${route.path}는 버킷 사용량 확인 실패 시 500으로 업로드를 차단한다`, async () => {
      const issuePresignedPutUrl = fn(async () => ({
        uploadUrl: "https://upload.example.com/signed",
        objectKey: "object-key",
        publicUrl: "https://cdn.example.com/object-key",
        requiredHeaders: { "Content-Type": "image/png" },
      }));
      const app = createTestApp({
        actor: createActor(route.role, IDs.manager),
        presignService: createPresignServiceMock({ issuePresignedPutUrl }),
        readR2TotalUsageBytes: async () => {
          throw new Error("r2 usage unavailable");
        },
      });

      const response = await app.request(route.path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: "cover.png",
          contentType: "image/png",
          fileSize: 1024,
        }),
      });

      expect(response.status).toBe(500);
      await expectErrorCode(response, "INTERNAL_ERROR");
      expect(issuePresignedPutUrl).not.toHaveBeenCalled();
    });

    it(`${route.path}는 presign 서비스 예외 시 500을 반환한다`, /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
      const issuePresignedPutUrl = fn(
        /** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
          throw new Error("r2 unavailable");
        },
      );
      const app = createTestApp({
        actor: createActor(route.role, IDs.manager),
        presignService: createPresignServiceMock({ issuePresignedPutUrl }),
      });

      const response = await app.request(route.path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: "cover.png",
          contentType: "image/png",
          fileSize: 1024,
        }),
      });

      expect(response.status).toBe(500);
      await expectErrorCode(response, "INTERNAL_ERROR");
    });
  }

  it("세션 조회 중 예외가 발생해도 500 대신 401을 반환한다", async () => {
    const app = createTestApp({
      actor: null,
      resolveActor: async () => {
        throw new Error("Network connection lost.");
      },
    });

    const response = await app.request("/api/activities/presign/cover", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: "cover.png",
        contentType: "image/png",
        fileSize: 1024,
      }),
    });

    expect(response.status).toBe(401);
    await expectErrorCode(response, "UNAUTHORIZED");
  });

  for (const path of [
    "/api/activities/presign/cover",
    "/api/activities/presign/detail",
    "/api/market/presign/image",
  ]) {
    it(`${path}는 regular_member 권한을 리소스 정책에 따라 적용한다`, async () => {
      const issuePresignedPutUrl = fn(async () => ({
        uploadUrl: "https://upload.example.com/signed",
        objectKey: "activities/object-key",
        publicUrl: "https://cdn.example.com/activities/object-key",
        requiredHeaders: { "Content-Type": "image/png" },
      }));
      const app = createTestApp({
        actor: createActor("regular_member", IDs.member),
        presignService: createPresignServiceMock({ issuePresignedPutUrl }),
      });

      const response = await app.request(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: "cover.png",
          contentType: "image/png",
          fileSize: 1024,
        }),
      });

      if (path.startsWith("/api/activities/")) {
        expect(response.status).toBe(403);
        await expectErrorCode(response, "FORBIDDEN");
        expect(issuePresignedPutUrl).not.toHaveBeenCalled();
        return;
      }

      expect(response.status).toBe(201);
      expect(issuePresignedPutUrl).toHaveBeenCalled();
    });
  }

  it("R2 설정 누락 에러는 내부 오류로 처리하되 상세 안내 메시지를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const issuePresignedPutUrl = fn(
      /** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
        throw new MissingStorageConfigError([
          "R2_S3_ENDPOINT",
          "R2_ACCESS_KEY_ID",
        ]);
      },
    );
    const consoleSpy = fn();
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      presignService: createPresignServiceMock({ issuePresignedPutUrl }),
    });

    const originalConsoleError = console.error;
    console.error = consoleSpy;
    try {
      const response = await app.request("/api/activities/presign/cover", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: "cover.png",
          contentType: "image/png",
          fileSize: 1024,
        }),
      });

      expect(response.status).toBe(500);
      const body = await readJson<{ error: { message: string } }>(response);
      expect(body.error.message).toContain("R2_*");
      expect(body.error.message).toContain("공개 URL 서명");
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      console.error = originalConsoleError;
    }
  });

  it("/api/users/presign/profile는 manager에게 403을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const issuePresignedPutUrl = fn(
      /** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => ({
        uploadUrl: "https://upload.example.com/signed",
        objectKey: "users/profile-key",
        publicUrl: "https://cdn.example.com/users/profile-key",
        requiredHeaders: { "Content-Type": "image/png" },
      }),
    );
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      presignService: createPresignServiceMock({ issuePresignedPutUrl }),
    });

    const response = await app.request("/api/users/presign/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: "profile.png",
        contentType: "image/png",
        fileSize: 1024,
      }),
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(issuePresignedPutUrl).not.toHaveBeenCalled();
  });

  it("/api/users/presign/profile는 인증되지 않은 요청에 401을 반환한다", async () => {
    const app = createTestApp({ actor: null });
    const response = await app.request("/api/users/presign/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: "profile.png",
        contentType: "image/png",
        fileSize: 1024,
      }),
    });

    expect(response.status).toBe(401);
    await expectErrorCode(response, "UNAUTHORIZED");
  });

  it("/api/users/presign/profile는 member 계열 사용자에게 허용된다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const issuePresignedPutUrl = fn(
      /** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => ({
        uploadUrl: "https://upload.example.com/signed",
        objectKey: "users/profile-key",
        publicUrl: "https://cdn.example.com/users/profile-key",
        requiredHeaders: { "Content-Type": "image/png" },
      }),
    );
    const app = createTestApp({
      actor: createActor("associate_member", IDs.member),
      presignService: createPresignServiceMock({ issuePresignedPutUrl }),
    });

    const response = await app.request("/api/users/presign/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: "profile.png",
        contentType: "image/png",
        fileSize: 1024,
      }),
    });

    expect(response.status).toBe(201);
    expect(issuePresignedPutUrl).toHaveBeenCalledWith({
      actorId: IDs.member,
      resource: "users",
      slot: "profile",
      fileName: "profile.png",
      contentType: "image/png",
      fileSize: 1024,
    });
  });

  it("/api/users/presign/profile는 user update 권한이 있는 관리자에게 허용된다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const issuePresignedPutUrl = fn(
      /** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => ({
        uploadUrl: "https://upload.example.com/signed",
        objectKey: "users/profile-key",
        publicUrl: "https://cdn.example.com/users/profile-key",
        requiredHeaders: { "Content-Type": "image/png" },
      }),
    );
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      presignService: createPresignServiceMock({ issuePresignedPutUrl }),
    });

    const response = await app.request("/api/users/presign/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: "profile.png",
        contentType: "image/png",
        fileSize: 1024,
      }),
    });

    expect(response.status).toBe(201);
    expect(issuePresignedPutUrl).toHaveBeenCalledWith({
      actorId: IDs.vicePresident,
      resource: "users",
      slot: "profile",
      fileName: "profile.png",
      contentType: "image/png",
      fileSize: 1024,
    });
  });

  it("/api/users/presign/profile 본문이 유효하지 않으면 400을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({
      actor: createActor("associate_member", IDs.member),
    });

    const response = await app.request("/api/users/presign/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileName: "" }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("/api/users/presign/profile는 JSON 본문이 깨졌으면 400을 반환한다", async () => {
    const app = createTestApp({
      actor: createActor("associate_member", IDs.member),
    });
    const response = await app.request("/api/users/presign/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });

    expect(response.status).toBe(400);
    expect(await response.text()).toContain("Malformed");
  });

  it("/api/users/presign/profile는 presign 서비스 예외 시 500을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const issuePresignedPutUrl = fn(
      /** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
        throw new Error("r2 unavailable");
      },
    );
    const app = createTestApp({
      actor: createActor("associate_member", IDs.member),
      presignService: createPresignServiceMock({ issuePresignedPutUrl }),
    });

    const response = await app.request("/api/users/presign/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: "profile.png",
        contentType: "image/png",
        fileSize: 1024,
      }),
    });

    expect(response.status).toBe(500);
    await expectErrorCode(response, "INTERNAL_ERROR");
  });

  it("/api/users/presign/profile는 버킷 10GB 한도 초과가 예상되면 413으로 업로드를 차단한다", async () => {
    const issuePresignedPutUrl = fn(async () => ({
      uploadUrl: "https://upload.example.com/signed",
      objectKey: "users/profile-key",
      publicUrl: "https://cdn.example.com/users/profile-key",
      requiredHeaders: { "Content-Type": "image/png" },
    }));
    const app = createTestApp({
      actor: createActor("associate_member", IDs.member),
      presignService: createPresignServiceMock({ issuePresignedPutUrl }),
      readR2TotalUsageBytes: () => R2_STORAGE_LIMIT_BYTES - 256,
    });

    const response = await app.request("/api/users/presign/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: "profile.png",
        contentType: "image/png",
        fileSize: 1024,
      }),
    });

    expect(response.status).toBe(413);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(issuePresignedPutUrl).not.toHaveBeenCalled();
  });

  it("/api/users/presign/profile는 스토리지 설정 누락 시 안내 메시지와 함께 500을 반환한다", async () => {
    const issuePresignedPutUrl = fn(async () => {
      throw new MissingStorageConfigError(["R2_BUCKET_NAME"]);
    });
    const app = createTestApp({
      actor: createActor("associate_member", IDs.member),
      presignService: createPresignServiceMock({ issuePresignedPutUrl }),
    });

    const response = await app.request("/api/users/presign/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: "profile.png",
        contentType: "image/png",
        fileSize: 1024,
      }),
    });

    expect(response.status).toBe(500);
    const body = await readJson<{ error: { message: string } }>(response);
    expect(body.error.message).toContain("R2_*");
  });

  it("단일 업로드는 허용 크기 초과 시 413을 반환한다", async () => {
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
    });

    const response = await app.request("/api/activities/presign/cover", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: "cover.png",
        contentType: "image/png",
        fileSize: 1024 * 1024 * 1024 + 1,
      }),
    });

    expect(response.status).toBe(413);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("단일 업로드는 허용되지 않은 content-type 요청을 거부한다", async () => {
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
    });

    const response = await app.request("/api/activities/presign/cover", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: "cover.svg",
        contentType: "image/svg+xml",
        fileSize: 1024,
      }),
    });

    expect(response.status).toBe(415);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("/api/notices/presign/image는 허용되지 않은 content-type 요청을 거부한다", async () => {
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
    });

    const response = await app.request("/api/notices/presign/image", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: "notice.svg",
        contentType: "image/svg+xml",
        fileSize: 1024,
      }),
    });

    expect(response.status).toBe(415);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("/api/notices/presign/image는 허용 크기 초과 시 413을 반환한다", async () => {
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
    });

    const response = await app.request("/api/notices/presign/image", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: "notice.png",
        contentType: "image/png",
        fileSize: 1024 * 1024 * 1024 + 1,
      }),
    });

    expect(response.status).toBe(413);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("멀티파트 업로드 init/part/complete/abort 경로가 정상 동작한다", async () => {
    const initiateMultipartUpload = fn(async () => ({
      uploadId: "upload-id-1",
      objectKey: `activities/${IDs.manager}/detail/multipart-key`,
      publicUrl: "https://cdn.example.com/multipart-key",
      partSize: 8 * 1024 * 1024,
      maxPartNumber: 2,
    }));
    const issueMultipartUploadPartUrl = fn(async () => ({
      uploadUrl: "https://upload.example.com/multipart/part-1",
      requiredHeaders: {},
    }));
    const completeMultipartUpload = fn(async () => ({
      objectKey: `activities/${IDs.manager}/detail/multipart-key`,
      publicUrl: "https://cdn.example.com/multipart-key",
    }));
    const abortMultipartUpload = fn(async () => undefined);

    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      presignService: createPresignServiceMock({
        initiateMultipartUpload,
        issueMultipartUploadPartUrl,
        completeMultipartUpload,
        abortMultipartUpload,
      }),
    });

    const initResponse = await app.request(
      "/api/activities/multipart/detail/init",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: "large.png",
          contentType: "image/png",
          fileSize: 20 * 1024 * 1024,
        }),
      },
    );
    expect(initResponse.status).toBe(201);
    expect(initiateMultipartUpload).toHaveBeenCalled();

    const partResponse = await app.request("/api/uploads/multipart/part", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        uploadId: "upload-id-1",
        objectKey: `activities/${IDs.manager}/detail/multipart-key`,
        partNumber: 1,
      }),
    });
    expect(partResponse.status).toBe(200);
    expect(issueMultipartUploadPartUrl).toHaveBeenCalled();

    const completeResponse = await app.request(
      "/api/uploads/multipart/complete",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          uploadId: "upload-id-1",
          objectKey: `activities/${IDs.manager}/detail/multipart-key`,
          parts: [{ partNumber: 1, etag: '"etag-1"' }],
        }),
      },
    );
    expect(completeResponse.status).toBe(200);
    expect(completeMultipartUpload).toHaveBeenCalled();

    const abortResponse = await app.request("/api/uploads/multipart/abort", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        uploadId: "upload-id-1",
        objectKey: `activities/${IDs.manager}/detail/multipart-key`,
      }),
    });
    expect(abortResponse.status).toBe(204);
    expect(abortMultipartUpload).toHaveBeenCalled();
  });

  it("멀티파트 part 요청은 본인 소유 objectKey가 아니면 403을 반환한다", async () => {
    const issueMultipartUploadPartUrl = fn(async () => ({
      uploadUrl: "https://upload.example.com/multipart/part-1",
      requiredHeaders: {},
    }));
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      presignService: createPresignServiceMock({
        issueMultipartUploadPartUrl,
      }),
    });

    const response = await app.request("/api/uploads/multipart/part", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        uploadId: "upload-id-1",
        objectKey: `activities/${IDs.otherUser}/detail/multipart-key`,
        partNumber: 1,
      }),
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(issueMultipartUploadPartUrl).not.toHaveBeenCalled();
  });

  it("멀티파트 part 요청에서 objectKey 형식이 잘못되면 400을 반환한다", async () => {
    const issueMultipartUploadPartUrl = fn(async () => ({
      uploadUrl: "https://upload.example.com/multipart/part-1",
      requiredHeaders: {},
    }));
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      presignService: createPresignServiceMock({ issueMultipartUploadPartUrl }),
    });

    const response = await app.request("/api/uploads/multipart/part", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        uploadId: "upload-id-1",
        objectKey: "invalid-object-key",
        partNumber: 1,
      }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(issueMultipartUploadPartUrl).not.toHaveBeenCalled();
  });

  it("멀티파트 part 요청은 user profile objectKey에서 manager 권한을 거부한다", async () => {
    const issueMultipartUploadPartUrl = fn(async () => ({
      uploadUrl: "https://upload.example.com/multipart/part-1",
      requiredHeaders: {},
    }));
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      presignService: createPresignServiceMock({ issueMultipartUploadPartUrl }),
    });

    const response = await app.request("/api/uploads/multipart/part", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        uploadId: "upload-id-1",
        objectKey: `users/${IDs.manager}/profile/multipart-key`,
        partNumber: 1,
      }),
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(issueMultipartUploadPartUrl).not.toHaveBeenCalled();
  });

  it("멀티파트 part 요청은 user profile objectKey에서 member 계열 사용자를 허용한다", async () => {
    const issueMultipartUploadPartUrl = fn(async () => ({
      uploadUrl: "https://upload.example.com/multipart/part-1",
      requiredHeaders: {},
    }));
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      presignService: createPresignServiceMock({ issueMultipartUploadPartUrl }),
    });

    const response = await app.request("/api/uploads/multipart/part", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        uploadId: "upload-id-1",
        objectKey: `users/${IDs.member}/profile/multipart-key`,
        partNumber: 1,
      }),
    });

    expect(response.status).toBe(200);
    expect(issueMultipartUploadPartUrl).toHaveBeenCalledWith({
      uploadId: "upload-id-1",
      objectKey: `users/${IDs.member}/profile/multipart-key`,
      partNumber: 1,
    });
  });

  it("멀티파트 part 서비스 예외 시 500을 반환한다", async () => {
    const issueMultipartUploadPartUrl = fn(async () => {
      throw new Error("part failed");
    });
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      presignService: createPresignServiceMock({ issueMultipartUploadPartUrl }),
    });

    const response = await app.request("/api/uploads/multipart/part", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        uploadId: "upload-id-1",
        objectKey: `activities/${IDs.manager}/detail/multipart-key`,
        partNumber: 1,
      }),
    });

    expect(response.status).toBe(500);
    await expectErrorCode(response, "INTERNAL_ERROR");
  });

  it("멀티파트 complete 요청에서 중복 partNumber가 있으면 422를 반환한다", async () => {
    const completeMultipartUpload = fn(async () => ({
      objectKey: `activities/${IDs.manager}/detail/multipart-key`,
      publicUrl: "https://cdn.example.com/multipart-key",
    }));
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      presignService: createPresignServiceMock({ completeMultipartUpload }),
    });

    const response = await app.request("/api/uploads/multipart/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        uploadId: "upload-id-1",
        objectKey: `activities/${IDs.manager}/detail/multipart-key`,
        parts: [
          { partNumber: 1, etag: '"etag-1"' },
          { partNumber: 1, etag: '"etag-1-dup"' },
        ],
      }),
    });

    expect(response.status).toBe(422);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(completeMultipartUpload).not.toHaveBeenCalled();
  });

  it("멀티파트 complete 본문이 유효하지 않으면 400을 반환한다", async () => {
    const completeMultipartUpload = fn(async () => ({
      objectKey: `activities/${IDs.manager}/detail/multipart-key`,
      publicUrl: "https://cdn.example.com/multipart-key",
    }));
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      presignService: createPresignServiceMock({ completeMultipartUpload }),
    });

    const response = await app.request("/api/uploads/multipart/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(completeMultipartUpload).not.toHaveBeenCalled();
  });

  it("멀티파트 complete 서비스 예외 시 500을 반환한다", async () => {
    const completeMultipartUpload = fn(async () => {
      throw new Error("complete failed");
    });
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      presignService: createPresignServiceMock({ completeMultipartUpload }),
    });

    const response = await app.request("/api/uploads/multipart/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        uploadId: "upload-id-1",
        objectKey: `activities/${IDs.manager}/detail/multipart-key`,
        parts: [{ partNumber: 1, etag: '"etag-1"' }],
      }),
    });

    expect(response.status).toBe(500);
    await expectErrorCode(response, "INTERNAL_ERROR");
  });

  it("멀티파트 abort 본문이 유효하지 않으면 400을 반환한다", async () => {
    const abortMultipartUpload = fn(async () => undefined);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      presignService: createPresignServiceMock({ abortMultipartUpload }),
    });

    const response = await app.request("/api/uploads/multipart/abort", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(abortMultipartUpload).not.toHaveBeenCalled();
  });

  it("멀티파트 abort 본인 소유가 아니면 403을 반환한다", async () => {
    const abortMultipartUpload = fn(async () => undefined);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      presignService: createPresignServiceMock({ abortMultipartUpload }),
    });

    const response = await app.request("/api/uploads/multipart/abort", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        uploadId: "upload-id-1",
        objectKey: `activities/${IDs.otherUser}/detail/multipart-key`,
      }),
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(abortMultipartUpload).not.toHaveBeenCalled();
  });

  it("멀티파트 abort 요청에서 objectKey 형식이 잘못되면 400을 반환한다", async () => {
    const abortMultipartUpload = fn(async () => undefined);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      presignService: createPresignServiceMock({ abortMultipartUpload }),
    });

    const response = await app.request("/api/uploads/multipart/abort", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        uploadId: "upload-id-1",
        objectKey: "invalid-object-key",
      }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(abortMultipartUpload).not.toHaveBeenCalled();
  });

  it("멀티파트 abort 서비스 예외 시 500을 반환한다", async () => {
    const abortMultipartUpload = fn(async () => {
      throw new Error("abort failed");
    });
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      presignService: createPresignServiceMock({ abortMultipartUpload }),
    });

    const response = await app.request("/api/uploads/multipart/abort", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        uploadId: "upload-id-1",
        objectKey: `activities/${IDs.manager}/detail/multipart-key`,
      }),
    });

    expect(response.status).toBe(500);
    await expectErrorCode(response, "INTERNAL_ERROR");
  });

  it("multipart part/complete/abort는 인증되지 않은 요청에 401을 반환한다", async () => {
    const app = createTestApp({ actor: null });

    const partResponse = await app.request("/api/uploads/multipart/part", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        uploadId: "upload-id-1",
        objectKey: `activities/${IDs.manager}/detail/multipart-key`,
        partNumber: 1,
      }),
    });
    expect(partResponse.status).toBe(401);
    await expectErrorCode(partResponse, "UNAUTHORIZED");

    const completeResponse = await app.request("/api/uploads/multipart/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        uploadId: "upload-id-1",
        objectKey: `activities/${IDs.manager}/detail/multipart-key`,
        parts: [{ partNumber: 1, etag: '"etag-1"' }],
      }),
    });
    expect(completeResponse.status).toBe(401);
    await expectErrorCode(completeResponse, "UNAUTHORIZED");

    const abortResponse = await app.request("/api/uploads/multipart/abort", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        uploadId: "upload-id-1",
        objectKey: `activities/${IDs.manager}/detail/multipart-key`,
      }),
    });
    expect(abortResponse.status).toBe(401);
    await expectErrorCode(abortResponse, "UNAUTHORIZED");
  });

  it("리소스 멀티파트 init 경로는 인증/권한/스토리지 설정 누락 분기를 처리한다", async () => {
    const unauthorizedApp = createTestApp({ actor: null });
    const unauthorizedResponse = await unauthorizedApp.request(
      "/api/activities/multipart/detail/init",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: "large.png",
          contentType: "image/png",
          fileSize: UPLOAD_LIMITS.multipartPartSizeBytes * 2,
        }),
      },
    );
    expect(unauthorizedResponse.status).toBe(401);
    await expectErrorCode(unauthorizedResponse, "UNAUTHORIZED");

    const forbiddenInitiate = fn(async () => ({
      uploadId: "should-not-be-called",
      objectKey: `exhibitions/${IDs.member}/detail/mock`,
      publicUrl: "https://cdn.example.com/mock",
      partSize: UPLOAD_LIMITS.multipartPartSizeBytes,
      maxPartNumber: 2,
    }));
    const forbiddenApp = createTestApp({
      actor: createActor("regular_member", IDs.member),
      presignService: createPresignServiceMock({ initiateMultipartUpload: forbiddenInitiate }),
    });
    const forbiddenResponse = await forbiddenApp.request(
      "/api/exhibitions/multipart/detail/init",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: "detail.png",
          contentType: "image/png",
          fileSize: UPLOAD_LIMITS.multipartPartSizeBytes * 2,
        }),
      },
    );
    expect(forbiddenResponse.status).toBe(403);
    await expectErrorCode(forbiddenResponse, "FORBIDDEN");
    expect(forbiddenInitiate).not.toHaveBeenCalled();

    const missingStorage = fn(async () => {
      throw new MissingStorageConfigError(["R2_BUCKET_NAME"]);
    });
    const missingStorageApp = createTestApp({
      actor: createActor("manager", IDs.manager),
      presignService: createPresignServiceMock({ initiateMultipartUpload: missingStorage }),
    });
    const missingStorageResponse = await missingStorageApp.request(
      "/api/activities/multipart/detail/init",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: "large.png",
          contentType: "image/png",
          fileSize: UPLOAD_LIMITS.multipartPartSizeBytes * 2,
        }),
      },
    );
    expect(missingStorageResponse.status).toBe(500);
    const missingStorageBody = await readJson<{ error: { message: string } }>(
      missingStorageResponse,
    );
    expect(missingStorageBody.error.message).toContain("R2_*");
  });

  it("/api/activities/multipart/detail/init은 regular_member에게 403을 반환한다", async () => {
    const initiateMultipartUpload = fn(async () => ({
      uploadId: "activity-upload-id",
      objectKey: `activities/${IDs.member}/detail/activity-image-key`,
      publicUrl: "https://cdn.example.com/activities/activity-image-key",
      partSize: UPLOAD_LIMITS.multipartPartSizeBytes,
      maxPartNumber: 4,
    }));
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      presignService: createPresignServiceMock({ initiateMultipartUpload }),
    });

    const response = await app.request("/api/activities/multipart/detail/init", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: "detail.png",
        contentType: "image/png",
        fileSize: UPLOAD_LIMITS.multipartPartSizeBytes * 2,
      }),
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(initiateMultipartUpload).not.toHaveBeenCalled();
  });

  it("/api/market/multipart/image/init은 regular_member에게 허용되고 unverified는 403을 반환한다", async () => {
    const initiateMultipartUpload = fn(async () => ({
      uploadId: "market-upload-id",
      objectKey: `market/${IDs.member}/image/market-image-key`,
      publicUrl: "https://cdn.example.com/market/market-image-key",
      partSize: UPLOAD_LIMITS.multipartPartSizeBytes,
      maxPartNumber: 4,
    }));
    const allowedApp = createTestApp({
      actor: createActor("regular_member", IDs.member),
      presignService: createPresignServiceMock({ initiateMultipartUpload }),
    });

    const allowedResponse = await allowedApp.request("/api/market/multipart/image/init", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: "market-image.png",
        contentType: "image/png",
        fileSize: UPLOAD_LIMITS.multipartPartSizeBytes * 2,
      }),
    });
    expect(allowedResponse.status).toBe(201);
    expect(initiateMultipartUpload).toHaveBeenCalledWith({
      actorId: IDs.member,
      resource: "market",
      slot: "image",
      fileName: "market-image.png",
      contentType: "image/png",
      fileSize: UPLOAD_LIMITS.multipartPartSizeBytes * 2,
    });

    const deniedApp = createTestApp({
      actor: createActor("unverified", IDs.otherUser),
      presignService: createPresignServiceMock({ initiateMultipartUpload }),
    });
    const deniedResponse = await deniedApp.request("/api/market/multipart/image/init", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: "market-image.png",
        contentType: "image/png",
        fileSize: UPLOAD_LIMITS.multipartPartSizeBytes * 2,
      }),
    });
    expect(deniedResponse.status).toBe(403);
    await expectErrorCode(deniedResponse, "FORBIDDEN");
  });

  it("/api/users/multipart/profile/init은 member 계열 사용자에게 허용된다", async () => {
    const initiateMultipartUpload = fn(async () => ({
      uploadId: "profile-upload-id",
      objectKey: `users/${IDs.member}/profile/profile-key`,
      publicUrl: "https://cdn.example.com/users/profile-key",
      partSize: UPLOAD_LIMITS.multipartPartSizeBytes,
      maxPartNumber: 5,
    }));
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      presignService: createPresignServiceMock({ initiateMultipartUpload }),
    });

    const response = await app.request("/api/users/multipart/profile/init", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: "profile-large.png",
        contentType: "image/png",
        fileSize: UPLOAD_LIMITS.multipartPartSizeBytes * 2,
      }),
    });

    expect(response.status).toBe(201);
    expect(initiateMultipartUpload).toHaveBeenCalledWith({
      actorId: IDs.member,
      resource: "users",
      slot: "profile",
      fileName: "profile-large.png",
      contentType: "image/png",
      fileSize: UPLOAD_LIMITS.multipartPartSizeBytes * 2,
    });
  });

  it("/api/users/multipart/profile/init은 manager에게 403을 반환한다", async () => {
    const initiateMultipartUpload = fn(async () => ({
      uploadId: "profile-upload-id",
      objectKey: `users/${IDs.manager}/profile/profile-key`,
      publicUrl: "https://cdn.example.com/users/profile-key",
      partSize: UPLOAD_LIMITS.multipartPartSizeBytes,
      maxPartNumber: 5,
    }));
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      presignService: createPresignServiceMock({ initiateMultipartUpload }),
    });

    const response = await app.request("/api/users/multipart/profile/init", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: "profile-large.png",
        contentType: "image/png",
        fileSize: UPLOAD_LIMITS.multipartPartSizeBytes * 2,
      }),
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(initiateMultipartUpload).not.toHaveBeenCalled();
  });

  it("/api/users/multipart/profile/init은 인증되지 않은 요청에 401을 반환한다", async () => {
    const app = createTestApp({ actor: null });
    const response = await app.request("/api/users/multipart/profile/init", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: "profile-large.png",
        contentType: "image/png",
        fileSize: UPLOAD_LIMITS.multipartPartSizeBytes * 2,
      }),
    });

    expect(response.status).toBe(401);
    await expectErrorCode(response, "UNAUTHORIZED");
  });

  it("/api/users/multipart/profile/init은 최대 파트 수 초과 시 413을 반환한다", async () => {
    const initiateMultipartUpload = fn(async () => ({
      uploadId: "profile-upload-id",
      objectKey: `users/${IDs.member}/profile/profile-key`,
      publicUrl: "https://cdn.example.com/users/profile-key",
      partSize: UPLOAD_LIMITS.multipartPartSizeBytes,
      maxPartNumber: 5,
    }));
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      presignService: createPresignServiceMock({ initiateMultipartUpload }),
    });

    const response = await app.request("/api/users/multipart/profile/init", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: "profile-huge.png",
        contentType: "image/png",
        fileSize:
          UPLOAD_LIMITS.multipartPartSizeBytes *
            (UPLOAD_LIMITS.multipartMaxParts + 1) +
          1,
      }),
    });

    expect(response.status).toBe(413);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(initiateMultipartUpload).not.toHaveBeenCalled();
  });

  it("/api/users/multipart/profile/init은 스토리지 설정 누락 시 500을 반환한다", async () => {
    const initiateMultipartUpload = fn(async () => {
      throw new MissingStorageConfigError(["R2_BUCKET_NAME"]);
    });
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      presignService: createPresignServiceMock({ initiateMultipartUpload }),
    });

    const response = await app.request("/api/users/multipart/profile/init", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: "profile-large.png",
        contentType: "image/png",
        fileSize: UPLOAD_LIMITS.multipartPartSizeBytes * 2,
      }),
    });

    expect(response.status).toBe(500);
    const body = await readJson<{ error: { message: string } }>(response);
    expect(body.error.message).toContain("R2_*");
  });

  it("/api/activities/multipart/detail/init은 버킷 10GB 한도 초과가 예상되면 413으로 업로드를 차단한다", async () => {
    const initiateMultipartUpload = fn(async () => ({
      uploadId: "upload-id-1",
      objectKey: `activities/${IDs.manager}/detail/multipart-key`,
      publicUrl: "https://cdn.example.com/multipart-key",
      partSize: 8 * 1024 * 1024,
      maxPartNumber: 2,
    }));
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      presignService: createPresignServiceMock({ initiateMultipartUpload }),
      readR2TotalUsageBytes: () => R2_STORAGE_LIMIT_BYTES - 1,
    });

    const response = await app.request("/api/activities/multipart/detail/init", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: "large.png",
        contentType: "image/png",
        fileSize: 2,
      }),
    });

    expect(response.status).toBe(413);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(initiateMultipartUpload).not.toHaveBeenCalled();
  });

  it("/api/users/multipart/profile/init은 버킷 10GB 한도 초과가 예상되면 413으로 업로드를 차단한다", async () => {
    const initiateMultipartUpload = fn(async () => ({
      uploadId: "profile-upload-id",
      objectKey: `users/${IDs.member}/profile/profile-key`,
      publicUrl: "https://cdn.example.com/users/profile-key",
      partSize: UPLOAD_LIMITS.multipartPartSizeBytes,
      maxPartNumber: 5,
    }));
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      presignService: createPresignServiceMock({ initiateMultipartUpload }),
      readR2TotalUsageBytes: () => R2_STORAGE_LIMIT_BYTES - 4,
    });

    const response = await app.request("/api/users/multipart/profile/init", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: "profile-large.png",
        contentType: "image/png",
        fileSize: 8,
      }),
    });

    expect(response.status).toBe(413);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(initiateMultipartUpload).not.toHaveBeenCalled();
  });

  it("/api/users/multipart/profile/init 서비스 예외 시 500을 반환한다", async () => {
    const initiateMultipartUpload = fn(async () => {
      throw new Error("init failed");
    });
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      presignService: createPresignServiceMock({ initiateMultipartUpload }),
    });

    const response = await app.request("/api/users/multipart/profile/init", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: "profile-large.png",
        contentType: "image/png",
        fileSize: UPLOAD_LIMITS.multipartPartSizeBytes * 2,
      }),
    });

    expect(response.status).toBe(500);
    await expectErrorCode(response, "INTERNAL_ERROR");
  });
});
