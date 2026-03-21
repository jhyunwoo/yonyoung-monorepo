import type {
  ApiCreateGenerationInput,
  ApiGeneration,
  ApiUser,
} from "@/shared/contracts/api-contracts";
import { isUnverifiedRole } from "@/features/auth/model/auth-shared";
import { buildMemberDisplayName } from "@/features/dashboard/members/display-name";

export const USER_ROLE_FILTER_ALL = "all";
export const USER_ROLE_FILTER_NONE = "__none__";

type GenerationFormInput = {
  name: string;
  sortOrderInput: string;
  startDateInput: string;
  endDateInput: string;
};

const parseDateInputToTimestamp = (input: string): number | null => {
  const parts = input.split("-");
  const yearText = parts[0];
  const monthText = parts[1];
  const dayText = parts[2];

  if (
    parts.length !== 3 ||
    yearText === undefined ||
    monthText === undefined ||
    dayText === undefined
  ) {
    return null;
  }

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    yearText.length !== 4 ||
    monthText.length !== 2 ||
    dayText.length !== 2
  ) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed.getTime();
};

export const formatTimestampToDateInput = (timestampMs: number): string => {
  const date = new Date(timestampMs);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const validateGenerationFormInput = (
  input: GenerationFormInput,
): { payload: ApiCreateGenerationInput } | { errorMessage: string } => {
  const name = input.name.trim();
  if (name.length === 0) {
    return { errorMessage: "기수 이름을 입력해 주세요." };
  }

  const sortOrder = Number(input.sortOrderInput);
  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    return { errorMessage: "정렬 순서는 0 이상의 정수여야 합니다." };
  }

  const startDate = parseDateInputToTimestamp(input.startDateInput);
  const endDate = parseDateInputToTimestamp(input.endDateInput);
  if (startDate === null || endDate === null) {
    return { errorMessage: "기수 시작일/종료일 형식을 확인해 주세요." };
  }

  if (startDate > endDate) {
    return { errorMessage: "기수 시작일은 종료일보다 늦을 수 없습니다." };
  }

  return {
    payload: {
      name,
      sortOrder,
      startDate,
      endDate,
    },
  };
};

export const sortGenerationsBySortOrderDesc = (
  generations: ApiGeneration[],
): ApiGeneration[] =>
  [...generations].sort((left, right) => right.sortOrder - left.sortOrder);

export const readNormalizedGenerationIds = (
  user: Pick<ApiUser, "generationId" | "generationIds">,
): string[] => {
  const nextIds = new Set<string>();
  for (const generationId of user.generationIds ?? []) {
    const trimmed = generationId.trim();
    if (trimmed.length > 0) {
      nextIds.add(trimmed);
    }
  }

  if (typeof user.generationId === "string") {
    const trimmed = user.generationId.trim();
    if (trimmed.length > 0) {
      nextIds.add(trimmed);
    }
  }

  return [...nextIds];
};

export const mergeGenerationId = (
  currentGenerationIds: readonly string[],
  generationId: string,
): string[] => {
  const trimmedTarget = generationId.trim();
  if (trimmedTarget.length === 0) {
    return [...currentGenerationIds];
  }

  const nextGenerationIds = new Set(
    currentGenerationIds.map((id) => id.trim()).filter((id) => id.length > 0),
  );
  nextGenerationIds.add(trimmedTarget);
  return [...nextGenerationIds];
};

export const removeGenerationId = (
  currentGenerationIds: readonly string[],
  generationId: string,
): string[] => {
  const trimmedTarget = generationId.trim();
  if (trimmedTarget.length === 0) {
    return [...currentGenerationIds];
  }

  return currentGenerationIds
    .map((id) => id.trim())
    .filter((id) => id.length > 0 && id !== trimmedTarget);
};

export const filterAssignableUsers = (input: {
  users: ApiUser[];
  nameQuery: string;
  roleFilter: string;
}): ApiUser[] => {
  const normalizedQuery = input.nameQuery.trim().toLowerCase();

  return input.users
    .filter((user) => !isUnverifiedRole(user.role))
    .filter((user) => {
      if (input.roleFilter === USER_ROLE_FILTER_ALL) {
        return true;
      }

      if (input.roleFilter === USER_ROLE_FILTER_NONE) {
        return !user.role;
      }

      return user.role === input.roleFilter;
    })
    .filter((user) => {
      if (normalizedQuery.length === 0) {
        return true;
      }

      const displayName = buildMemberDisplayName(user).toLowerCase();
      const rawName = user.name.toLowerCase();
      return displayName.includes(normalizedQuery) || rawName.includes(normalizedQuery);
    })
    .sort((left, right) =>
      buildMemberDisplayName(left).localeCompare(buildMemberDisplayName(right), "ko"),
    );
};
