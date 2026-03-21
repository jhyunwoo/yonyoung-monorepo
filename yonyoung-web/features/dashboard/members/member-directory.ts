import type { ApiGeneration, ApiUser } from "@/shared/contracts/api-contracts";
import { buildMemberDisplayName } from "@/features/dashboard/members/display-name";

const koreanCollator = new Intl.Collator("ko");

const toTrimmedOrNull = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeSearchText = (value: string | null | undefined): string => {
  const trimmed = toTrimmedOrNull(value);
  if (!trimmed) {
    return "";
  }

  return trimmed.replace(/\s+/g, "").toLowerCase();
};

const normalizeDigits = (value: string | null | undefined): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\D+/g, "");
};

const sortTextValues = (values: Iterable<string>): string[] =>
  [...values].sort((left, right) => koreanCollator.compare(left, right));

const buildSearchTokens = (
  query: string,
): Array<{
  text: string;
  digits: string;
}> =>
  query
    .trim()
    .split(/\s+/)
    .map((token) => ({
      text: normalizeSearchText(token),
      digits: normalizeDigits(token),
    }))
    .filter((token) => token.text.length > 0 || token.digits.length > 0);

type MemberGenerationLike = Pick<ApiUser, "generationId" | "generationIds">;

export type MemberDirectoryFilterOption = {
  value: string;
  label: string;
};

export type MemberDirectoryFilterOptions = {
  colleges: MemberDirectoryFilterOption[];
  departments: MemberDirectoryFilterOption[];
  generations: MemberDirectoryFilterOption[];
};

export const readMemberGenerationIds = (member: MemberGenerationLike): string[] => {
  const values = [
    ...(Array.isArray(member.generationIds) ? member.generationIds : []),
    member.generationId,
  ];

  const uniqueIds = new Set<string>();
  for (const value of values) {
    const trimmed = toTrimmedOrNull(value);
    if (!trimmed) {
      continue;
    }

    uniqueIds.add(trimmed);
  }

  return [...uniqueIds];
};

export const buildMemberGenerationNamesById = (
  generations: Array<Pick<ApiGeneration, "id" | "name">>,
): Record<string, string> =>
  generations.reduce<Record<string, string>>((acc, generation) => {
    acc[generation.id] = generation.name;
    return acc;
  }, {});

export const readMemberGenerationNames = (
  member: MemberGenerationLike,
  generationNamesById: Record<string, string>,
): string[] => {
  const ids = readMemberGenerationIds(member);
  return ids.map((id) => generationNamesById[id] ?? "알 수 없는 기수");
};

export const readMemberGenerationNameText = (
  member: MemberGenerationLike,
  generationNamesById: Record<string, string>,
): string => {
  const names = readMemberGenerationNames(member, generationNamesById);
  return names.length > 0 ? names.join(", ") : "없음";
};

export const buildMemberDirectoryFilterOptions = (
  users: ApiUser[],
  generations: Array<Pick<ApiGeneration, "id" | "name" | "sortOrder">>,
): MemberDirectoryFilterOptions => {
  const colleges = new Set<string>();
  const departments = new Set<string>();
  const usedGenerationIds = new Set<string>();

  for (const user of users) {
    const college = toTrimmedOrNull(user.college);
    const department = toTrimmedOrNull(user.department);

    if (college) {
      colleges.add(college);
    }

    if (department) {
      departments.add(department);
    }

    for (const generationId of readMemberGenerationIds(user)) {
      usedGenerationIds.add(generationId);
    }
  }

  const generationOptions = generations
    .filter((generation) => usedGenerationIds.has(generation.id))
    .sort((left, right) => {
      const sortOrderDiff = right.sortOrder - left.sortOrder;
      if (sortOrderDiff !== 0) {
        return sortOrderDiff;
      }

      return koreanCollator.compare(left.name, right.name);
    })
    .map((generation) => ({
      value: generation.id,
      label: generation.name,
    }));

  return {
    colleges: sortTextValues(colleges).map((value) => ({ value, label: value })),
    departments: sortTextValues(departments).map((value) => ({ value, label: value })),
    generations: generationOptions,
  };
};

const matchesSearchQuery = (user: ApiUser, query: string): boolean => {
  const tokens = buildSearchTokens(query);
  if (tokens.length === 0) {
    return true;
  }

  const textFields = [
    buildMemberDisplayName(user),
    user.name,
    user.studentNumber,
    user.phoneNumber,
  ]
    .map((value) => normalizeSearchText(value))
    .filter((value) => value.length > 0);
  const digitFields = [user.studentNumber, user.phoneNumber]
    .map((value) => normalizeDigits(value))
    .filter((value) => value.length > 0);

  return tokens.every((token) => {
    if (token.text.length > 0 && textFields.some((field) => field.includes(token.text))) {
      return true;
    }

    return token.digits.length > 0 &&
      digitFields.some((field) => field.includes(token.digits));


  });
};

export const filterMemberDirectoryUsers = (
  users: ApiUser[],
  input: {
    query: string;
    college: string;
    department: string;
    generationId: string;
  },
): ApiUser[] =>
  users.filter((user) => {
    if (!matchesSearchQuery(user, input.query)) {
      return false;
    }

    if (input.college) {
      const college = toTrimmedOrNull(user.college);
      if (college !== input.college) {
        return false;
      }
    }

    if (input.department) {
      const department = toTrimmedOrNull(user.department);
      if (department !== input.department) {
        return false;
      }
    }

    if (input.generationId) {
      const generationIds = readMemberGenerationIds(user);
      if (!generationIds.includes(input.generationId)) {
        return false;
      }
    }

    return true;
  });
