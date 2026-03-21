import { createElement } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const replaceMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());
const createGenerationNoticeMock = vi.hoisted(() => vi.fn());
const createGlobalNoticeMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    refresh: refreshMock,
  }),
}));

vi.mock("@/features/dashboard/api/admin-api/resources", () => ({
  adminResourceApi: {
    createGenerationNotice: createGenerationNoticeMock,
    createGlobalNotice: createGlobalNoticeMock,
  },
}));

vi.mock("@/features/media/upload/use-image-upload-state", () => ({
  useImageUploadState: () => ({
    items: [],
    appendExistingUrls: vi.fn(),
    removeItemById: vi.fn(),
    reorderByIds: vi.fn(),
  }),
}));

vi.mock("@/app/(dashboard)/_components/rich-text-editor", () => ({
  EMPTY_RICH_TEXT_HTML: "<p></p>",
  default: ({ value, onChange }: { value: string; onChange: (value: string) => void }) =>
    createElement("textarea", {
      "data-testid": "mock-rich-text-editor",
      value,
      onChange: (event: { target: { value: string } }) => onChange(event.target.value),
    }),
}));

import NoticeCreateForm from "@/app/(dashboard)/_components/notice-create-form";

describe("NoticeCreateForm", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    refreshMock.mockReset();
    createGenerationNoticeMock.mockReset();
    createGlobalNoticeMock.mockReset();
  });

  it("validates title and content", async () => {
    const user = userEvent.setup();
    render(
      <NoticeCreateForm
        scope="global"
        canWrite
        basePath="/dashboard/settings/notices"
        listPath="/dashboard/settings/notices"
        heading="전체 공지 등록"
        description="공지 작성"
      />,
    );

    await user.click(screen.getByTestId("notice-create-submit"));

    expect(await screen.findByText("제목과 본문을 모두 입력해 주세요.")).toBeInTheDocument();
  });

  it("submits global notice and redirects", async () => {
    createGlobalNoticeMock.mockResolvedValue({ id: "notice-2" });

    const user = userEvent.setup();
    render(
      <NoticeCreateForm
        scope="global"
        canWrite
        basePath="/dashboard/settings/notices"
        listPath="/dashboard/settings/notices"
        heading="전체 공지 등록"
        description="공지 작성"
      />,
    );

    await user.type(screen.getByPlaceholderText("공지 제목"), "테스트 공지");
    await user.type(screen.getByTestId("mock-rich-text-editor"), "<p>본문 테스트</p>");

    await user.click(screen.getByTestId("notice-create-submit"));

    await waitFor(() => {
      expect(createGlobalNoticeMock).toHaveBeenCalledWith({
        title: "테스트 공지",
        content: "<p></p><p>본문 테스트</p>",
        imageUrls: [],
      });
      expect(replaceMock).toHaveBeenCalledWith("/dashboard/settings/notices/notice-2");
      expect(refreshMock).toHaveBeenCalled();
    });
  });
});
