import { AdminApiError } from "@/shared/http/http";
import {
  type ApiAuditActor,
  type ApiGenerationNotice,
  type ApiGlobalNotice,
  type ApiNoticeAuthor,
} from "@/shared/contracts/api-contracts";
import { summarizeRichTextHtml } from "@/features/media/rich-text/rich-text";

export const NOTICE_MAX_IMAGES = 10;

export type NoticeScope = "generation" | "global";

export type NoticeItem = {
  id: string;
  title: string;
  content: string;
  imageUrls: string[];
  createdAt: number;
  updatedAt: number;
  updatedBy: ApiAuditActor | null;
  author: ApiNoticeAuthor;
};

type NoticeLike = ApiGenerationNotice | ApiGlobalNotice;

export const toNoticeItem = (notice: NoticeLike): NoticeItem => ({
  id: notice.id,
  title: notice.title,
  content: notice.content,
  imageUrls: notice.imageUrls,
  createdAt: notice.createdAt,
  updatedAt: notice.updatedAt,
  updatedBy: notice.updatedBy,
  author: notice.author,
});

export const normalizeNotices = (notices: NoticeLike[]): NoticeItem[] => {
  return notices
    .map(toNoticeItem)
    .sort((left, right) => right.createdAt - left.createdAt);
};

export const readNoticeErrorMessage = (error: unknown): string => {
  if (error instanceof AdminApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
};

export const buildRoleLabel = (role: string | null): string => {
  switch (role) {
    case "president":
      return "회장";
    case "vice_president":
      return "부회장";
    case "manager":
      return "부장";
    case "new_member":
      return "신입부원";
    case "associate_member":
      return "준회원";
    case "regular_member":
      return "정회원";
    case "unverified":
      return "미승인";
    default:
      return "역할 미지정";
  }
};

export const buildNoticePreview = (content: string, limit = 120): string => {
  return summarizeRichTextHtml(content, limit);
};

const isValidImageUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
};

export const normalizeNoticeImageUrls = (urls: string[]): string[] => {
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
    if (normalized.length >= NOTICE_MAX_IMAGES) {
      break;
    }
  }

  return normalized;
};
