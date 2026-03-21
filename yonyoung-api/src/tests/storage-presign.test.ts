import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSend = vi.fn();

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(function S3ClientMock(
    this: { config?: unknown; send: typeof mockSend },
    config: unknown,
  ) {
    this.config = config;
    this.send = mockSend;
  }),
  PutObjectCommand: vi.fn().mockImplementation(function PutObjectCommandMock(
    this: { input?: unknown },
    input: unknown,
  ) {
    this.input = input;
  }),
  CreateMultipartUploadCommand: vi.fn().mockImplementation(
    function CreateMultipartUploadCommandMock(
      this: { input?: unknown },
      input: unknown,
    ) {
      this.input = input;
    },
  ),
  UploadPartCommand: vi.fn().mockImplementation(function UploadPartCommandMock(
    this: { input?: unknown },
    input: unknown,
  ) {
    this.input = input;
  }),
  CompleteMultipartUploadCommand: vi.fn().mockImplementation(
    function CompleteMultipartUploadCommandMock(
      this: { input?: unknown },
      input: unknown,
    ) {
      this.input = input;
    },
  ),
  AbortMultipartUploadCommand: vi.fn().mockImplementation(
    function AbortMultipartUploadCommandMock(
      this: { input?: unknown },
      input: unknown,
    ) {
      this.input = input;
    },
  ),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  createR2PresignService,
  MissingStorageConfigError,
  parseManagedObjectKey,
} from "../lib/storage/presign";

