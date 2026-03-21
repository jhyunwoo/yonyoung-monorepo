import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApiGeneration, ApiUser } from "@/shared/contracts/api-contracts";
import { AdminApiError } from "@/shared/http/http";
const listUsersMock = vi.hoisted(() => vi.fn());
const listGenerationsMock = vi.hoisted(() => vi.fn());
const bulkUpdateUsersRoleMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/dashboard/api/admin-api/resources", () => ({
  adminResourceApi: {
    listUsers: listUsersMock,
    listGenerations: listGenerationsMock,
    bulkUpdateUsersRole: bulkUpdateUsersRoleMock,
  },
}));

import MembersGrid from "@/app/(dashboard)/dashboard/settings/members/members-grid";

const generations: ApiGeneration[] = [
  {
    id: "gen-59",
    name: "59기",
    sortOrder: 59,
    startDate: 59,
    endDate: 59,
    createdAt: 59,
    updatedAt: 59,
    updatedBy: null,
  },
  {
    id: "gen-58",
    name: "58기",
    sortOrder: 58,
    startDate: 58,
    endDate: 58,
    createdAt: 58,
    updatedAt: 58,
    updatedBy: null,
  },
];

const createUser = (
  input: Partial<ApiUser> & Pick<ApiUser, "id" | "name" | "email">,
): ApiUser => ({
  id: input.id,
  name: input.name,
  email: input.email,
  image: input.image ?? null,
  showcaseImageUrls: input.showcaseImageUrls ?? [],
  familyName: input.familyName ?? null,
  givenName: input.givenName ?? null,
  college: input.college ?? null,
  department: input.department ?? null,
  studentNumber: input.studentNumber ?? null,
  phoneNumber: input.phoneNumber ?? null,
  collaborationAvailable: input.collaborationAvailable ?? false,
  personalLink: input.personalLink ?? null,
  role: input.role ?? "regular_member",
  generationId: input.generationId ?? null,
  generationIds: input.generationIds ?? [],
  createdAt: input.createdAt ?? 1,
  updatedAt: input.updatedAt ?? 1,
  updatedBy: input.updatedBy ?? null,
});

const users: ApiUser[] = [
  createUser({
    id: "user-1",
    name: "legacy-kim",
    email: "kim@example.com",
    familyName: "김",
    givenName: "연영",
    college: "공과대학",
    department: "컴퓨터과학과",
    studentNumber: "2023000001",
    phoneNumber: "010-1111-1111",
    role: "regular_member",
    generationId: "gen-59",
    generationIds: ["gen-59", "gen-58"],
  }),
  createUser({
    id: "user-2",
    name: "legacy-choi",
    email: "choi@example.com",
    familyName: "최",
    givenName: "부원",
    college: "공과대학",
    department: "산업공학과",
    studentNumber: "2022000002",
    phoneNumber: "010-2222-2222",
    role: "associate_member",
    generationId: "gen-59",
    generationIds: ["gen-59"],
  }),
  createUser({
    id: "user-3",
    name: "legacy-park",
    email: "park@example.com",
    familyName: "박",
    givenName: "신입",
    college: "문과대학",
    department: "국어국문학과",
    studentNumber: "2024000003",
    phoneNumber: "010-3333-3333",
    role: "new_member",
    generationId: null,
    generationIds: [],
  }),
];

describe("MembersGrid", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    listUsersMock.mockReset();
    listGenerationsMock.mockReset();
    bulkUpdateUsersRoleMock.mockReset();
    listUsersMock.mockResolvedValue(users.map((user) => ({ ...user })));
    listGenerationsMock.mockResolvedValue(
      generations.map((generation) => ({ ...generation })),
    );
  });

  it("selects visible users and merges updated roles after bulk update", async () => {
    const confirmMock = vi.spyOn(window, "confirm").mockReturnValue(true);
    bulkUpdateUsersRoleMock.mockImplementation(
      async (input: { userIds: string[]; role: string }) =>
        users
          .filter((user) => input.userIds.includes(user.id))
          .map((user) => ({
            ...user,
            role: input.role,
            updatedAt: 99,
          })),
    );

    const user = userEvent.setup();
    render(<MembersGrid />);

    await screen.findByText("김연영");
    expect(screen.getByTestId("settings-members-open-user-1")).toHaveAttribute(
      "href",
      "/dashboard/settings/members/user-1",
    );
    expect(screen.getByTestId("settings-members-detail-link-user-1")).toHaveAttribute(
      "href",
      "/dashboard/settings/members/user-1",
    );
    expect(
      screen.queryByRole("option", {
        name: "회장",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("option", {
        name: "부회장",
      }),
    ).not.toBeInTheDocument();
    await user.type(screen.getByTestId("settings-members-search-input"), "김");

    await waitFor(() => {
      expect(screen.queryByText("최부원")).not.toBeInTheDocument();
    });

    await user.click(screen.getByTestId("settings-members-select-visible-users"));
    expect(screen.getByTestId("settings-members-selection-summary")).toHaveTextContent(
      "선택된 멤버 1명",
    );

    await user.selectOptions(screen.getByTestId("settings-members-bulk-role-select"), [
      "manager",
    ]);
    await user.click(screen.getByTestId("settings-members-bulk-role-submit"));

    await waitFor(() => {
      expect(confirmMock).toHaveBeenCalledWith(
        "선택한 멤버 1명의 권한을 부장(으)로 변경하시겠습니까?",
      );
      expect(bulkUpdateUsersRoleMock).toHaveBeenCalledWith({
        userIds: ["user-1"],
        role: "manager",
      });
    });

    expect(
      await screen.findByText("1명의 권한을 부장(으)로 변경했습니다."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("settings-members-selection-summary")).toHaveTextContent(
      "멤버를 선택해 권한을 한 번에 변경할 수 있습니다.",
    );
    expect(screen.getByTestId("settings-members-select-user-1")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(
      within(screen.getByTestId("settings-members-card-user-1")).getByText("부장"),
    ).toBeInTheDocument();
  });

  it("keeps selection when bulk role update fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    bulkUpdateUsersRoleMock.mockRejectedValue(
      new AdminApiError({
        status: 403,
        code: "FORBIDDEN",
        message: "본인보다 높거나 같은 등급의 사용자는 변경할 수 없습니다.",
      }),
    );

    const user = userEvent.setup();
    render(<MembersGrid />);

    await screen.findByText("김연영");
    await user.click(screen.getByTestId("settings-members-select-user-1"));
    await user.click(screen.getByTestId("settings-members-bulk-role-submit"));

    expect(
      await screen.findByText("본인보다 높거나 같은 등급의 사용자는 변경할 수 없습니다."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("settings-members-select-user-1")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("settings-members-selection-summary")).toHaveTextContent(
      "선택된 멤버 1명",
    );
  });
});
