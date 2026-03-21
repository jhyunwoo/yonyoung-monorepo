import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DEFAULT_SITE_SETTINGS } from "@/shared/contracts/api-contracts";

const refreshMock = vi.hoisted(() => vi.fn());
const getSiteSettingsMock = vi.hoisted(() => vi.fn());
const updateSiteSettingsMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

vi.mock("@/features/dashboard/api/admin-api/resources", () => ({
  adminResourceApi: {
    getSiteSettings: getSiteSettingsMock,
    updateSiteSettings: updateSiteSettingsMock,
  },
}));

import SiteSettingsForm from "@/app/(dashboard)/dashboard/settings/site/site-settings-form";

describe("SiteSettingsForm", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    getSiteSettingsMock.mockReset();
    updateSiteSettingsMock.mockReset();
    getSiteSettingsMock.mockResolvedValue({ ...DEFAULT_SITE_SETTINGS });
  });

  it("shows email validation error and blocks submit when email format is invalid", async () => {
    const user = userEvent.setup();
    render(<SiteSettingsForm />);

    await screen.findByLabelText("이메일");
    await user.clear(screen.getByLabelText("이메일"));
    await user.type(screen.getByLabelText("이메일"), "invalid-email");
    await user.click(screen.getByTestId("site-settings-submit"));

    expect(await screen.findByText("이메일 형식이 올바르지 않습니다.")).toBeInTheDocument();
    expect(updateSiteSettingsMock).not.toHaveBeenCalled();
  });

  it("submits with normalized values when input is valid", async () => {
    const updatedSettings = {
      ...DEFAULT_SITE_SETTINGS,
      footerInstagramId: "newhandle",
      footerEmail: "new@example.com",
    };
    updateSiteSettingsMock.mockResolvedValue(updatedSettings);

    const user = userEvent.setup();
    render(<SiteSettingsForm />);

    await screen.findByPlaceholderText("yonyoungpage");
    await user.clear(screen.getByPlaceholderText("yonyoungpage"));
    await user.type(screen.getByPlaceholderText("yonyoungpage"), "@newhandle");
    await user.clear(screen.getByLabelText("이메일"));
    await user.type(screen.getByLabelText("이메일"), "new@example.com");

    await user.click(screen.getByTestId("site-settings-submit"));

    await waitFor(() => {
      expect(updateSiteSettingsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          footerInstagramId: "newhandle",
          footerEmail: "new@example.com",
        }),
      );
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("shows donate account number validation error and blocks submit when format is invalid", async () => {
    const user = userEvent.setup();
    render(<SiteSettingsForm />);

    await screen.findByLabelText("계좌번호");
    await user.clear(screen.getByLabelText("계좌번호"));
    await user.type(screen.getByLabelText("계좌번호"), "123-45A-678");
    await user.click(screen.getByTestId("site-settings-submit"));

    expect(
      await screen.findByText("계좌번호는 숫자와 -만 입력할 수 있으며 최대 50자입니다."),
    ).toBeInTheDocument();
    expect(updateSiteSettingsMock).not.toHaveBeenCalled();
  });
});
