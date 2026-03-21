import { describe, expect, it } from "vitest";
import { buildDashboardSettingsMenuItems } from "@/features/dashboard/settings/dashboard-settings-menu";

describe("features/dashboard/settings/dashboard-settings-menu", () => {
  it("shows only the profile shortcut for member-like roles", () => {
    const items = buildDashboardSettingsMenuItems({
      canManagePrivilegedSettings: false,
      isMemberLikeRole: true,
    });

    expect(items.map((item) => item.key)).toEqual(["settings-profile"]);
  });

  it("keeps management shortcuts for manager-like roles", () => {
    const items = buildDashboardSettingsMenuItems({
      canManagePrivilegedSettings: false,
      isMemberLikeRole: false,
    });

    expect(items.map((item) => item.key)).toEqual([
      "settings-profile",
      "settings-notices",
      "settings-linktree",
      "settings-members",
    ]);
  });

  it("includes privileged settings for president and vice president roles", () => {
    const items = buildDashboardSettingsMenuItems({
      canManagePrivilegedSettings: true,
      isMemberLikeRole: false,
    });

    expect(items.map((item) => item.key)).toEqual([
      "settings-profile",
      "settings-notices",
      "settings-linktree",
      "settings-site",
      "settings-recruiting",
      "settings-members",
      "settings-generations",
    ]);
  });
});
