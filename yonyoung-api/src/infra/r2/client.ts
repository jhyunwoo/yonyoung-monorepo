import type { Bindings } from "../../bindings/types";
import { AppError } from "../../shared/errors/AppError";

export type R2PutInput = {
  key: string;
  body: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob | null;
  sizeBytes?: number;
  options?: R2PutOptions;
  maxBytes?: number;
};

export type R2Client = {
  putObject: (input: R2PutInput) => Promise<R2Object | null>;
  getObject: (key: string) => Promise<R2ObjectBody | null>;
  deleteObject: (key: string) => Promise<void>;
  listObjects: (options?: R2ListOptions) => Promise<R2Objects>;
};

const R2_NOT_FOUND_PATTERNS = ["NoSuchKey", "specified key does not exist"];
const R2_TOO_LARGE_PATTERNS = ["EntityTooLarge", "MetadataTooLarge", "too large"];

const mapR2Error = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);

  if (R2_NOT_FOUND_PATTERNS.some((pattern) => message.includes(pattern))) {
    return AppError.notFound("요청한 스토리지 객체를 찾을 수 없습니다.");
  }

  if (R2_TOO_LARGE_PATTERNS.some((pattern) => message.includes(pattern))) {
    return AppError.payloadTooLarge("스토리지 요청 크기 제한을 초과했습니다.");
  }

  return AppError.internal("스토리지 처리 중 오류가 발생했습니다.", undefined, error);
};

export const resolveR2Bucket = (env: Pick<Bindings, "R2" | "r2">): R2Bucket => {
  const bucket = env.R2 ?? env.r2;
  if (!bucket) {
    throw AppError.internal("R2 버킷 바인딩이 구성되지 않았습니다.");
  }
  return bucket;
};

const ensureSizeLimit = (sizeBytes: number | undefined, maxBytes: number | undefined) => {
  if (!maxBytes || maxBytes <= 0 || sizeBytes === undefined) {
    return;
  }

  if (sizeBytes > maxBytes) {
    throw AppError.payloadTooLarge(
      `요청 본문이 허용된 최대 크기(${maxBytes} bytes)를 초과했습니다.`,
    );
  }
};

export const createR2Client = (bucket: R2Bucket): R2Client => {
  return {
    putObject: async (input) => {
      ensureSizeLimit(input.sizeBytes, input.maxBytes);

      try {
        return await bucket.put(input.key, input.body, input.options);
      } catch (error) {
        throw mapR2Error(error);
      }
    },

    getObject: async (key) => {
      try {
        return await bucket.get(key);
      } catch (error) {
        throw mapR2Error(error);
      }
    },

    deleteObject: async (key) => {
      try {
        await bucket.delete(key);
      } catch (error) {
        throw mapR2Error(error);
      }
    },

    listObjects: async (options) => {
      try {
        return await bucket.list(options);
      } catch (error) {
        throw mapR2Error(error);
      }
    },
  };
};
