import { describe, expect, it } from "vitest";

import {
  formatKoreanDate,
  formatKoreanDateCompact,
  formatKoreanDateRange,
  formatKoreanYearRange,
} from "@/shared/utils/date-formatters";

const start = new Date("2025-03-01T12:00:00+09:00").getTime();
const end = new Date("2026-03-01T12:00:00+09:00").getTime();

describe("shared/utils/date-formatters", () => {
  it("formats korean date outputs", () => {
    const formatted = formatKoreanDate(start);
    expect(formatted).toContain("2025");

    const compact = formatKoreanDateCompact(start);
    expect(compact).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
  });

  it("builds date and year ranges", () => {
    const range = formatKoreanDateRange(start, end);
    expect(range).toContain(" - ");
    expect(range).toContain("2025");
    expect(range).toContain("2026");

    expect(formatKoreanYearRange(start, end)).toBe("2025년 - 2026년");
  });
});
