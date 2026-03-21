import type { ApiGeneration } from "@/shared/contracts/api-contracts";
import { getAccessibleGenerations } from "@/features/dashboard/generation/generation-access";
import { fetchGenerationsFromServer } from "@/features/dashboard/generation/generation-fetcher";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import type { AuthSession } from "@/features/auth/model/auth-shared";
import {
  buildDashboardGenerationPath,
  isSameGenerationRouteName,
} from "@/features/dashboard/generation/dashboard-generation-route";
import { asRecord } from "@/shared/http/http";

export type DashboardGenerationOption = Pick<
  ApiGeneration,
  "id" | "name" | "sortOrder" | "startDate" | "endDate" | "updatedAt" | "updatedBy"
> & {
  path: string;
};

const readTrimmedOrNull = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const withCurrentUserUpdatedByFallback = (
  generation: Pick<
    ApiGeneration,
    "id" | "name" | "sortOrder" | "startDate" | "endDate" | "updatedAt" | "updatedBy"
  >,
  currentUser: {
    id: string;
    name: string | null;
    familyName: string | null;
    givenName: string | null;
  },
): Pick<
  ApiGeneration,
  "id" | "name" | "sortOrder" | "startDate" | "endDate" | "updatedAt" | "updatedBy"
> => {
  if (!generation.updatedBy || generation.updatedBy.id !== currentUser.id) {
    return generation;
  }

  const resolvedName =
    readTrimmedOrNull(generation.updatedBy.name) ??
    currentUser.name ??
    generation.updatedBy.name;

  return {
    ...generation,
    updatedBy: {
      ...generation.updatedBy,
      name: resolvedName,
      familyName: generation.updatedBy.familyName ?? currentUser.familyName,
      givenName: generation.updatedBy.givenName ?? currentUser.givenName,
    },
  };
};

const toGenerationOption = (
  generation: Pick<
    ApiGeneration,
    "id" | "name" | "sortOrder" | "startDate" | "endDate" | "updatedAt" | "updatedBy"
  >,
): DashboardGenerationOption => ({
  id: generation.id,
  name: generation.name,
  sortOrder: generation.sortOrder,
  startDate: generation.startDate,
  endDate: generation.endDate,
  updatedAt: generation.updatedAt,
  updatedBy: generation.updatedBy,
  path: buildDashboardGenerationPath(generation),
});

export const getAccessibleDashboardGenerationOptions = async (
  session: AuthSession,
  options?: {
    profile?: Record<string, unknown> | null;
  },
): Promise<DashboardGenerationOption[]> => {
  const profilePromise =
    options?.profile !== undefined
      ? Promise.resolve(options.profile)
      : serverAuthGuard.getCurrentUserProfile(session);

  let profile = await profilePromise;
  if (!profile && options?.profile === undefined) {
    profile = await serverAuthGuard.getCurrentUserProfile(session);
  }
  const generations = await fetchGenerationsFromServer();
  const mergedUser = {
    ...session.user,
    ...(asRecord(profile) ?? {}),
  };
  const currentUserProfile = {
    id: session.user.id,
    name: readTrimmedOrNull(mergedUser.name),
    familyName: readTrimmedOrNull(mergedUser.familyName),
    givenName: readTrimmedOrNull(mergedUser.givenName),
  };

  const accessibleGenerations = getAccessibleGenerations(
    {
      user: mergedUser,
    },
    generations,
  );

  return accessibleGenerations
    .map((generation) =>
      withCurrentUserUpdatedByFallback(generation, currentUserProfile),
    )
    .map(toGenerationOption);
};

export const resolveGenerationOptionFromRouteName = (
  options: readonly DashboardGenerationOption[],
  generationRouteName: string,
): DashboardGenerationOption | null => {
  return (
    options.find((option) =>
      isSameGenerationRouteName(option.name, generationRouteName),
    ) ?? null
  );
};
