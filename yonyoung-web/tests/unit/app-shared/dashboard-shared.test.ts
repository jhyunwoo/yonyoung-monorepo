import { describe, expect, it } from "vitest";

import { AdminApiError } from "@/shared/http/http";
import {
  findLinktreeItemById,
  normalizeLinktreeItemInput,
  normalizeLinktreeName,
  readLinktreeErrorMessage,
  sortLinktreesByName,
} from "@/app/(dashboard)/_components/linktree-shared";
import {
  buildNoticePreview,
  buildRoleLabel,
  normalizeNoticeImageUrls,
  normalizeNotices,
  readNoticeErrorMessage,
} from "@/app/(dashboard)/_components/notice-shared";
import {
  buildActivityImageSortPayload,
  formatTimestampToDateInput as formatActivityDateInput,
  parseDateInputToTimestamp as parseActivityDateInput,
  readActivityErrorMessage,
  sortActivitiesByStartDateDesc,
  summarizeActivityDescription,
  validateActivityDateRange,
} from "@/app/(dashboard)/dashboard/[generationName]/activities/_components/activity-shared";
import {
  buildExhibitionImageMutationPlan,
  buildExhibitionImageSortPayload,
  formatTimestampToDateInput as formatExhibitionDateInput,
  hasMeaningfulExhibitionDescription,
  parseDateInputToTimestamp as parseExhibitionDateInput,
  readExhibitionErrorMessage,
  sortExhibitionsByStartDateDesc,
  summarizeExhibitionDescription,
  validateExhibitionDateRange,
} from "@/app/(dashboard)/dashboard/[generationName]/exhibitions/_components/exhibition-shared";
import {
  USER_ROLE_FILTER_ALL,
  USER_ROLE_FILTER_NONE,
  filterAssignableUsers,
  formatTimestampToDateInput,
  mergeGenerationId,
  readNormalizedGenerationIds,
  sortGenerationsBySortOrderDesc,
  validateGenerationFormInput,
} from "@/app/(dashboard)/dashboard/settings/generations/generation-management-shared";
import {
  formatPrice,
  isMarketAdminRole,
  readMarketErrorMessage,
} from "@/app/(dashboard)/dashboard/market/market-shared";
import type {
  ApiActivity,
  ApiExhibition,
  ApiGeneration,
  ApiGlobalNotice,
  ApiLinktree,
  ApiUser,
} from "@/shared/contracts/api-contracts";

