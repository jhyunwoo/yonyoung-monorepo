import {
  createExistingUploadImageItem,
  type UploadImageItem,
} from "@/features/media/upload/image-upload-state";

export const SHOWCASE_MAX_IMAGES = 10;

const isValidImageUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
};

export const normalizeShowcaseImageUrls = (urls: string[]): string[] => {
  const normalized: string[] = [];
  for (const url of urls) {
    const trimmed = url.trim();
    if (!trimmed || !isValidImageUrl(trimmed)) {
      continue;
    }
    if (normalized.includes(trimmed)) {
      continue;
    }
    normalized.push(trimmed);
    if (normalized.length >= SHOWCASE_MAX_IMAGES) {
      break;
    }
  }

  return normalized;
};

export const toShowcaseUploadImageItems = (urls: string[]): UploadImageItem[] => {
  return normalizeShowcaseImageUrls(urls).map((imageUrl) =>
    createExistingUploadImageItem({
      id: `showcase-${crypto.randomUUID()}`,
      imageUrl,
    }),
  );
};
