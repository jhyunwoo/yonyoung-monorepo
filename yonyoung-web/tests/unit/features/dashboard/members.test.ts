import { describe, expect, it } from "vitest";

import {
  buildMemberDisplayInitial,
  buildMemberDisplayName,
  compactDisplayName,
  formatKoreanName,
} from "@/features/dashboard/members/display-name";
import {
  buildMemberDirectoryFilterOptions,
  buildMemberGenerationNamesById,
  filterMemberDirectoryUsers,
  readMemberGenerationIds,
  readMemberGenerationNameText,
  readMemberGenerationNames,
} from "@/features/dashboard/members/member-directory";
import {
  buildMemberRoleLabel,
  canEditMemberProfile,
  isExecutiveRole,
} from "@/features/dashboard/members/member-role-label";
import {
  BULK_MEMBER_ROLE_OPTIONS,
  MEMBER_ROLE_OPTIONS,
  coerceBulkMemberRoleValue,
  coerceMemberRoleValue,
} from "@/features/dashboard/members/member-role-options";
import {
  buildDashboardViewerProfile,
  toEditableUserProfile,
} from "@/features/dashboard/members/user-profile";
import type { ApiUser } from "@/shared/contracts/api-contracts";

describe("features/dashboard/members", () => {
  it("builds display names and initials", () => {
    expect(compactDisplayName("  김 연 영  ")).toBe("김연영");
    expect(compactDisplayName(undefined)).toBeNull();

    expect(
      formatKoreanName({ familyName: "김", givenName: "연영", name: "legacy" }),
    ).toBe("김연영");
    expect(formatKoreanName({ familyName: "김", givenName: null, name: "legacy" })).toBe(
      "legacy",
    );
    expect(
      formatKoreanName({ familyName: null, givenName: "연영", name: "legacy" }),
    ).toBe("legacy");
    expect(formatKoreanName({ email: "hello@example.com" })).toBe("hello");
    expect(formatKoreanName({})).toBe("이름 미등록");

    expect(
      buildMemberDisplayName({ familyName: "김", givenName: "연영", name: "legacy" }),
    ).toBe("김연영");
    expect(
      buildMemberDisplayName({ familyName: "김", givenName: null, name: "legacy" }),
    ).toBe("legacy");
    expect(
      buildMemberDisplayName({ familyName: null, givenName: "연영", name: "legacy" }),
    ).toBe("legacy");
    expect(buildMemberDisplayName({ email: "member@example.com" })).toBe("member");
    expect(buildMemberDisplayName({})).toBe("이름 미등록");

    expect(buildMemberDisplayInitial("홍길동")).toBe("홍");
    expect(buildMemberDisplayInitial(" ")).toBe("?");
  });

  it("resolves member role labels and permissions", () => {
    expect(buildMemberRoleLabel("president")).toBe("회장");
    expect(buildMemberRoleLabel("regular_member")).toBe("정회원");
    expect(buildMemberRoleLabel(null)).toBe("역할 미지정");

    expect(isExecutiveRole("manager")).toBe(true);
    expect(isExecutiveRole("regular_member")).toBe(false);

    expect(canEditMemberProfile("president")).toBe(true);
    expect(canEditMemberProfile("manager")).toBe(false);
  });

  it("shares ordered role options and coerces unknown roles safely", () => {
    expect(MEMBER_ROLE_OPTIONS.map((option) => option.value)).toEqual([
      "president",
      "vice_president",
      "manager",
      "new_member",
      "associate_member",
      "regular_member",
      "unverified",
    ]);
    expect(MEMBER_ROLE_OPTIONS.map((option) => option.label)).toEqual([
      "회장",
      "부회장",
      "부장",
      "신입회원",
      "준회원",
      "정회원",
      "미승인",
    ]);

    expect(coerceMemberRoleValue("vice_president")).toBe("vice_president");
    expect(coerceMemberRoleValue("legacy-role")).toBe("regular_member");
    expect(coerceMemberRoleValue(null, "manager")).toBe("manager");

    expect(BULK_MEMBER_ROLE_OPTIONS.map((option) => option.value)).toEqual([
      "manager",
      "new_member",
      "associate_member",
      "regular_member",
      "unverified",
    ]);
    expect(coerceBulkMemberRoleValue("manager")).toBe("manager");
    expect(coerceBulkMemberRoleValue("president")).toBe("regular_member");
  });

  it("normalizes editable profile and viewer profile", () => {
    expect(
      toEditableUserProfile({
        image: "https://img",
        showcaseImageUrls: ["a", 1, "b"],
        familyName: "김",
        givenName: "연영",
        college: "공대",
        department: "컴공",
        studentNumber: "2023000001",
        phoneNumber: "010-1234-5678",
        collaborationAvailable: true,
        personalLink: "https://instagram.com/x",
      }),
    ).toEqual({
      image: "https://img",
      showcaseImageUrls: ["a", "b"],
      familyName: "김",
      givenName: "연영",
      college: "공대",
      department: "컴공",
      studentNumber: "2023000001",
      phoneNumber: "010-1234-5678",
      collaborationAvailable: true,
      personalLink: "https://instagram.com/x",
    });

    const viewer = buildDashboardViewerProfile(
      {
        id: "u1",
        email: "viewer@example.com",
        name: " 뷰어 ",
        role: "regular_member",
        familyName: "",
        givenName: "",
      },
      {
        familyName: "김",
        givenName: "연영",
        image: "https://img/user.jpg",
      },
    );

    expect(viewer).toEqual({
      id: "u1",
      email: "viewer@example.com",
      image: "https://img/user.jpg",
      role: "regular_member",
      displayName: "김연영",
    });

    const fallbackViewer = buildDashboardViewerProfile(
      {
        id: "u2",
        email: "fallback@example.com",
        name: " Legacy User ",
        role: null,
      },
      null,
    );

    expect(fallbackViewer.displayName).toBe("Legacy User");

    const emailFallbackViewer = buildDashboardViewerProfile(
      {
        id: "u3",
        email: "fallback@example.com",
        name: null,
        role: null,
      },
      null,
    );

    expect(emailFallbackViewer.displayName).toBe("fallback");
  });

  it("reads generation labels and filters member directory users", () => {
    const generations = [
      { id: "gen-58", name: "58기", sortOrder: 58 },
      { id: "gen-59", name: "59기", sortOrder: 59 },
    ] as const;
    const generationNamesById = buildMemberGenerationNamesById(generations);
    const generationTarget = {
      generationId: " gen-59 ",
      generationIds: ["gen-58", "gen-59", "", "gen-58"],
    } satisfies Pick<ApiUser, "generationId" | "generationIds">;
    const memberWithMultipleGenerations = {
      generationId: "gen-59",
      generationIds: ["gen-58"],
    } satisfies Pick<ApiUser, "generationId" | "generationIds">;
    const memberWithoutGeneration = {
      generationId: null,
      generationIds: [],
    } satisfies Pick<ApiUser, "generationId" | "generationIds">;

    expect(readMemberGenerationIds(generationTarget)).toEqual(["gen-58", "gen-59"]);
    expect(
      readMemberGenerationNames(memberWithMultipleGenerations, generationNamesById),
    ).toEqual(["58기", "59기"]);
    expect(
      readMemberGenerationNameText(memberWithoutGeneration, generationNamesById),
    ).toBe("없음");

    const users = [
      {
        id: "u1",
        name: "김회장",
        familyName: "김",
        givenName: "회장",
        college: "문과대학",
        department: "국어국문학과",
        studentNumber: "2019000001",
        phoneNumber: "010-1111-1111",
        generationId: "gen-59",
        generationIds: ["gen-59", "gen-58"],
      },
      {
        id: "u2",
        name: "최부원",
        familyName: "최",
        givenName: "부원",
        college: "공과대학",
        department: "컴퓨터과학과",
        studentNumber: "2022000004",
        phoneNumber: "010-4444-4444",
        generationId: "gen-59",
        generationIds: ["gen-59"],
      },
      {
        id: "u3",
        name: "신규회원",
        familyName: "신",
        givenName: "규회원",
        college: "공과대학",
        department: "산업공학과",
        studentNumber: "2023000005",
        phoneNumber: "010-5555-5555",
        generationId: null,
        generationIds: [],
      },
    ] as unknown as ApiUser[];

    expect(buildMemberDirectoryFilterOptions(users, generations)).toEqual({
      colleges: [
        { value: "공과대학", label: "공과대학" },
        { value: "문과대학", label: "문과대학" },
      ],
      departments: [
        { value: "국어국문학과", label: "국어국문학과" },
        { value: "산업공학과", label: "산업공학과" },
        { value: "컴퓨터과학과", label: "컴퓨터과학과" },
      ],
      generations: [
        { value: "gen-59", label: "59기" },
        { value: "gen-58", label: "58기" },
      ],
    });

    expect(
      filterMemberDirectoryUsers(users, {
        query: "최부원 0104444",
        college: "",
        department: "",
        generationId: "",
      }).map((user) => user.id),
    ).toEqual(["u2"]);
    expect(
      filterMemberDirectoryUsers(users, {
        query: "",
        college: "공과대학",
        department: "컴퓨터과학과",
        generationId: "gen-59",
      }).map((user) => user.id),
    ).toEqual(["u2"]);
    expect(
      filterMemberDirectoryUsers(users, {
        query: "2023000005",
        college: "",
        department: "",
        generationId: "",
      }).map((user) => user.id),
    ).toEqual(["u3"]);
  });
});
