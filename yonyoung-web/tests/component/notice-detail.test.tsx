import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const replaceMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());
const getGlobalNoticeByIdMock = vi.hoisted(() => vi.fn());
const deleteGlobalNoticeMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    refresh: refreshMock,
  }),
}));

vi.mock("@/features/dashboard/api/admin-api/resources", () => ({
  adminResourceApi: {
    getGenerationNoticeById: vi.fn(),
    getGlobalNoticeById: getGlobalNoticeByIdMock,
    updateGenerationNotice: vi.fn(),
    updateGlobalNotice: vi.fn(),
    deleteGenerationNotice: vi.fn(),
    deleteGlobalNotice: deleteGlobalNoticeMock,
  },
}));

vi.mock("@/features/media/upload/use-image-upload-state", () => ({
  useImageUploadState: () => ({
    items: [],
    replaceItems: vi.fn(),
    appendExistingUrls: vi.fn(),
    removeItemById: vi.fn(),
    reorderByIds: vi.fn(),
  }),
}));

vi.mock("@/app/(dashboard)/_components/rich-text-editor", () => ({
  default: ({ value }: { value: string }) =>
    createElement("textarea", {
      "data-testid": "mock-rich-text-editor",
      value,
      readOnly: true,
    }),
}));

vi.mock("@/app/(dashboard)/_components/sortable-image-grid", () => ({
  default: () => null,
}));

vi.mock("@/app/(dashboard)/_components/upload-progress-bar", () => ({
  default: () => null,
}));

vi.mock("@/app/(dashboard)/_components/audit-history-panel", () => ({
  default: () => null,
}));

vi.mock("@/app/(dashboard)/_components/last-updated-meta", () => ({
  default: () => null,
}));

vi.mock("@/features/media/rich-text/rich-text-content", () => ({
  HIGH_CONTRAST_RICH_TEXT_CLASS_NAMES: "",
  RichTextContent: ({ html }: { html: string }) => createElement("div", null, html),
}));

import NoticeDetail from "@/app/(dashboard)/_components/notice-detail";

const createNotice = () => ({
  id: "notice-1",
  title: "전체 공지 제목",
  content: "<p>공지 본문</p>",
  imageUrls: [],
  author: {
    id: "user-1",
    name: "홍길동",
    image: null,
    role: "president",
  },
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
  updatedBy: null,
});

describe("NoticeDetail", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    refreshMock.mockReset();
    getGlobalNoticeByIdMock.mockReset();
    deleteGlobalNoticeMock.mockReset();
    getGlobalNoticeByIdMock.mockResolvedValue(createNotice());
  });

  it("shows delete button on global detail when writer cannot inline edit", async () => {
    render(
      <NoticeDetail
        scope="global"
        noticeId="notice-1"
        canWrite
        listPath="/dashboard/settings/notices"
        editPath="/dashboard/settings/notices/notice-1/edit"
        allowInlineEdit={false}
        heading="전체 공지 상세"
        description="설명"
      />,
    );

    await screen.findByText("전체 공지 제목");
    expect(screen.getByTestId("notice-detail-delete")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "수정 페이지로 이동" })).toBeInTheDocument();
  });

  it("deletes notice and redirects to list path", async () => {
    deleteGlobalNoticeMock.mockResolvedValue(undefined);
    const confirmMock = vi.spyOn(window, "confirm").mockReturnValue(true);

    const user = userEvent.setup();
    render(
      <NoticeDetail
        scope="global"
        noticeId="notice-1"
        canWrite
        listPath="/dashboard/settings/notices"
        editPath="/dashboard/settings/notices/notice-1/edit"
        allowInlineEdit={false}
        heading="전체 공지 상세"
        description="설명"
      />,
    );

    await screen.findByText("전체 공지 제목");
    await user.click(screen.getByTestId("notice-detail-delete"));

    await waitFor(() => {
      expect(deleteGlobalNoticeMock).toHaveBeenCalledWith("notice-1");
      expect(replaceMock).toHaveBeenCalledWith("/dashboard/settings/notices");
      expect(refreshMock).toHaveBeenCalled();
    });

    confirmMock.mockRestore();
  });

  it("hides delete button when user cannot write", async () => {
    render(
      <NoticeDetail
        scope="global"
        noticeId="notice-1"
        canWrite={false}
        listPath="/dashboard/settings/notices"
        editPath="/dashboard/settings/notices/notice-1/edit"
        allowInlineEdit={false}
        heading="전체 공지 상세"
        description="설명"
      />,
    );

    await screen.findByText("전체 공지 제목");
    expect(screen.queryByTestId("notice-detail-delete")).not.toBeInTheDocument();
  });
});
