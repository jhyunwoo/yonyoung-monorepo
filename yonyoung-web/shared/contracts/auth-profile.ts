export const REQUIRED_PROFILE_KEYS = [
  "familyName",
  "givenName",
  "college",
  "department",
  "studentNumber",
  "phoneNumber",
] as const;

export type RequiredProfileKey = (typeof REQUIRED_PROFILE_KEYS)[number];

export const STUDENT_NUMBER_REGEX = /^\d{10}$/;
export const KOREAN_MOBILE_PHONE_REGEX = /^010-\d{4}-\d{4}$/;

export const formatKoreanMobilePhoneNumber = (value: string): string => {
  const digitsOnly = value.replace(/\D/g, "").slice(0, 11);
  if (digitsOnly.length <= 3) {
    return digitsOnly;
  }
  if (digitsOnly.length <= 7) {
    return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)}`;
  }
  return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 7)}-${digitsOnly.slice(7)}`;
};

export const isKoreanMobilePhoneNumber = (value: string): boolean =>
  KOREAN_MOBILE_PHONE_REGEX.test(value.trim());

const readProfileField = (
  user: Record<string, unknown>,
  key: RequiredProfileKey,
): string | null => {
  const value = user[key];
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const hasCompletedRequiredProfileFields = (
  user: Record<string, unknown> | null | undefined,
): boolean => {
  if (!user) {
    return false;
  }

  return REQUIRED_PROFILE_KEYS.every((key) => readProfileField(user, key) !== null);
};
