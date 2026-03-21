import type { AuthUser } from "@/features/auth/model/auth-shared";
import {
  formatKoreanName,
} from "@/features/dashboard/members/display-name";

type EditableUserProfile = {
  image: string;
  showcaseImageUrls: string[];
  familyName: string;
  givenName: string;
  college: string;
  department: string;
  studentNumber: string;
  phoneNumber: string;
  collaborationAvailable: boolean;
  personalLink: string;
};

type EditableUserProfileKey = keyof EditableUserProfile;

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  return value as Record<string, unknown>;
};

const readString = (
  source: Record<string, unknown> | null | undefined,
  key: EditableUserProfileKey,
): string => {
  if (!source) {
    return "";
  }

  const value = source[key];
  return typeof value === "string" ? value : "";
};

const readTrimmedStringByKey = (
  source: Record<string, unknown> | null | undefined,
  key: EditableUserProfileKey,
): string | null => {
  const value = readString(source, key).trim();
  return value.length > 0 ? value : null;
};

const readTrimmedSessionString = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const readTrimmedRecordString = (
  source: Record<string, unknown> | null | undefined,
  key: string,
): string | null => {
  if (!source) {
    return null;
  }

  const value = source[key];
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const readBooleanByKey = (
  source: Record<string, unknown> | null | undefined,
  key: EditableUserProfileKey,
): boolean => {
  if (!source) {
    return false;
  }

  const value = source[key];
  return value === true;
};

const readStringArrayByKey = (
  source: Record<string, unknown> | null | undefined,
  key: EditableUserProfileKey,
): string[] => {
  if (!source) {
    return [];
  }

  const value = source[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
};

export const toEditableUserProfile = (value: unknown): EditableUserProfile => {
  const source = asRecord(value);

  return {
    image: readString(source, "image"),
    showcaseImageUrls: readStringArrayByKey(source, "showcaseImageUrls"),
    familyName: readString(source, "familyName"),
    givenName: readString(source, "givenName"),
    college: readString(source, "college"),
    department: readString(source, "department"),
    studentNumber: readString(source, "studentNumber"),
    phoneNumber: readString(source, "phoneNumber"),
    collaborationAvailable: readBooleanByKey(source, "collaborationAvailable"),
    personalLink: readString(source, "personalLink"),
  };
};

type DashboardViewerProfile = {
  id: string;
  email: string;
  image: string | null;
  displayName: string;
  role: string | null;
};

export const buildDashboardViewerProfile = (
  sessionUser: AuthUser,
  profile: Record<string, unknown> | null,
): DashboardViewerProfile => {
  const familyName =
    readTrimmedStringByKey(profile, "familyName") ??
    readTrimmedSessionString(sessionUser.familyName);
  const givenName =
    readTrimmedStringByKey(profile, "givenName") ??
    readTrimmedSessionString(sessionUser.givenName);
  const name =
    readTrimmedRecordString(profile, "name") ??
    readTrimmedSessionString(sessionUser.name);
  const image =
    readTrimmedStringByKey(profile, "image") ??
    readTrimmedSessionString(sessionUser.image);
  const profileId = readTrimmedRecordString(profile, "id");

  const displayName = formatKoreanName({
    familyName,
    givenName,
    name,
    email: sessionUser.email,
  });

  return {
    id: profileId ?? sessionUser.id,
    email: sessionUser.email,
    image,
    role: sessionUser.role ?? null,
    displayName,
  };
};
