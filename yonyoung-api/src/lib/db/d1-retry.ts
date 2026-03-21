const RETRYABLE_D1_PATTERNS = [
  /database is locked/i,
  /temporarily unavailable/i,
  /too many requests/i,
  /timeout/i,
  /network error/i,
  /storage busy/i,
  /d1_error/i,
] as const;

export type D1WriteRetryOptions = {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterRatio?: number;
  sleep?: (ms: number) => Promise<void>;
  isRetryableError?: (error: unknown) => boolean;
  onRetry?: (input: {
    attempt: number;
    delayMs: number;
    error: unknown;
  }) => void;
};

const defaultSleep = async (ms: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
};

const normalizeNumber = (value: number, fallback: number): number =>
  Number.isFinite(value) && value >= 0 ? value : fallback;

const computeBackoffDelay = (
  attempt: number,
  input: {
    baseDelayMs: number;
    maxDelayMs: number;
    jitterRatio: number;
  },
): number => {
  const exponential = Math.min(
    input.maxDelayMs,
    input.baseDelayMs * 2 ** attempt,
  );
  const jitter = exponential * input.jitterRatio * Math.random();
  return Math.round(exponential + jitter);
};

export const isRetryableD1WriteError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  return RETRYABLE_D1_PATTERNS.some((pattern) => pattern.test(error.message));
};

export const runWithD1WriteRetry = async <T>(
  operation: () => Promise<T>,
  options?: D1WriteRetryOptions,
): Promise<T> => {
  const maxRetries = normalizeNumber(options?.maxRetries ?? 2, 2);
  const baseDelayMs = normalizeNumber(options?.baseDelayMs ?? 25, 25);
  const maxDelayMs = normalizeNumber(options?.maxDelayMs ?? 500, 500);
  const jitterRatio = Math.min(
    1,
    Math.max(0, normalizeNumber(options?.jitterRatio ?? 0.2, 0.2)),
  );
  const sleep = options?.sleep ?? defaultSleep;
  const isRetryable = options?.isRetryableError ?? isRetryableD1WriteError;

  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= maxRetries || !isRetryable(error)) {
        throw error;
      }

      const delayMs = computeBackoffDelay(attempt, {
        baseDelayMs,
        maxDelayMs,
        jitterRatio,
      });
      options?.onRetry?.({
        attempt: attempt + 1,
        delayMs,
        error,
      });
      await sleep(delayMs);
      attempt += 1;
    }
  }
};
