import { redirect } from "next/navigation";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import {
  getAccessibleDashboardGenerationOptions,
  resolveGenerationOptionFromRouteName,
  type DashboardGenerationOption,
} from "@/features/dashboard/generation/generation-options";

type GenerationRouteParams = Promise<{ generationName: string }>;

export const requireDashboardGeneration = async (
  params: GenerationRouteParams,
): Promise<DashboardGenerationOption> => {
  const { generationName } = await params;
  const session = await serverAuthGuard.requireSession();
  const generationOptions = await getAccessibleDashboardGenerationOptions(session);
  const generation = resolveGenerationOptionFromRouteName(
    generationOptions,
    generationName,
  );

  if (!generation) {
    redirect("/dashboard");
  }

  return generation;
};
