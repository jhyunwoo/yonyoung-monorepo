import Uppy from "@uppy/core";
import AwsS3 from "@uppy/aws-s3";
import { AdminApiError } from "@/shared/http/http";
import { adminRequest } from "@/features/dashboard/api/admin-api/http";
import type { ApiPresignResponse } from "@/shared/contracts/api-contracts";

export const PRESIGN_PATHS = {
  activityCover: "/activities/presign/cover",
  activityDetail: "/activities/presign/detail",
  exhibitionCover: "/exhibitions/presign/cover",
  exhibitionDetail: "/exhibitions/presign/detail",
  noticeImage: "/notices/presign/image",
  recruitingImage: "/recruiting/presign/image",
  marketImage: "/market/presign/image",
  userProfile: "/users/presign/profile",
} as const;

type PresignPath = (typeof PRESIGN_PATHS)[keyof typeof PRESIGN_PATHS];

type UploadHeaders = Record<string, string>;

const readUploadProgress = (loaded: number, total: number): number => {
  if (total <= 0) {
    return 0;
  }

  const raw = Math.round((loaded / total) * 100);
  if (raw < 0) {
    return 0;
  }
  if (raw > 100) {
    return 100;
  }

  return raw;
};

const clampProgress = (progress: number): number => {
  if (!Number.isFinite(progress)) {
    return 0;
  }

  if (progress < 0) {
    return 0;
  }
  if (progress > 100) {
    return 100;
  }

  return Math.round(progress);
};

const defaultContentType = (file: File): string => {
  if (file.type && file.type.startsWith("image/")) {
    return file.type;
  }

  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) {
    return "image/png";
  }
  if (name.endsWith(".webp")) {
    return "image/webp";
  }
  if (name.endsWith(".gif")) {
    return "image/gif";
  }
  return "image/jpeg";
};

const resolveUploadHeaders = (
  requiredHeaders: ApiPresignResponse["requiredHeaders"] | undefined,
  fallbackContentType: string,
): UploadHeaders => {
  const resolved: UploadHeaders = {};
  let hasContentTypeHeader = false;

  if (requiredHeaders) {
    for (const [key, value] of Object.entries(requiredHeaders)) {
      if (!value) {
        continue;
      }
      resolved[key] = value;
      if (key.toLowerCase() === "content-type") {
        hasContentTypeHeader = true;
      }
    }
  }

  if (!hasContentTypeHeader) {
    resolved["Content-Type"] = fallbackContentType;
  }

  return resolved;
};

const toUploadError = (status = 0) =>
  new AdminApiError({
    status,
    code: "UPLOAD_FAILED",
    message: "파일 업로드에 실패했습니다.",
  });

const isJsdomEnvironment = (): boolean => {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /\bjsdom\b/i.test(navigator.userAgent);
};

const shouldUseUppyUploader = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  return !isJsdomEnvironment();
};

const runUploadWithFetch = async (input: {
  uploadUrl: string;
  uploadHeaders: UploadHeaders;
  file: File;
}) => {
  let uploadResponse: Response;
  try {
    uploadResponse = await fetch(input.uploadUrl, {
      method: "PUT",
      mode: "cors",
      credentials: "omit",
      headers: input.uploadHeaders,
      body: input.file,
    });
  } catch {
    throw toUploadError();
  }

  if (!uploadResponse.ok) {
    throw toUploadError(uploadResponse.status);
  }
};

const runUploadWithXhr = async (input: {
  uploadUrl: string;
  uploadHeaders: UploadHeaders;
  file: File;
  onProgress?: (progressPercent: number) => void;
}) =>
  new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", input.uploadUrl);
    request.withCredentials = false;
    for (const [key, value] of Object.entries(input.uploadHeaders)) {
      request.setRequestHeader(key, value);
    }

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || !input.onProgress) {
        return;
      }
      input.onProgress(readUploadProgress(event.loaded, event.total));
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
        return;
      }

      reject(toUploadError(request.status || 0));
    };

    request.onerror = () => {
      reject(toUploadError(request.status || 0));
    };

    request.send(input.file);
  });

const runUploadWithUppy = async (input: {
  uploadUrl: string;
  uploadHeaders: UploadHeaders;
  file: File;
  onProgress?: (progressPercent: number) => void;
}) => {
  const uppy = new Uppy({
    autoProceed: false,
    restrictions: {
      maxNumberOfFiles: 1,
    },
  });

  if (input.onProgress) {
    uppy.on("progress", (progress) => {
      input.onProgress?.(clampProgress(progress));
    });
  }

  try {
    uppy.use(AwsS3, {
      limit: 1,
      retryDelays: [0, 1000, 3000, 5000],
      shouldUseMultipart: false,
      getUploadParameters: async () => ({
        method: "PUT",
        url: input.uploadUrl,
        headers: input.uploadHeaders,
      }),
    });

    uppy.addFile({
      name: input.file.name,
      type: input.file.type,
      data: input.file,
      source: "local",
    });

    const result = await uppy.upload();
    if (!result || (result.failed?.length ?? 0) > 0) {
      throw toUploadError();
    }
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error;
    }

    throw toUploadError();
  } finally {
    uppy.destroy();
  }
};

export const uploadWithPresign = async (input: {
  presignPath: PresignPath;
  file: File;
  onProgress?: (progressPercent: number) => void;
}): Promise<string> => {
  const contentType = defaultContentType(input.file);
  const presign = await adminRequest<ApiPresignResponse>(input.presignPath, "POST", {
    fileName: input.file.name,
    contentType,
    fileSize: input.file.size,
  });

  const uploadHeaders = resolveUploadHeaders(presign.requiredHeaders, contentType);

  if (input.onProgress) {
    input.onProgress(0);
  }

  if (shouldUseUppyUploader()) {
    await runUploadWithUppy({
      uploadUrl: presign.uploadUrl,
      uploadHeaders,
      file: input.file,
      onProgress: input.onProgress,
    });
  } else if (input.onProgress && typeof XMLHttpRequest !== "undefined") {
    await runUploadWithXhr({
      uploadUrl: presign.uploadUrl,
      uploadHeaders,
      file: input.file,
      onProgress: input.onProgress,
    });
  } else {
    await runUploadWithFetch({
      uploadUrl: presign.uploadUrl,
      uploadHeaders,
      file: input.file,
    });
  }

  if (input.onProgress) {
    input.onProgress(100);
  }

  return presign.publicUrl;
};
