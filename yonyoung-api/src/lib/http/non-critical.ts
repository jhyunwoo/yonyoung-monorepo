import type { Context } from "hono";
import type HonoAppType from "../../types/honoAppType";
import { logError } from "../../middlewares/logger";
import { runInBackground, type BackgroundTaskOptions } from "./background-task";

const toLabeledError = (label: string, error: unknown): Error => {
  if (error instanceof Error) {
    return new Error(`[non-critical:${label}] ${error.message}`);
  }

  return new Error(`[non-critical:${label}] ${String(error)}`);
};

export const runNonCriticalTask = async (
  c: Context<HonoAppType>,
  label: string,
  task: Promise<unknown> | (() => Promise<unknown> | unknown),
  options?: BackgroundTaskOptions,
): Promise<void> => {
  await runInBackground(c, task, {
    ...options,
    onError: (error) => {
      logError(c, toLabeledError(label, error));
      options?.onError?.(error);
    },
  });
};
