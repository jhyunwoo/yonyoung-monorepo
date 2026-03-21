import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchGenerationsFromServerMock = vi.hoisted(() => vi.fn());
const getCurrentUserProfileMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/dashboard/generation/generation-fetcher", () => ({
  fetchGenerationsFromServer: fetchGenerationsFromServerMock,
}));

vi.mock("@/features/auth/server/auth-guard", () => ({
  serverAuthGuard: {
    getCurrentUserProfile: getCurrentUserProfileMock,
  },
}));

import {
  buildDashboardGenerationPath,
  isSameGenerationRouteName,
} from "@/features/dashboard/generation/dashboard-generation-route";
import { getAccessibleGenerations } from "@/features/dashboard/generation/generation-access";
import {
  getAccessibleDashboardGenerationOptions,
  resolveGenerationOptionFromRouteName,
} from "@/features/dashboard/generation/generation-options";

const generations = [
  {
    id: "gen-58",
    name: "58기",
    sortOrder: 58,
    startDate: 0,
    endDate: 0,
    updatedAt: 0,
    updatedBy: null,
  },
  {
    id: "gen-59",
    name: "59기",
    sortOrder: 59,
    startDate: 0,
    endDate: 0,
    updatedAt: 0,
    updatedBy: null,
  },
  {
    id: "gen-60",
    name: "60기",
    sortOrder: 60,
    startDate: 0,
    endDate: 0,
    updatedAt: 0,
    updatedBy: null,
  },
];

describe("features/dashboard/generation", () => {
  beforeEach(() => {
    fetchGenerationsFromServerMock.mockReset();
    getCurrentUserProfileMock.mockReset();
  });

  it("builds and compares dashboard generation routes", () => {
    expect(buildDashboardGenerationPath({ name: "59기" })).toBe("/dashboard/59%EA%B8%B0");
    expect(isSameGenerationRouteName("59기", "59%EA%B8%B0")).toBe(true);
    expect(isSameGenerationRouteName("59기", "58%EA%B8%B0")).toBe(false);
  });

  it("filters accessible generations by role and membership", () => {
    expect(
      getAccessibleGenerations(
        { user: { role: "president" } },
        generations,
      ).map((generation) => generation.id),
    ).toEqual(["gen-58", "gen-59", "gen-60"]);

    expect(
      getAccessibleGenerations(
        { user: { role: "vice_president" } },
        generations,
      ).map((generation) => generation.id),
    ).toEqual(["gen-58", "gen-59", "gen-60"]);

    expect(
      getAccessibleGenerations(
        {
          user: {
            role: "regular_member",
            generationId: "gen-59",
            generationIds: ["gen-60", "", 1],
          },
        },
        generations,
      ).map((generation) => generation.id),
    ).toEqual(["gen-59", "gen-60"]);

    expect(getAccessibleGenerations(null, generations)).toEqual([]);
  });

  it("resolves accessible dashboard generation options", async () => {
    fetchGenerationsFromServerMock.mockResolvedValue(generations);
    getCurrentUserProfileMock.mockResolvedValue({
      generationIds: ["gen-58", "gen-60"],
    });

    const options = await getAccessibleDashboardGenerationOptions({
      session: {
        id: "s",
        userId: "u",
        expiresAt: 0,
      },
      user: {
        id: "u",
        email: "u@test.com",
        name: "홍길동",
        role: "regular_member",
      },
    });

    expect(options.map((option) => option.id)).toEqual(["gen-58", "gen-60"]);
    expect(options[0]?.path).toBe("/dashboard/58%EA%B8%B0");
    expect(resolveGenerationOptionFromRouteName(options, "60%EA%B8%B0")?.id).toBe(
      "gen-60",
    );
    expect(resolveGenerationOptionFromRouteName(options, "unknown")).toBeNull();
  });

  it("uses explicit profile option without auth guard call", async () => {
    fetchGenerationsFromServerMock.mockResolvedValue(generations);

    const options = await getAccessibleDashboardGenerationOptions(
      {
        session: {
          id: "s",
          userId: "u",
          expiresAt: 0,
        },
        user: {
          id: "u",
          email: "u@test.com",
          name: "홍길동",
          role: "regular_member",
          generationIds: ["gen-59"],
        },
      },
      {
        profile: {
          generationIds: ["gen-58"],
        },
      },
    );

    expect(getCurrentUserProfileMock).not.toHaveBeenCalled();
    expect(options.map((option) => option.id)).toEqual(["gen-58"]);
  });

  it("retries profile fetch when implicit fetch returns null", async () => {
    fetchGenerationsFromServerMock.mockResolvedValue(generations);
    getCurrentUserProfileMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        generationIds: ["gen-59"],
      });

    const options = await getAccessibleDashboardGenerationOptions({
      session: {
        id: "s",
        userId: "u",
        expiresAt: 0,
      },
      user: {
        id: "u",
        email: "u@test.com",
        name: "홍길동",
        role: "regular_member",
      },
    });

    expect(getCurrentUserProfileMock).toHaveBeenCalledTimes(2);
    expect(options.map((option) => option.id)).toEqual(["gen-59"]);
  });
});
