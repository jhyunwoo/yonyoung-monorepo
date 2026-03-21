import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const replaceMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());
const updateUserMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    refresh: refreshMock,
  }),
}));

vi.mock("@/features/dashboard/api/admin-api/resources", () => ({
  adminResourceApi: {
    updateUser: updateUserMock,
  },
}));

vi.mock("@/features/dashboard/api/admin-api/upload", () => ({
  PRESIGN_PATHS: {
    userProfile: "/api/users/presign/profile-image",
  },
  uploadWithPresign: vi.fn(),
}));

vi.mock("@/features/dashboard/api/admin-api/upload-batch", () => ({
  uploadFilesWithPresign: vi.fn(),
}));

vi.mock("@/features/media/upload/use-image-upload-state", () => ({
  useImageUploadState: () => ({
    items: [],
    appendExistingUrls: vi.fn(),
    removeItemById: vi.fn(),
    reorderByIds: vi.fn(),
    replaceItems: vi.fn(),
  }),
}));

import AuthProfileForm from "@/app/(dashboard)/auth/profile/profile-form";

describe("AuthProfileForm", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    refreshMock.mockReset();
    updateUserMock.mockReset();
  });

  it("shows field validation errors", async () => {
    const user = userEvent.setup();
    render(
      <AuthProfileForm
        userId="user-unverified"
        role="unverified"
        mode="auth"
        initialProfile={{
          image: "",
          showcaseImageUrls: [],
          familyName: "",
          givenName: "",
          college: "",
          department: "",
          studentNumber: "",
          phoneNumber: "",
          collaborationAvailable: false,
          personalLink: "",
        }}
      />,
    );

    await user.click(screen.getByTestId("auth-profile-submit"));

    expect(await screen.findByText("성을 입력해 주세요.")).toBeInTheDocument();
    expect(screen.getByText("학번은 숫자 10자리여야 합니다.")).toBeInTheDocument();
    expect(
      screen.getByText("핸드폰 번호는 010-0000-0000 형식이어야 합니다."),
    ).toBeInTheDocument();
  });

  it("submits profile and redirects out of auth profile page", async () => {
    updateUserMock.mockResolvedValue({
      id: "user-unverified",
      role: "unverified",
      familyName: "김",
      givenName: "연영",
      college: "공과대학",
      department: "컴퓨터과학과",
      studentNumber: "2023000001",
      phoneNumber: "010-1234-5678",
      collaborationAvailable: true,
      personalLink: "https://instagram.com/test",
      image: null,
      showcaseImageUrls: [],
    });

    const user = userEvent.setup();
    render(
      <AuthProfileForm
        userId="user-unverified"
        role="unverified"
        mode="auth"
        initialProfile={{
          image: "",
          showcaseImageUrls: [],
          familyName: "",
          givenName: "",
          college: "",
          department: "",
          studentNumber: "",
          phoneNumber: "",
          collaborationAvailable: false,
          personalLink: "",
        }}
      />,
    );

    await user.type(screen.getByLabelText("성"), "김");
    await user.type(screen.getByLabelText("이름"), "연영");
    await user.type(screen.getByLabelText("대학명"), "공과대학");
    await user.type(screen.getByLabelText("학과명"), "컴퓨터과학과");
    await user.type(screen.getByLabelText(/학번/), "2023000001");
    await user.type(screen.getByLabelText("핸드폰 번호"), "01012345678");
    await user.type(screen.getByLabelText(/개인 링크/), "https://instagram.com/test");

    await user.click(screen.getByTestId("auth-profile-submit"));

    await waitFor(() => {
      expect(updateUserMock).toHaveBeenCalledWith("user-unverified", {
        familyName: "김",
        givenName: "연영",
        college: "공과대학",
        department: "컴퓨터과학과",
        studentNumber: "2023000001",
        phoneNumber: "010-1234-5678",
        collaborationAvailable: false,
        personalLink: "https://instagram.com/test",
      });
      expect(replaceMock).toHaveBeenCalledWith("/auth/pending-approval");
      expect(refreshMock).not.toHaveBeenCalled();
    });
  });

  it("submits profile without personal link", async () => {
    updateUserMock.mockResolvedValue({
      id: "user-unverified",
      role: "unverified",
      familyName: "김",
      givenName: "연영",
      college: "공과대학",
      department: "컴퓨터과학과",
      studentNumber: "2023000001",
      phoneNumber: "010-1234-5678",
      collaborationAvailable: true,
      personalLink: null,
      image: null,
      showcaseImageUrls: [],
    });

    const user = userEvent.setup();
    render(
      <AuthProfileForm
        userId="user-unverified"
        role="unverified"
        mode="auth"
        initialProfile={{
          image: "",
          showcaseImageUrls: [],
          familyName: "",
          givenName: "",
          college: "",
          department: "",
          studentNumber: "",
          phoneNumber: "",
          collaborationAvailable: false,
          personalLink: "",
        }}
      />,
    );

    await user.type(screen.getByLabelText("성"), "김");
    await user.type(screen.getByLabelText("이름"), "연영");
    await user.type(screen.getByLabelText("대학명"), "공과대학");
    await user.type(screen.getByLabelText("학과명"), "컴퓨터과학과");
    await user.type(screen.getByLabelText(/학번/), "2023000001");
    await user.type(screen.getByLabelText("핸드폰 번호"), "01012345678");

    await user.click(screen.getByTestId("auth-profile-submit"));

    await waitFor(() => {
      expect(updateUserMock).toHaveBeenCalledWith("user-unverified", {
        familyName: "김",
        givenName: "연영",
        college: "공과대학",
        department: "컴퓨터과학과",
        studentNumber: "2023000001",
        phoneNumber: "010-1234-5678",
        collaborationAvailable: false,
      });
      expect(replaceMock).toHaveBeenCalledWith("/auth/pending-approval");
      expect(refreshMock).not.toHaveBeenCalled();
    });
  });
});
