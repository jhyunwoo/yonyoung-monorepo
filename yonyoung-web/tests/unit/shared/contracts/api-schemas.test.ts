import { describe, expect, it } from "vitest";

import { apiUpdateSiteSettingsInputSchema } from "@/shared/contracts/api-schemas";

describe("shared/contracts/api-schemas", () => {
  it("accepts donateAccountNumber with digits and dashes up to 50 chars", () => {
    const validAccountNumber = `${"1234-".repeat(9)}12345`; // length 50

    const parsed = apiUpdateSiteSettingsInputSchema.parse({
      donateAccountNumber: validAccountNumber,
    });

    expect(parsed.donateAccountNumber).toBe(validAccountNumber);
  });

  it("rejects donateAccountNumber longer than 50 chars", () => {
    const tooLongAccountNumber = `${"1234-".repeat(10)}1`; // length 51

    const parsed = apiUpdateSiteSettingsInputSchema.safeParse({
      donateAccountNumber: tooLongAccountNumber,
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects donateAccountNumber containing characters other than digits and dash", () => {
    const parsed = apiUpdateSiteSettingsInputSchema.safeParse({
      donateAccountNumber: "123-45A-678",
    });

    expect(parsed.success).toBe(false);
  });
});
