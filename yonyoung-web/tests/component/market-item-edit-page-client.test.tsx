import { createElement } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pushMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());
const getMarketItemByIdMock = vi.hoisted(() => vi.fn());
const updateMarketItemMock = vi.hoisted(() => vi.fn());
const clearImageItemsMock = vi.hoisted(() => vi.fn());
const appendExistingUrlsMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

vi.mock("@/features/dashboard/api/admin-api/resources", () => ({
  adminResourceApi: {
    getMarketItemById: getMarketItemByIdMock,
    updateMarketItem: updateMarketItemMock,
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
    appendExistingUrls: appendExistingUrlsMock,
    removeItemById: vi.fn(),
    reorderByIds: vi.fn(),
    clear: clearImageItemsMock,
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

import MarketItemEditPageClient from "@/app/(dashboard)/dashboard/market/[itemId]/edit/market-item-edit-page-client";

describe("MarketItemEditPageClient", () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    getMarketItemByIdMock.mockReset();
    updateMarketItemMock.mockReset();
    clearImageItemsMock.mockReset();
    appendExistingUrlsMock.mockReset();

    getMarketItemByIdMock.mockResolvedValue({
      id: "market-1",
      sellerId: "user-member",
      name: "기존 카메라",
      imageUrls: ["https://cdn.mock.local/market-1.jpg"],
      manufacturer: "Canon",
      productCode: "AE-1",
      conditionGrade: "B",
      description: "<p>기존 설명</p>",
      price: 120000,
      status: "selling",
      seller: { id: "user-member", name: "최부원", image: null, role: "regular_member" },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      updatedBy: null,
    });
  });

  it("loads and updates market item", async () => {
    updateMarketItemMock.mockResolvedValue({ id: "market-1" });

    const user = userEvent.setup();
    render(
      <MarketItemEditPageClient
        itemId="market-1"
        viewer={{ id: "user-member", displayName: "최부원", role: "regular_member" }}
      />,
    );

    expect(await screen.findByTestId("market-edit-form")).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText("판매물건 이름");
    const priceInput = screen.getByPlaceholderText("가격(원)");
    await user.clear(nameInput);
    await user.type(nameInput, "수정된 카메라");
    await user.clear(priceInput);
    await user.type(priceInput, "130000");

    await user.click(screen.getByTestId("market-edit-submit"));

    await waitFor(() => {
      expect(updateMarketItemMock).toHaveBeenCalledWith("market-1", {
        name: "수정된 카메라",
        imageUrls: ["https://cdn.mock.local/market-1.jpg"],
        manufacturer: "Canon",
        productCode: "AE-1",
        conditionGrade: "B",
        description: "<p>기존 설명</p>",
        price: 130000,
      });
      expect(pushMock).toHaveBeenCalledWith("/dashboard/market/market-1");
      expect(refreshMock).toHaveBeenCalled();
    });
  });
});
