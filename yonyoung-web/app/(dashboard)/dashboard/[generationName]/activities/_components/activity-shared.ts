import type {
  ApiActivity,
  ApiUpdateActivityImageBatchItemInput,
} from "@/shared/contracts/api-contracts";
import { AdminApiError } from "@/shared/http/http";
import { summarizeRichTextHtml } from "@/features/media/rich-text/rich-text";

type ActivityImageSortInput = {
  id: string;
  sortOrder: number;
};

const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const pad2 = (value: number): string => value.toString().padStart(2, "0");

const toNonNegativeInteger = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const rounded = Math.round(value);
  return rounded < 0 ? 0 : rounded;
};

export const readActivityErrorMessage = (error: unknown): string => {
  if (error instanceof AdminApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
};

export const sortActivitiesByStartDateDesc = (
  activities: ApiActivity[],
): ApiActivity[] => {
  return [...activities].sort((left, right) => right.startDate - left.startDate);
};

export const summarizeActivityDescription = (
  descriptionHtml: string,
  maxLength = 120,
): string => {
  return summarizeRichTextHtml(descriptionHtml, maxLength);
};

const sortActivityImageInputsBySortOrder = (
  images: ActivityImageSortInput[],
): ActivityImageSortInput[] => {
  return [...images].sort((left, right) => {
    if (left.sortOrder === right.sortOrder) {
      return left.id.localeCompare(right.id);
    }
    return left.sortOrder - right.sortOrder;
  });
};

export const formatTimestampToDateInput = (timestampMs: number): string => {
  const date = new Date(timestampMs);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

export const parseDateInputToTimestamp = (dateInputValue: string): number | null => {
  const trimmed = dateInputValue.trim();
  if (!DATE_INPUT_PATTERN.test(trimmed)) {
    return null;
  }

  const [yearPart, monthPart, dayPart] = trimmed.split("-");
  const year = Number.parseInt(yearPart ?? "", 10);
  const month = Number.parseInt(monthPart ?? "", 10);
  const day = Number.parseInt(dayPart ?? "", 10);
  const parsed = new Date(year, month - 1, day);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed.getTime();
};

export const validateActivityDateRange = (input: {
  startDateInput: string;
  endDateInput: string;
}): { startDate: number; endDate: number } | { errorMessage: string } => {
  const startDate = parseDateInputToTimestamp(input.startDateInput);
  const endDate = parseDateInputToTimestamp(input.endDateInput);

  if (startDate === null || endDate === null) {
    return {
      errorMessage: "활동 시작일과 종료일을 올바르게 입력해 주세요.",
    };
  }

  if (startDate > endDate) {
    return {
      errorMessage: "활동 종료일은 시작일보다 빠를 수 없습니다.",
    };
  }

  return { startDate, endDate };
};

export const buildActivityImageSortPayload = (
  images: ActivityImageSortInput[],
): ApiUpdateActivityImageBatchItemInput[] => {
  const normalized = images.map((image) => ({
    id: image.id,
    sortOrder: toNonNegativeInteger(image.sortOrder),
  }));

  const sorted = sortActivityImageInputsBySortOrder(normalized);
  return sorted.map((image) => ({
    imageId: image.id,
    sortOrder: image.sortOrder,
  }));
};
