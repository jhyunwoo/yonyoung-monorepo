export const buildMemberRoleLabel = (role: string | null): string => {
  switch (role) {
    case "president":
      return "회장";
    case "vice_president":
      return "부회장";
    case "manager":
      return "부장";
    case "new_member":
      return "신입회원";
    case "associate_member":
      return "준회원";
    case "regular_member":
      return "정회원";
    case "unverified":
      return "미승인";
    default:
      return "역할 미지정";
  }
};

export const isExecutiveRole = (role: string | null): boolean => {
  return role === "president" || role === "vice_president" || role === "manager";
};

export const canEditMemberProfile = (role: string | null): boolean => {
  return role === "president" || role === "vice_president";
};
