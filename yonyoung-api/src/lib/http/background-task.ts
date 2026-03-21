import type { Context } from "hono";
import type HonoAppType from "../../types/honoAppType";

type FallbackMode = "await" | "fire-and-forget";

export type BackgroundTaskOptions = {
  fallback?: FallbackMode;
  timeoutMs?: number;
  onError?: (error: unknown) => void;
};

type BackgroundTaskInput = Promise<unknown> | (() => Promise<unknown> | unknown);

const swallowError = (error: unknown, onError?: (error: unknown) => void) => {
  if (onError) {
    onError(error);
  }
};

const resolveExecutionContext = (
  c: Context<HonoAppType>,
): ExecutionContext | undefined => {
  try {
    return (c as unknown as { executionCtx?: ExecutionContext }).executionCtx;
  } catch {
    return undefined;
  }
};

export const runInBackground = async (
  c: Context<HonoAppType>,
  task: BackgroundTaskInput,
  options?: BackgroundTaskOptions,
): Promise<void> => {
  const executeTask = (): Promise<unknown> => {
    if (typeof task === "function") {
      try {
        return Promise.resolve(task());
      } catch (error) {
        return Promise.reject(error);
      }
    }

    return task;
  };

  const applyTimeout = (promise: Promise<unknown>): Promise<unknown> => {
    const timeoutMs = options?.timeoutMs;
    if (!timeoutMs || timeoutMs <= 0) {
      return promise;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`Background task timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
      if (timer) {
        clearTimeout(timer);
      }
    });
  };

  const fallback = options?.fallback ?? "fire-and-forget";
  const wrappedTask = applyTimeout(executeTask()).catch((error) => {
    swallowError(error, options?.onError);
  });

  const executionCtx = resolveExecutionContext(c);
  if (executionCtx && typeof executionCtx.waitUntil === "function") {
    executionCtx.waitUntil(wrappedTask);
    return;
  }

  if (fallback === "await") {
    await wrappedTask;
    return;
  }

  void wrappedTask;
};
