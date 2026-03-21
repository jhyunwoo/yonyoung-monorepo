import type { ApiGeneration } from "@/shared/contracts/api-contracts";

type GenerationLike = Pick<ApiGeneration, "name">;

const DASHBOARD_PATH_PREFIX = "/dashboard";

const normalizeGenerationName = (name: string): string => name.trim();

const toDashboardGenerationRouteName = (generation: GenerationLike): string => {
  const normalizedName = normalizeGenerationName(generation.name);
  return encodeURIComponent(normalizedName);
};

export const buildDashboardGenerationPath = (generation: GenerationLike): string => {
  return `${DASHBOARD_PATH_PREFIX}/${toDashboardGenerationRouteName(generation)}`;
};

const decodeDashboardGenerationRouteName = (routeName: string): string => {
  const trimmedRouteName = routeName.trim();
  if (trimmedRouteName.length === 0) {
    return "";
  }

  try {
    return decodeURIComponent(trimmedRouteName).trim();
  } catch {
    return trimmedRouteName;
  }
};

export const isSameGenerationRouteName = (
  leftName: string,
  rightRouteName: string,
): boolean => {
  return (
    normalizeGenerationName(leftName) ===
    decodeDashboardGenerationRouteName(rightRouteName)
  );
};
