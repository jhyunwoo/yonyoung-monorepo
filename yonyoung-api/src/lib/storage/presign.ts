import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { timingSafeEqual } from "node:crypto";
import type { AppBindings } from "../../types/honoAppType";
import type { PresignService } from "../services/types";

export const UPLOAD_LIMITS = {
  maxSinglePartBytes: 1024 * 1024 * 1024,
  maxMultipartBytes: 1024 * 1024 * 1024,
  multipartPartSizeBytes: 8 * 1024 * 1024,
  multipartMaxParts: 10_000,
} as const;

export const ALLOWED_IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/heic",
  "image/heif",
] as const;

export const MANAGED_UPLOAD_RESOURCE_PATHS = [
  "activities",
  "exhibitions",
  "users",
  "notices",
  "market",
] as const;

export const MANAGED_UPLOAD_SLOTS = [
  "cover",
  "detail",
  "profile",
  "image",
] as const;

export type ManagedUploadResourcePath = (typeof MANAGED_UPLOAD_RESOURCE_PATHS)[number];
export type ManagedUploadSlot = (typeof MANAGED_UPLOAD_SLOTS)[number];

type StorageEnv = {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicReadBaseUrl: string;
  publicUrlSigningSecret: string;
};

const PRESIGNED_URL_EXPIRES_IN_SECONDS = 3600;
const PUBLIC_MEDIA_ROUTE_PREFIX = "/api/public/media";
const PUBLIC_URL_SIGNING_SECRET_ENV_KEY = "R2_PUBLIC_URL_SIGNING_SECRET";
const LEGACY_PUBLIC_URL_SIGNING_SECRET_ENV_KEY = "BETTER_AUTH_SECRET";
const SAFE_OBJECT_SEGMENT_PATTERN = /^[A-Za-z0-9._-]{1,160}$/;
const SAFE_ACTOR_ID_PATTERN = /^[A-Za-z0-9_-]{1,120}$/;
const SLOT_ALLOWLIST_BY_PATH: Record<ManagedUploadResourcePath, readonly ManagedUploadSlot[]> = {
  activities: ["cover", "detail"],
  exhibitions: ["cover", "detail"],
  users: ["profile"],
  notices: ["image"],
  market: ["image"],
};
const textEncoder = new TextEncoder();

const storageEnvKeyMap = {
  endpoint: "R2_S3_ENDPOINT",
  accessKeyId: "R2_ACCESS_KEY_ID",
  secretAccessKey: "R2_SECRET_ACCESS_KEY",
  bucket: "R2_BUCKET",
} as const;

type StorageEnvKey = keyof typeof storageEnvKeyMap;

export class MissingStorageConfigError extends Error {
  readonly missingKeys: string[];

  constructor(missingKeys: string[]) {
    super(`필수 스토리지 설정이 누락되었습니다: ${missingKeys.join(", ")}`);
    this.name = "MissingStorageConfigError";
    this.missingKeys = missingKeys;
  }
}

const getEnvValue = (
  env: AppBindings,
  key: StorageEnvKey,
): string | undefined => {
  const envKey = storageEnvKeyMap[key];
  const bindingValue = env[envKey];
  if (typeof bindingValue === "string" && bindingValue.trim()) {
    return bindingValue.trim();
  }

  const processValue = process.env[envKey];
  if (processValue?.trim()) {
    return processValue.trim();
  }

  return undefined;
};

const readRuntimeValue = (env: AppBindings, key: keyof AppBindings): string | undefined => {
  const bindingValue = env[key];
  if (typeof bindingValue === "string" && bindingValue.trim()) {
    return bindingValue.trim();
  }

  const processValue = process.env[String(key)];
  if (processValue?.trim()) {
    return processValue.trim();
  }

  return undefined;
};

export const resolvePublicObjectSigningSecret = (
  env: AppBindings,
): string | undefined => {
  return resolvePublicObjectSigningSecrets(env)[0];
};

export const resolvePublicObjectSigningSecrets = (
  env: AppBindings,
): string[] => {
  const candidates = [
    readRuntimeValue(env, PUBLIC_URL_SIGNING_SECRET_ENV_KEY as keyof AppBindings),
    readRuntimeValue(
      env,
      LEGACY_PUBLIC_URL_SIGNING_SECRET_ENV_KEY as keyof AppBindings,
    ),
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  return [...new Set(candidates)];
};

const sanitizeFileName = (fileName: string): string => {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return "file";
  }

  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
};

