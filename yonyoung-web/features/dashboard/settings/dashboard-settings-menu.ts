type DashboardSettingsMenuItem = {
  key: string;
  label: string;
  description: string;
  href: string;
  privilegedOnly?: boolean;
  hiddenForMemberLikeRole?: boolean;
};

const SETTINGS_MENU_ITEMS: DashboardSettingsMenuItem[] = [
  {
    key: "settings-profile",
    label: "개인 프로필 설정",
    description: "프로필 사진과 기본 정보, 개인 링크를 직접 수정할 수 있습니다.",
    href: "/dashboard/profile",
  },
  {
    key: "settings-notices",
    label: "전체 공지 관리",
    description: "모든 공지를 확인하고 새로 올리거나 고칠 수 있습니다.",
    href: "/dashboard/settings/notices",
    hiddenForMemberLikeRole: true,
  },
  {
    key: "settings-linktree",
    label: "링크 모음 관리",
    description: "홈페이지에 보여 줄 링크 목록을 정리할 수 있습니다.",
    href: "/dashboard/settings/linktree",
    hiddenForMemberLikeRole: true,
  },
  {
    key: "settings-site",
    label: "기본 설정",
    description: "하단 연락처와 후원 계좌 같은 사이트 기본 정보를 바꿀 수 있습니다.",
    href: "/dashboard/settings/site",
    privilegedOnly: true,
  },
  {
    key: "settings-recruiting",
    label: "모집 계획",
    description:
      "올해 모집 계획의 제목, 세부 내용, 홍보 이미지, 모집 기간을 관리할 수 있습니다.",
    href: "/dashboard/settings/recruiting",
    privilegedOnly: true,
  },
  {
    key: "settings-members",
    label: "전체 멤버 관리",
    description: "모든 기수 멤버 정보를 한곳에서 확인하고 수정할 수 있습니다.",
    href: "/dashboard/settings/members",
    hiddenForMemberLikeRole: true,
  },
  {
    key: "settings-generations",
    label: "전체 기수 관리",
    description: "기수를 만들고 고치거나 삭제하고, 멤버를 기수에 배정할 수 있습니다.",
    href: "/dashboard/settings/generations",
    privilegedOnly: true,
  },
];

export const buildDashboardSettingsMenuItems = (input: {
  canManagePrivilegedSettings: boolean;
  isMemberLikeRole: boolean;
}): DashboardSettingsMenuItem[] =>
  SETTINGS_MENU_ITEMS.filter((item) => {
    if (item.privilegedOnly && !input.canManagePrivilegedSettings) {
      return false;
    }
    return !(item.hiddenForMemberLikeRole && input.isMemberLikeRole);

  });
