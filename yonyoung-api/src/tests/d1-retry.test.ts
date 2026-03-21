import { describe, expect, it, vi } from "vitest";
import {
  isRetryableD1WriteError,
  runWithD1WriteRetry,
} from "../lib/db/d1-retry";

describe("d1 write retry", () => {
  it("재시도 가능한 오류는 지수 백오프 후 재시도한다", async () => {
    const sleepCalls: number[] = [];
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("D1_ERROR: database is locked"))
      .mockRejectedValueOnce(new Error("Too Many Requests"))
      .mockResolvedValueOnce("ok");

    const result = await runWithD1WriteRetry(operation, {
      maxRetries: 3,
      baseDelayMs: 20,
      maxDelayMs: 100,
      jitterRatio: 0,
      sleep: async (ms) => {
        sleepCalls.push(ms);
      },
    });

    expect(result).toBe("ok");
    expect(operation).toHaveBeenCalledTimes(3);
    expect(sleepCalls).toEqual([20, 40]);
  });

  it("재시도 불가능한 오류는 즉시 예외를 던진다", async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(new Error("foreign key constraint failed"));
    const sleep = vi.fn(async () => undefined);

    await expect(
      runWithD1WriteRetry(operation, {
        maxRetries: 3,
        sleep,
      }),
    ).rejects.toThrow("foreign key constraint failed");

    expect(operation).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("재시도 가능한 D1 오류를 식별한다", () => {
    expect(isRetryableD1WriteError(new Error("database is locked"))).toBe(true);
    expect(isRetryableD1WriteError(new Error("temporarily unavailable"))).toBe(
      true,
    );
    expect(isRetryableD1WriteError(new Error("constraint failed"))).toBe(false);
    expect(isRetryableD1WriteError("database is locked")).toBe(false);
  });

  it("재시도 횟수를 소진하면 예외를 던진다", async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(new Error("D1_ERROR: database is locked"));
    const sleep = vi.fn(async () => undefined);

    await expect(
      runWithD1WriteRetry(operation, {
        maxRetries: 1,
        jitterRatio: 0,
        sleep,
      }),
    ).rejects.toThrow("D1_ERROR: database is locked");

    expect(operation).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("잘못된 옵션 값은 기본값으로 보정하고 onRetry 콜백을 호출한다", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(1);
    const sleepCalls: number[] = [];
    const onRetry = vi.fn();
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("database is locked"))
      .mockResolvedValueOnce("ok");

    const result = await runWithD1WriteRetry(operation, {
      maxRetries: -1,
      baseDelayMs: -10,
      maxDelayMs: -10,
      jitterRatio: 3,
      sleep: async (ms) => {
        sleepCalls.push(ms);
      },
      onRetry,
    });

    expect(result).toBe("ok");
    expect(sleepCalls).toEqual([50]);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(
      expect.objectContaining({
        attempt: 1,
        delayMs: 50,
      }),
    );

    randomSpy.mockRestore();
  });
});
