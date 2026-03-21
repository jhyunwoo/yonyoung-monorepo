import { describe, expect, it } from "vitest";
import { z } from "zod";
import { mapErrorToAppError } from "../../src/shared/errors/mapError";

describe("mapErrorToAppError", () => {
  it("maps Zod errors to validation app errors", () => {
    const parsed = z.object({ id: z.string().uuid() }).safeParse({ id: "x" });
    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }

    const mapped = mapErrorToAppError(parsed.error);
    expect(mapped.httpStatus).toBe(400);
    expect(mapped.code).toBe("VALIDATION_ERROR");
  });

  it("maps sqlite constraint messages to conflict", () => {
    const mapped = mapErrorToAppError(
      new Error("SQLITE_CONSTRAINT: unique constraint failed"),
    );

    expect(mapped.httpStatus).toBe(409);
    expect(mapped.code).toBe("DB_ERROR");
  });

  it("maps r2 missing key messages to not found", () => {
    const mapped = mapErrorToAppError(
      new Error("NoSuchKey: The specified key does not exist"),
    );

    expect(mapped.httpStatus).toBe(404);
    expect(mapped.code).toBe("R2_ERROR");
  });

  it("maps unknown errors to internal", () => {
    const mapped = mapErrorToAppError(new Error("unexpected"));

    expect(mapped.httpStatus).toBe(500);
    expect(mapped.code).toBe("INTERNAL_ERROR");
  });
});
