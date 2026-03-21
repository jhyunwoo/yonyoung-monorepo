import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const replaceMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());
const createLinktreeMock = vi.hoisted(() => vi.fn());
const addLinktreeItemMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    refresh: refreshMock,
  }),
}));

vi.mock("@/features/dashboard/api/admin-api/resources", () => ({
  adminResourceApi: {
    createLinktree: createLinktreeMock,
    addLinktreeItem: addLinktreeItemMock,
  },
}));

import LinktreeCreateForm from "@/app/(dashboard)/_components/linktree-create-form";

describe("LinktreeCreateForm", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    refreshMock.mockReset();
    createLinktreeMock.mockReset();
    addLinktreeItemMock.mockReset();
  });

  it("shows validation errors", async () => {
    const user = userEvent.setup();
    render(<LinktreeCreateForm canWrite listPath="/dashboard/settings/linktree" />);

    await user.click(screen.getByTestId("linktree-create-submit"));
    expect(await screen.findByText("분류 이름을 입력해 주세요.")).toBeInTheDocument();

    await user.type(screen.getByTestId("linktree-group-name-input"), "공식 채널");
    await user.click(screen.getByTestId("linktree-create-submit"));
    expect(await screen.findByText("링크를 1개 이상 입력해 주세요.")).toBeInTheDocument();
  });

  it("creates linktree and redirects", async () => {
    createLinktreeMock.mockResolvedValue({ id: "linktree-99" });
    addLinktreeItemMock.mockResolvedValue({ id: "item-1" });

    const user = userEvent.setup();
    render(<LinktreeCreateForm canWrite listPath="/dashboard/settings/linktree" />);

    await user.type(screen.getByTestId("linktree-group-name-input"), "공식 채널");
    await user.type(screen.getByTestId("linktree-item-name-input-0"), "Instagram");
    await user.type(screen.getByTestId("linktree-item-link-input-0"), "https://instagram.com/yonyoung");

    await user.click(screen.getByTestId("linktree-create-submit"));

    await waitFor(() => {
      expect(createLinktreeMock).toHaveBeenCalledWith({ name: "공식 채널" });
      expect(addLinktreeItemMock).toHaveBeenCalledWith("linktree-99", {
        name: "Instagram",
        link: "https://instagram.com/yonyoung",
      });
      expect(replaceMock).toHaveBeenCalledWith(
        "/dashboard/settings/linktree/linktree-99",
      );
      expect(refreshMock).toHaveBeenCalled();
    });
  });
});
