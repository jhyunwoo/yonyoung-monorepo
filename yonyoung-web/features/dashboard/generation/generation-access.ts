import { isPresidentOrVicePresidentRole } from "@/features/auth/model/auth-shared";
import type { ApiGeneration } from "@/shared/contracts/api-contracts";

type GenerationLike = Pick<ApiGeneration, "id" | "name" | "sortOrder">;
type SessionWithGenerationRole =
  | {
      user?: Record<string, unknown> | null;
    }
  | null
  | undefined;

const sortBySortOrder = <T extends GenerationLike>(generations: T[]): T[] => {
  return [...generations].sort((a, b) => {
    if (a.sortOrder === b.sortOrder) {
      return a.name.localeCompare(b.name);
    }
    return a.sortOrder - b.sortOrder;
  });
};

export const getAccessibleGenerations = <T extends GenerationLike>(
  session: SessionWithGenerationRole,
  generations: T[],
): T[] => {
  const user = session?.user;
  if (!user || typeof user !== "object") {
    return [];
  }

  const sorted = sortBySortOrder(generations);
  if (isPresidentOrVicePresidentRole(user.role)) {
    return sorted;
  }

  const ownGenerationIds = Array.isArray(user.generationIds)
    ? user.generationIds.filter(
        (generationId): generationId is string =>
          typeof generationId === "string" && generationId.length > 0,
      )
    : [];

  if (typeof user.generationId === "string" && user.generationId.length > 0) {
    ownGenerationIds.push(user.generationId);
  }

  if (ownGenerationIds.length === 0) {
    return [];
  }

  const ownGenerationIdSet = new Set(ownGenerationIds);
  return sorted.filter((generation) => ownGenerationIdSet.has(generation.id));
};
