import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const listMarketItemsMock = vi.hoisted(() => vi.fn());
const shouldUseUnoptimizedImageMock = vi.hoisted(() => vi.fn(() => true));

vi.mock("@/features/dashboard/api/admin-api/resources", () => ({
  adminResourceApi: {
    listMarketItems: listMarketItemsMock,
  },
}));

vi.mock("@/features/media/images/image-utils", () => ({
  shouldUseUnoptimizedImage: shouldUseUnoptimizedImageMock,
}));

import MarketPageClient from "@/app/(dashboard)/dashboard/market/market-page-client";

describe("MarketPageClient", () => {
  beforeEach(() => {
    listMarketItemsMock.mockReset();
    shouldUseUnoptimizedImageMock.mockClear();
  });

  it("loads items and re-fetches when status filter changes", async () => {
    listMarketItemsMock
      .mockResolvedValueOnce([
        {
          id: "market-1",
          name: "필름 카메라",
          imageUrls: ["https://cdn.mock.local/market-1.jpg"],
          price: 120000,
          status: "selling",
          seller: { id: "u1", name: "최부원" },
          createdAt: Date.now(),
        },
      ])
      .mockResolvedValueOnce([]);

    const user = userEvent.setup();
    render(
      <MarketPageClient
        viewer={{ id: "u1", displayName: "최부원", role: "regular_member" }}
      />,
    );

    expect(await screen.findByText("필름 카메라")).toBeInTheDocument();
    expect(listMarketItemsMock).toHaveBeenNthCalledWith(1, {});
    expect(shouldUseUnoptimizedImageMock).toHaveBeenCalledWith(
      "https://cdn.mock.local/market-1.jpg",
    );

    await user.selectOptions(screen.getByRole("combobox"), "reserved");

    await waitFor(() => {
      expect(listMarketItemsMock).toHaveBeenNthCalledWith(2, { status: "reserved" });
    });
    expect(await screen.findByText("등록된 판매글이 없습니다.")).toBeInTheDocument();
  });
});
