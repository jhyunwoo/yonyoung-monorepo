import { createElement } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pushMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());
const createMarketItemMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

vi.mock("@/features/dashboard/api/admin-api/resources", () => ({
  adminResourceApi: {
    createMarketItem: createMarketItemMock,
  },
}));

vi.mock("@/features/media/upload/use-image-upload-state", () => ({
  useImageUploadState: () => ({
    items: [
      {
        id: "img-1",
        imageUrl: "https://cdn.mock.local/market-1.jpg",
      },
    ],
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

import MarketCreatePageClient from "@/app/(dashboard)/dashboard/market/new/market-create-page-client";

describe("MarketCreatePageClient", () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    createMarketItemMock.mockReset();
  });

  it("validates required fields", async () => {
    const user = userEvent.setup();
    render(
      <MarketCreatePageClient
        viewer={{ id: "user-member", displayName: "최부원", role: "regular_member" }}
      />,
    );

    await user.click(screen.getByTestId("market-create-submit"));
    expect(await screen.findByText("판매물건 이름은 필수입니다.")).toBeInTheDocument();
  });

  it("submits payload and navigates on success", async () => {
    createMarketItemMock.mockResolvedValue({ id: "market-2" });

    const user = userEvent.setup();
    render(
      <MarketCreatePageClient
        viewer={{ id: "user-member", displayName: "최부원", role: "regular_member" }}
      />,
    );

    await user.type(screen.getByPlaceholderText("판매물건 이름"), "테스트 카메라");
    await user.type(screen.getByPlaceholderText("가격(원)"), "150000");
    await user.type(screen.getByPlaceholderText("제조사 (선택)"), "Nikon");
    await user.type(screen.getByPlaceholderText("제품 코드 (선택)"), "FM2");
    await user.clear(screen.getByTestId("mock-rich-text-editor"));
    await user.type(screen.getByTestId("mock-rich-text-editor"), "<p>상태 양호</p>");

    await user.click(screen.getByTestId("market-create-submit"));

    await waitFor(() => {
      expect(createMarketItemMock).toHaveBeenCalledWith({
        name: "테스트 카메라",
        imageUrls: ["https://cdn.mock.local/market-1.jpg"],
        manufacturer: "Nikon",
        productCode: "FM2",
        conditionGrade: null,
        description: "<p>상태 양호</p>",
        price: 150000,
      });
      expect(pushMock).toHaveBeenCalledWith("/dashboard/market");
      expect(refreshMock).toHaveBeenCalled();
    });
  });
});