describe("createR2PresignService", () => {
  const mockS3Client = vi.mocked(S3Client);
  const mockPutObjectCommand = vi.mocked(PutObjectCommand);
  const mockCreateMultipartUploadCommand = vi.mocked(CreateMultipartUploadCommand);
  const mockUploadPartCommand = vi.mocked(UploadPartCommand);
  const mockCompleteMultipartUploadCommand = vi.mocked(CompleteMultipartUploadCommand);
  const mockAbortMultipartUploadCommand = vi.mocked(AbortMultipartUploadCommand);
  const mockGetSignedUrl = vi.mocked(getSignedUrl);

  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockReset();
    mockS3Client.mockClear();
    mockPutObjectCommand.mockClear();
    mockCreateMultipartUploadCommand.mockClear();
    mockUploadPartCommand.mockClear();
    mockCompleteMultipartUploadCommand.mockClear();
    mockAbortMultipartUploadCommand.mockClear();
    mockGetSignedUrl.mockReset();
  });

  it("서명된 애플리케이션 공개 URL과 난수 기반 objectKey를 생성한다", async () => {
    const randomUuidSpy = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValue("11111111-2222-4333-8444-555555555555");
    mockGetSignedUrl.mockResolvedValue(
      "https://yonyoung-storage.example-account.r2.cloudflarestorage.com/activities/user-1/cover/11111111-2222-4333-8444-555555555555-photo.png?X-Amz-Algorithm=AWS4-HMAC-SHA256",
    );

    const service = createR2PresignService({
      R2_S3_ENDPOINT: "https://example-account.r2.cloudflarestorage.com",
      R2_ACCESS_KEY_ID: "key",
      R2_SECRET_ACCESS_KEY: "secret",
      R2_BUCKET: "yonyoung-storage",
      R2_PUBLIC_URL_SIGNING_SECRET:
        "test-public-url-signing-secret-at-least-32-chars",
      BETTER_AUTH_URL: "https://app.example.com",
      BETTER_AUTH_SECRET: "test-better-auth-secret-with-at-least-32-chars",
    } as never);

    const result = await service.issuePresignedPutUrl({
      actorId: "user-1",
      resource: "activities",
      slot: "cover",
      fileName: "photo.png",
      contentType: "image/png",
      fileSize: 1024,
    });

    const publicUrl = new URL(result.publicUrl);
    expect(publicUrl.origin).toBe("https://app.example.com");
    expect(publicUrl.pathname).toBe(
      "/api/public/media/activities/user-1/cover/11111111-2222-4333-8444-555555555555-photo.png",
    );
    expect(publicUrl.searchParams.get("sig")).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(mockS3Client).toHaveBeenCalledWith({
      region: "auto",
      endpoint: "https://example-account.r2.cloudflarestorage.com",
      credentials: {
        accessKeyId: "key",
        secretAccessKey: "secret",
      },
    });
    expect(mockPutObjectCommand).toHaveBeenCalledWith({
      Bucket: "yonyoung-storage",
      Key: "activities/user-1/cover/11111111-2222-4333-8444-555555555555-photo.png",
      ContentType: "image/png",
      ContentLength: 1024,
    });
    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { expiresIn: 3600 },
    );
    expect(result.requiredHeaders).toEqual({
      "Content-Type": "image/png",
    });
    randomUuidSpy.mockRestore();
  });

  it("멀티파트 업로드 수명주기 API를 제공한다", async () => {
    const randomUuidSpy = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValue("99999999-aaaa-4bbb-8ccc-dddddddddddd");
    mockSend.mockResolvedValueOnce({ UploadId: "upload-1" });
    mockSend.mockResolvedValueOnce({});
    mockSend.mockResolvedValueOnce({});
    mockGetSignedUrl
      .mockResolvedValueOnce("https://upload.example.com/part-1")
      .mockResolvedValueOnce("https://upload.example.com/part-2");

    const service = createR2PresignService({
      R2_S3_ENDPOINT: "https://example-account.r2.cloudflarestorage.com",
      R2_ACCESS_KEY_ID: "key",
      R2_SECRET_ACCESS_KEY: "secret",
      R2_BUCKET: "yonyoung-storage",
      R2_PUBLIC_URL_SIGNING_SECRET:
        "test-public-url-signing-secret-at-least-32-chars",
      BETTER_AUTH_URL: "https://app.example.com",
      BETTER_AUTH_SECRET: "test-better-auth-secret-with-at-least-32-chars",
    } as never);

    const init = await service.initiateMultipartUpload({
      actorId: "user-1",
      resource: "activities",
      slot: "detail",
      fileName: "detail.png",
      contentType: "image/png",
      fileSize: 20 * 1024 * 1024,
    });

    expect(init.uploadId).toBe("upload-1");
    expect(init.objectKey).toBe(
      "activities/user-1/detail/99999999-aaaa-4bbb-8ccc-dddddddddddd-detail.png",
    );
    expect(mockCreateMultipartUploadCommand).toHaveBeenCalledWith({
      Bucket: "yonyoung-storage",
      Key: "activities/user-1/detail/99999999-aaaa-4bbb-8ccc-dddddddddddd-detail.png",
      ContentType: "image/png",
    });

    const part = await service.issueMultipartUploadPartUrl({
      uploadId: "upload-1",
      objectKey: init.objectKey,
      partNumber: 1,
    });
    expect(part.uploadUrl).toContain("upload.example.com");
    expect(mockUploadPartCommand).toHaveBeenCalledWith({
      Bucket: "yonyoung-storage",
      Key: init.objectKey,
      UploadId: "upload-1",
      PartNumber: 1,
    });

    const complete = await service.completeMultipartUpload({
      uploadId: "upload-1",
      objectKey: init.objectKey,
      parts: [{ partNumber: 1, etag: "\"etag-1\"" }],
    });

    const completePublicUrl = new URL(complete.publicUrl);
    expect(completePublicUrl.origin).toBe("https://app.example.com");
    expect(completePublicUrl.pathname).toBe(
      "/api/public/media/activities/user-1/detail/99999999-aaaa-4bbb-8ccc-dddddddddddd-detail.png",
    );
    expect(completePublicUrl.searchParams.get("sig")).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(mockCompleteMultipartUploadCommand).toHaveBeenCalledWith({
      Bucket: "yonyoung-storage",
      Key: init.objectKey,
      UploadId: "upload-1",
      MultipartUpload: {
        Parts: [{ ETag: '"etag-1"', PartNumber: 1 }],
      },
    });

    await service.abortMultipartUpload({
      uploadId: "upload-1",
      objectKey: init.objectKey,
    });
    expect(mockAbortMultipartUploadCommand).toHaveBeenCalledWith({
      Bucket: "yonyoung-storage",
      Key: init.objectKey,
      UploadId: "upload-1",
    });
    randomUuidSpy.mockRestore();
  });

  it("공개 미디어 전용 서명 시크릿이 누락되면 MissingStorageConfigError를 던진다", () => {
    expect(
      () =>
        createR2PresignService({
          BETTER_AUTH_URL: "https://app.example.com",
          R2_ACCESS_KEY_ID: "key",
          R2_SECRET_ACCESS_KEY: "secret",
          R2_BUCKET: "yonyoung-storage",
        } as never),
    ).toThrowError(MissingStorageConfigError);
  });

  it("공개 미디어 전용 시크릿이 없으면 BETTER_AUTH_SECRET을 하위호환으로 사용한다", async () => {
    const randomUuidSpy = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValue("22222222-3333-4444-8555-666666666666");
    mockGetSignedUrl.mockResolvedValue(
      "https://yonyoung-storage.example-account.r2.cloudflarestorage.com/market/user-1/image/22222222-3333-4444-8555-666666666666-photo.png?X-Amz-Algorithm=AWS4-HMAC-SHA256",
    );

    const service = createR2PresignService({
      R2_S3_ENDPOINT: "https://example-account.r2.cloudflarestorage.com",
      R2_ACCESS_KEY_ID: "key",
      R2_SECRET_ACCESS_KEY: "secret",
      R2_BUCKET: "yonyoung-storage",
      BETTER_AUTH_URL: "https://app.example.com",
      BETTER_AUTH_SECRET: "test-better-auth-secret-with-at-least-32-chars",
    } as never);

    const result = await service.issuePresignedPutUrl({
      actorId: "user-1",
      resource: "market",
      slot: "image",
      fileName: "photo.png",
      contentType: "image/png",
      fileSize: 1024,
    });

    const publicUrl = new URL(result.publicUrl);
    expect(publicUrl.origin).toBe("https://app.example.com");
    expect(publicUrl.pathname).toBe(
      "/api/public/media/market/user-1/image/22222222-3333-4444-8555-666666666666-photo.png",
    );
    expect(publicUrl.searchParams.get("sig")).toMatch(/^[A-Za-z0-9_-]+$/);
    randomUuidSpy.mockRestore();
  });

  it("objectKey 파서는 정확한 4단계 경로만 허용한다", () => {
    expect(parseManagedObjectKey("activities/user-1/cover/file.png")).toEqual({
      resourcePath: "activities",
      actorId: "user-1",
      slot: "cover",
      fileToken: "file.png",
    });
    expect(parseManagedObjectKey("activities/user-1/cover/file.png/extra")).toBeNull();
    expect(parseManagedObjectKey("activities/user-1/../file.png")).toBeNull();
  });
});
