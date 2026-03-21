import { describe, expect, it } from "vitest";
import {
  createActor,
  createPresignServiceMock,
  createTestApp,
  expectErrorCode,
  IDs,
} from "./test-helpers";

describe("API CSRF middleware", () => {
  it("교차 출처 상태 변경 요청을 차단한다", async () => {
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      presignService: createPresignServiceMock({
        issuePresignedPutUrl: async () => ({
          uploadUrl: "https://upload.example.com/put",
          objectKey: "activities/user-manager-0003/cover/file.png",
          publicUrl: "https://app.example.com/api/public/media/activities/user-manager-0003/cover/file.png?sig=test",
          requiredHeaders: {
            "Content-Type": "image/png",
          },
        }),
      }),
    });

    const response = await app.request("/api/activities/presign/cover", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://evil.example.com",
        "sec-fetch-site": "cross-site",
      },
      body: JSON.stringify({
        fileName: "cover.png",
        contentType: "image/png",
        fileSize: 1024,
      }),
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
  });

  it("허용된 same-origin 상태 변경 요청은 통과시킨다", async () => {
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      presignService: createPresignServiceMock({
        issuePresignedPutUrl: async () => ({
          uploadUrl: "https://upload.example.com/put",
          objectKey: "activities/user-manager-0003/cover/file.png",
          publicUrl: "https://app.example.com/api/public/media/activities/user-manager-0003/cover/file.png?sig=test",
          requiredHeaders: {
            "Content-Type": "image/png",
          },
        }),
      }),
    });

    const response = await app.request("/api/activities/presign/cover", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
        "sec-fetch-site": "same-origin",
      },
      body: JSON.stringify({
        fileName: "cover.png",
        contentType: "image/png",
        fileSize: 1024,
      }),
    });

    expect(response.status).toBe(201);
  });
});