const encodeKeyForPublicUrl = (key: string) => {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
};

const createFileToken = (fileName: string): string => {
  const safeFileName = sanitizeFileName(fileName);
  return `${crypto.randomUUID()}-${safeFileName}`;
};

const isManagedResourcePath = (value: string): value is ManagedUploadResourcePath => {
  return (MANAGED_UPLOAD_RESOURCE_PATHS as readonly string[]).includes(value);
};

const isManagedUploadSlot = (value: string): value is ManagedUploadSlot => {
  return (MANAGED_UPLOAD_SLOTS as readonly string[]).includes(value);
};

export const parseManagedObjectKey = (
  objectKey: string,
):
  | {
      resourcePath: ManagedUploadResourcePath;
      actorId: string;
      slot: ManagedUploadSlot;
      fileToken: string;
    }
  | null => {
  const segments = objectKey.split("/");
  if (segments.length !== 4) {
    return null;
  }

  const [resourcePath, actorId, slot, fileToken] = segments;
  if (
    !resourcePath ||
    !actorId ||
    !slot ||
    !fileToken ||
    !isManagedResourcePath(resourcePath) ||
    !isManagedUploadSlot(slot)
  ) {
    return null;
  }

  if (!SLOT_ALLOWLIST_BY_PATH[resourcePath].includes(slot)) {
    return null;
  }

  if (!SAFE_ACTOR_ID_PATTERN.test(actorId) || !SAFE_OBJECT_SEGMENT_PATTERN.test(fileToken)) {
    return null;
  }

  return {
    resourcePath,
    actorId,
    slot,
    fileToken,
  };
};

const resolveStorageEnv = (env: AppBindings): StorageEnv => {
  const endpoint = getEnvValue(env, "endpoint");
  const accessKeyId = getEnvValue(env, "accessKeyId");
  const secretAccessKey = getEnvValue(env, "secretAccessKey");
  const bucket = getEnvValue(env, "bucket");
  const publicReadBaseUrl = readRuntimeValue(env, "BETTER_AUTH_URL");
  const publicUrlSigningSecret = resolvePublicObjectSigningSecret(env);

  const missingKeys: string[] = [];
  if (!endpoint) {
    missingKeys.push(storageEnvKeyMap.endpoint);
  }
  if (!accessKeyId) {
    missingKeys.push(storageEnvKeyMap.accessKeyId);
  }
  if (!secretAccessKey) {
    missingKeys.push(storageEnvKeyMap.secretAccessKey);
  }
  if (!bucket) {
    missingKeys.push(storageEnvKeyMap.bucket);
  }
  if (!publicReadBaseUrl) {
    missingKeys.push("BETTER_AUTH_URL");
  }
  if (!publicUrlSigningSecret) {
    missingKeys.push(
      `${PUBLIC_URL_SIGNING_SECRET_ENV_KEY} or ${LEGACY_PUBLIC_URL_SIGNING_SECRET_ENV_KEY}`,
    );
  }

  if (missingKeys.length > 0) {
    throw new MissingStorageConfigError(missingKeys);
  }

  const resolvedEndpoint = endpoint as string;
  const resolvedAccessKeyId = accessKeyId as string;
  const resolvedSecretAccessKey = secretAccessKey as string;
  const resolvedBucket = bucket as string;

  return {
    endpoint: resolvedEndpoint,
    accessKeyId: resolvedAccessKeyId,
    secretAccessKey: resolvedSecretAccessKey,
    bucket: resolvedBucket,
    publicReadBaseUrl: new URL(publicReadBaseUrl as string).origin,
    publicUrlSigningSecret: publicUrlSigningSecret as string,
  };
};

const buildObjectKey = (input: {
  actorId: string;
  resource: ManagedUploadResourcePath;
  slot: ManagedUploadSlot;
  fileName: string;
}): string => {
  return `${input.resource}/${input.actorId}/${input.slot}/${createFileToken(input.fileName)}`;
};

const signObjectKey = async (objectKey: string, secret: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    textEncoder.encode(objectKey),
  );
  return Buffer.from(signatureBuffer).toString("base64url");
};

const timingSafeEqualString = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

export const buildSignedPublicObjectUrl = async (input: {
  baseUrl: string;
  objectKey: string;
  signingSecret: string;
}): Promise<string> => {
  const signature = await signObjectKey(input.objectKey, input.signingSecret);
  const encodedKey = encodeKeyForPublicUrl(input.objectKey);
  const url = new URL(
    `${PUBLIC_MEDIA_ROUTE_PREFIX}/${encodedKey}`,
    input.baseUrl,
  );
  url.searchParams.set("sig", signature);
  return url.toString();
};

