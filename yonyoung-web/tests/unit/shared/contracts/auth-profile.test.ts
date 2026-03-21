import { describe, expect, it } from "vitest";

import {
  formatKoreanMobilePhoneNumber,
  hasCompletedRequiredProfileFields,
  isKoreanMobilePhoneNumber,
} from "@/shared/contracts/auth-profile";

describe("shared/contracts/auth-profile", () => {
  it("formats korean mobile phone numbers", () => {
    expect(formatKoreanMobilePhoneNumber("0101234")).toBe("010-1234");
    expect(formatKoreanMobilePhoneNumber("01012345678")).toBe("010-1234-5678");
    expect(formatKoreanMobilePhoneNumber("010-1234-5678-999")).toBe("010-1234-5678");
  });

  it("validates phone format", () => {
    expect(isKoreanMobilePhoneNumber("010-1234-5678")).toBe(true);
    expect(isKoreanMobilePhoneNumber("01012345678")).toBe(false);
    expect(isKoreanMobilePhoneNumber("011-1234-5678")).toBe(false);
  });

  it("checks required profile field completion", () => {
    const complete = {
      familyName: "김",
      givenName: "연영",
      college: "공과대학",
      department: "컴퓨터과학과",
      studentNumber: "2023000001",
      phoneNumber: "010-1234-5678",
    };
    expect(hasCompletedRequiredProfileFields(complete)).toBe(true);

    expect(
      hasCompletedRequiredProfileFields({
        ...complete,
        department: "   ",
      }),
    ).toBe(false);
    expect(hasCompletedRequiredProfileFields(null)).toBe(false);
    expect(hasCompletedRequiredProfileFields(undefined)).toBe(false);
  });
});