describe("dashboard shared helpers", () => {
  it("handles linktree helpers", () => {
    const linktrees = [
      { id: "2", name: "베타", items: [] },
      { id: "1", name: "알파", items: [{ id: "item-1" }] },
    ] as unknown as ApiLinktree[];

    expect(sortLinktreesByName(linktrees).map((linktree) => linktree.id)).toEqual(["2", "1"]);
    expect(findLinktreeItemById(linktrees[1], "item-1")?.id).toBe("item-1");
    expect(findLinktreeItemById(linktrees[1], "missing")).toBeNull();
    expect(normalizeLinktreeName("  공식 채널 ")).toBe("공식 채널");
    expect(normalizeLinktreeItemInput({ name: "  인스타 ", link: " https://x.com " })).toEqual({
      name: "인스타",
      link: "https://x.com",
    });

    expect(readLinktreeErrorMessage(new AdminApiError({ status: 400, message: "bad" }))).toBe(
      "bad",
    );
  });

  it("handles notice helpers", () => {
    const notices = normalizeNotices([
      {
        id: "n1",
        title: "공지 1",
        content: "<p>첫 공지</p>",
        imageUrls: [],
        createdAt: 10,
        updatedAt: 10,
        updatedBy: null,
        author: { id: "u1", name: "A", image: null, role: "manager" },
      },
      {
        id: "n2",
        title: "공지 2",
        content: "<p>둘째 공지</p>",
        imageUrls: [],
        createdAt: 20,
        updatedAt: 20,
        updatedBy: null,
        author: { id: "u1", name: "A", image: null, role: "manager" },
      },
    ] as unknown as ApiGlobalNotice[]);

    expect(notices.map((notice) => notice.id)).toEqual(["n2", "n1"]);
    expect(buildRoleLabel("vice_president")).toBe("부회장");
    expect(buildRoleLabel(null)).toBe("역할 미지정");
    expect(buildNoticePreview("<p>Hello <b>World</b></p>", 6)).toBe("Hello...");

    expect(
      normalizeNoticeImageUrls([
        "https://a.com/a.jpg",
        " https://a.com/a.jpg ",
        "http://b.com/b.jpg",
        "not-url",
      ]),
    ).toEqual(["https://a.com/a.jpg", "http://b.com/b.jpg"]);

    expect(readNoticeErrorMessage(new Error("x"))).toBe("x");
    expect(readNoticeErrorMessage(null)).toBe(
      "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  });

  it("handles activity helpers", () => {
    expect(readActivityErrorMessage(new Error("fail"))).toBe("fail");
    expect(
      sortActivitiesByStartDateDesc(
        [{ id: "a", startDate: 1 }, { id: "b", startDate: 2 }] as unknown as ApiActivity[],
      ).map((item) => item.id),
    ).toEqual(["b", "a"]);
    expect(summarizeActivityDescription("<p>Hello there world</p>", 5)).toBe("Hello...");

    const date = parseActivityDateInput("2025-03-01");
    expect(date).not.toBeNull();
    expect(parseActivityDateInput("2025-02-30")).toBeNull();
    expect(formatActivityDateInput(date ?? 0)).toBe("2025-03-01");

    expect(
      validateActivityDateRange({ startDateInput: "2025-03-01", endDateInput: "2025-03-05" }),
    ).toMatchObject({ startDate: expect.any(Number), endDate: expect.any(Number) });
    expect(
      validateActivityDateRange({ startDateInput: "2025-03-10", endDateInput: "2025-03-05" }),
    ).toEqual({ errorMessage: "활동 종료일은 시작일보다 빠를 수 없습니다." });

    expect(
      buildActivityImageSortPayload([
        { id: "b", sortOrder: -2 },
        { id: "a", sortOrder: 1.7 },
      ]),
    ).toEqual([
      { imageId: "b", sortOrder: 0 },
      { imageId: "a", sortOrder: 2 },
    ]);
  });

  it("handles exhibition helpers", () => {
    expect(readExhibitionErrorMessage(new Error("fail"))).toBe("fail");
    expect(
      sortExhibitionsByStartDateDesc([
        { id: "a", startDate: 1 },
        { id: "b", startDate: 2 },
      ] as unknown as ApiExhibition[]).map((item) => item.id),
    ).toEqual(["b", "a"]);

    expect(hasMeaningfulExhibitionDescription("<p>&nbsp;</p>")).toBe(false);
    expect(summarizeExhibitionDescription("<p>Hello exhibition world</p>", 8)).toBe("Hello ex...");

    const date = parseExhibitionDateInput("2026-01-31");
    expect(date).not.toBeNull();
    expect(parseExhibitionDateInput("2026-13-31")).toBeNull();
    expect(formatExhibitionDateInput(date ?? 0)).toBe("2026-01-31");

    expect(
      validateExhibitionDateRange({ startDateInput: "2026-01-01", endDateInput: "2026-01-05" }),
    ).toMatchObject({ startDate: expect.any(Number), endDate: expect.any(Number) });
    expect(
      validateExhibitionDateRange({ startDateInput: "2026-01-10", endDateInput: "2026-01-05" }),
    ).toEqual({ errorMessage: "전시 종료일은 시작일보다 빠를 수 없습니다." });

    expect(
      buildExhibitionImageSortPayload([
        { id: "x", sortOrder: 10 },
        { id: "y", sortOrder: 1.2 },
      ]),
    ).toEqual([
      { imageId: "y", sortOrder: 1 },
      { imageId: "x", sortOrder: 10 },
    ]);

    expect(
      buildExhibitionImageMutationPlan({
        existingImages: [
          { id: "e1", sortOrder: 0 },
          { id: "e2", sortOrder: 1 },
        ],
        deletedImageIds: ["e1"],
        createdImages: [{ id: "new-1", sortOrder: 2 }],
      }),
    ).toEqual({
      deleteImageIds: ["e1"],
      sortPayload: [
        { imageId: "e2", sortOrder: 1 },
        { imageId: "new-1", sortOrder: 2 },
      ],
    });
  });

  it("handles generation management helpers", () => {
    expect(formatTimestampToDateInput(new Date("2026-03-03").getTime())).toBe("2026-03-03");
    expect(
      validateGenerationFormInput({
        name: " 59기 ",
        sortOrderInput: "59",
        startDateInput: "2024-03-01",
        endDateInput: "2025-02-28",
      }),
    ).toEqual({
      payload: {
        name: "59기",
        sortOrder: 59,
        startDate: new Date(2024, 2, 1).getTime(),
        endDate: new Date(2025, 1, 28).getTime(),
      },
    });

    expect(
      validateGenerationFormInput({
        name: "",
        sortOrderInput: "59",
        startDateInput: "2024-03-01",
        endDateInput: "2025-02-28",
      }),
    ).toEqual({ errorMessage: "기수 이름을 입력해 주세요." });

    expect(
      sortGenerationsBySortOrderDesc([
        { id: "g1", sortOrder: 1 },
        { id: "g2", sortOrder: 2 },
      ] as unknown as ApiGeneration[]).map((generation) => generation.id),
    ).toEqual(["g2", "g1"]);

    expect(
      readNormalizedGenerationIds({
        generationId: " gen-59 ",
        generationIds: ["gen-58", "", " gen-59 "],
      } as unknown as Pick<ApiUser, "generationId" | "generationIds">),
    ).toEqual(["gen-58", "gen-59"]);

    expect(mergeGenerationId(["gen-58", " "], " gen-59 ")).toEqual(["gen-58", "gen-59"]);

    const users = [
      { id: "u1", name: "김연영", role: "regular_member", generationIds: [] },
      { id: "u2", name: "박부장", role: "manager", generationIds: [] },
      { id: "u3", name: "미승인", role: "unverified", generationIds: [] },
      { id: "u4", name: "역할없음", role: null, generationIds: [] },
    ] as unknown as ApiUser[];

    expect(
      filterAssignableUsers({ users, nameQuery: "", roleFilter: USER_ROLE_FILTER_ALL }).map((user) => user.id),
    ).toEqual(["u1", "u2", "u4"]);
    expect(
      filterAssignableUsers({ users, nameQuery: "", roleFilter: USER_ROLE_FILTER_NONE }).map((user) => user.id),
    ).toEqual(["u4"]);
    expect(
      filterAssignableUsers({ users, nameQuery: "박", roleFilter: "manager" }).map((user) => user.id),
    ).toEqual(["u2"]);
  });

  it("handles market helpers", () => {
    expect(formatPrice(1234567)).toBe("1,234,567원");
    expect(readMarketErrorMessage(new Error("market fail"))).toBe("market fail");
    expect(readMarketErrorMessage(null)).toBe("요청 처리 중 오류가 발생했습니다.");
    expect(isMarketAdminRole("president")).toBe(true);
    expect(isMarketAdminRole("regular_member")).toBe(false);
  });
});