export const verifySignedPublicObjectSignature = async (input: {
  objectKey: string;
  signature: string | null | undefined;
  signingSecret?: string;
  signingSecrets?: readonly string[];
}): Promise<boolean> => {
  const signature = input.signature?.trim();
  if (!signature) {
    return false;
  }

  const signingSecrets = input.signingSecrets ?? [];
  const candidateSecrets =
    input.signingSecret === undefined
      ? [...signingSecrets]
      : [input.signingSecret, ...signingSecrets];
  const uniqueSecrets = [...new Set(candidateSecrets.filter((value) => value.length > 0))];

  for (const secret of uniqueSecrets) {
    const expected = await signObjectKey(input.objectKey, secret);
    if (timingSafeEqualString(expected, signature)) {
      return true;
    }
  }

  return false;
};

export const createR2PresignService = (env: AppBindings): PresignService => {
  const storageEnv = resolveStorageEnv(env);
  const client = new S3Client({
    region: "auto",
    endpoint: storageEnv.endpoint,
    credentials: {
      accessKeyId: storageEnv.accessKeyId,
      secretAccessKey: storageEnv.secretAccessKey,
    },
  });

  const resolvePublicUrlFromObjectKey = async (objectKey: string) => {
    return buildSignedPublicObjectUrl({
      baseUrl: storageEnv.publicReadBaseUrl,
      objectKey,
      signingSecret: storageEnv.publicUrlSigningSecret,
    });
  };

  return {
    async issuePresignedPutUrl(input) {
      const objectKey = buildObjectKey(input);

      const command = new PutObjectCommand({
        Bucket: storageEnv.bucket,
        Key: objectKey,
        ContentType: input.contentType,
        ContentLength: input.fileSize,
      });

      const uploadUrl = await getSignedUrl(client, command, {
        expiresIn: PRESIGNED_URL_EXPIRES_IN_SECONDS,
      });

      return {
        uploadUrl,
        objectKey,
        publicUrl: await resolvePublicUrlFromObjectKey(objectKey),
        requiredHeaders: {
          "Content-Type": input.contentType,
        },
      };
    },

    async initiateMultipartUpload(input) {
      const objectKey = buildObjectKey(input);

      const created = await client.send(
        new CreateMultipartUploadCommand({
          Bucket: storageEnv.bucket,
          Key: objectKey,
          ContentType: input.contentType,
        }),
      );

      if (!created.UploadId) {
        throw new Error("multipart uploadId 생성에 실패했습니다.");
      }

      const maxPartNumber = Math.ceil(
        input.fileSize / UPLOAD_LIMITS.multipartPartSizeBytes,
      );

      return {
        uploadId: created.UploadId,
        objectKey,
        publicUrl: await resolvePublicUrlFromObjectKey(objectKey),
        partSize: UPLOAD_LIMITS.multipartPartSizeBytes,
        maxPartNumber,
      };
    },

    async issueMultipartUploadPartUrl(input) {
      const command = new UploadPartCommand({
        Bucket: storageEnv.bucket,
        Key: input.objectKey,
        UploadId: input.uploadId,
        PartNumber: input.partNumber,
      });

      const uploadUrl = await getSignedUrl(client, command, {
        expiresIn: PRESIGNED_URL_EXPIRES_IN_SECONDS,
      });

      return {
        uploadUrl,
        requiredHeaders: {},
      };
    },

    async completeMultipartUpload(input) {
      await client.send(
        new CompleteMultipartUploadCommand({
          Bucket: storageEnv.bucket,
          Key: input.objectKey,
          UploadId: input.uploadId,
          MultipartUpload: {
            Parts: [...input.parts]
              .sort((a, b) => a.partNumber - b.partNumber)
              .map((part) => ({
                ETag: part.etag,
                PartNumber: part.partNumber,
              })),
          },
        }),
      );

      return {
        objectKey: input.objectKey,
        publicUrl: await resolvePublicUrlFromObjectKey(input.objectKey),
      };
    },

    async abortMultipartUpload(input) {
      await client.send(
        new AbortMultipartUploadCommand({
          Bucket: storageEnv.bucket,
          Key: input.objectKey,
          UploadId: input.uploadId,
        }),
      );
    },
  };
};
