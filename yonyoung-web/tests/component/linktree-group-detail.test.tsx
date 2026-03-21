import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const replaceMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());
const getLinktreeByIdMock = vi.hoisted(() => vi.fn());
const addLinktreeItemMock = vi.hoisted(() => vi.fn());
const deleteLinktreeMock = vi.hoisted(() => vi.fn());
const listAuditLogsMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    refresh: refreshMock,
  }),
}));

vi.mock("@/features/dashboard/api/admin-api/resources", () => ({
  adminResourceApi: {
    getLinktreeById: getLinktreeByIdMock,
    addLinktreeItem: addLinktreeItemMock,
    deleteLinktree: deleteLinktreeMock,
    listAuditLogs: listAuditLogsMock,
  },
}));

import LinktreeGroupDetail from "@/app/(dashboard)/_components/linktree-group-detail";

const createLinktree = (items: Array<{ id: string; name: string; link: string }>) => ({
  id: "linktree-1",
  name: "공식 채널",
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
  updatedBy: null,
  items: items.map((item) => ({
    ...item,
    linktreeId: "linktree-1",
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    updatedBy: null,
  })),
});

describe("LinktreeGroupDetail", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    refreshMock.mockReset();
    getLinktreeByIdMock.mockReset();
    addLinktreeItemMock.mockReset();
    deleteLinktreeMock.mockReset();
    listAuditLogsMock.mockReset();
    listAuditLogsMock.mockResolvedValue([]);
  });

  it("adds a new sub-link from group detail page", async () => {
    getLinktreeByIdMock
      .mockResolvedValueOnce(createLinktree([]))
      .mockResolvedValueOnce(
        createLinktree([
          {
            id: "linktree-item-2",
            name: "Instagram",
            link: "https://instagram.com/yonyoung",
          },
        ]),
      );
    addLinktreeItemMock.mockResolvedValue({
      id: "linktree-item-2",
      linktreeId: "linktree-1",
      name: "Instagram",
      link: "https://instagram.com/yonyoung",
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
      updatedBy: null,
    });

    const user = userEvent.setup();
    render(
      <LinktreeGroupDetail
        linktreeId="linktree-1"
        canWrite
        listPath="/dashboard/settings/linktree"
      />,
    );

    await screen.findByText("링크 0개");
    await user.type(screen.getByTestId("linktree-group-item-name-input"), "Instagram");
    await user.type(
      screen.getByTestId("linktree-group-item-link-input"),
      "https://instagram.com/yonyoung",
    );
    await user.click(screen.getByTestId("linktree-group-item-add-submit"));

    await waitFor(() => {
      expect(addLinktreeItemMock).toHaveBeenCalledWith("linktree-1", {
        name: "Instagram",
        link: "https://instagram.com/yonyoung",
      });
      expect(screen.getByText("링크 1개")).toBeInTheDocument();
      expect(screen.getByText("Instagram")).toBeInTheDocument();
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("shows validation error when sub-link URL is invalid", async () => {
    getLinktreeByIdMock.mockResolvedValue(createLinktree([]));

    const user = userEvent.setup();
    render(
      <LinktreeGroupDetail
        linktreeId="linktree-1"
        canWrite
        listPath="/dashboard/settings/linktree"
      />,
    );

    await screen.findByText("링크 0개");
    await user.type(screen.getByTestId("linktree-group-item-name-input"), "Instagram");
    await user.type(screen.getByTestId("linktree-group-item-link-input"), "instagram.com/yonyoung");
    await user.click(screen.getByTestId("linktree-group-item-add-submit"));

    expect(
      await screen.findByText("링크 주소는 http:// 또는 https://로 시작해야 합니다."),
    ).toBeInTheDocument();
    expect(addLinktreeItemMock).not.toHaveBeenCalled();
  });
});
