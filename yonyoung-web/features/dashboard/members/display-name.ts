// ---------------------------------------------------------------------------
// Consolidated display name utilities
// ---------------------------------------------------------------------------

type MemberNameLike = {
  familyName?: string | null;
  givenName?: string | null;
  name?: string | null;
  email?: string | null;
};

export const compactDisplayName = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const compacted = value.replace(/\s+/g, "").trim();
  return compacted.length > 0 ? compacted : null;
};

const toTrimmedOrNull = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/** 성(familyName)+이름(givenName) 우선, 없으면 name, 그다음 email local-part fallback. */
export const formatKoreanName = (
  user: Pick<MemberNameLike, "familyName" | "givenName" | "name" | "email">,
): string => {
  const familyName = compactDisplayName(user.familyName);
  const givenName = compactDisplayName(user.givenName);

  if (familyName && givenName) {
    return `${familyName}${givenName}`;
  }

  const name = toTrimmedOrNull(user.name);
  if (name) {
    return name;
  }

  const email = toTrimmedOrNull(user.email);
  if (email) {
    const localPart = email.split("@")[0]?.trim();
    if (localPart && localPart.length > 0) {
      return localPart;
    }
  }

  return "이름 미등록";
};

/** 성+이름 우선, 미등록 시 name, email local-part 순으로 표시 이름을 결정. */
export const buildMemberDisplayName = (member: MemberNameLike): string => {
  const familyName = compactDisplayName(member.familyName);
  const givenName = compactDisplayName(member.givenName);

  if (familyName && givenName) {
    return `${familyName}${givenName}`;
  }

  const name = toTrimmedOrNull(member.name);
  if (name) {
    return name;
  }

  const email = toTrimmedOrNull(member.email);
  if (email) {
    const localPart = toTrimmedOrNull(email.split("@")[0]);
    if (localPart) {
      return localPart;
    }
  }

  return "이름 미등록";
};

/** 표시 이름의 첫 글자를 추출. */
export const buildMemberDisplayInitial = (displayName: string): string => {
  const trimmed = displayName.trim();
  if (trimmed.length === 0) {
    return "?";
  }

  return Array.from(trimmed)[0] ?? "?";
};
