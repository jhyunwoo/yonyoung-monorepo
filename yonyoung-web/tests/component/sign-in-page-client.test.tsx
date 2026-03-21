import { describe, expect, it, vi, beforeEach, afterAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignInPageClient from "../../app/(dashboard)/auth/sign-in/sign-in-page-client";

const signInWithGoogleMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/auth/client/auth-actions", () => ({
  signInWithGoogle: signInWithGoogleMock,
}));


describe("SignInPageClient", () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    signInWithGoogleMock.mockReset();
    process.env.NEXT_PUBLIC_SITE_URL = window.location.origin;
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  });

  it("shows error when sign-in fails", async () => {
    signInWithGoogleMock.mockResolvedValue({
      ok: false,
      errorMessage: "Google 로그인 실패",
    });

    const user = userEvent.setup();
    render(<SignInPageClient />);

    await user.click(screen.getByTestId("auth-signin-google-submit"));

    expect(await screen.findByText("Google 로그인 실패")).toBeInTheDocument();
    expect(signInWithGoogleMock).toHaveBeenCalledWith({
      callbackURL: `${window.location.origin}/auth/sign-in`,
      disableRedirect: true,
    });
  });

  it("keeps pending state after successful sign-in result", async () => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    signInWithGoogleMock.mockResolvedValue({
      ok: true,
      data: { redirectUrl },
    });

    const user = userEvent.setup();
    render(<SignInPageClient />);

    await user.click(screen.getByTestId("auth-signin-google-submit"));

    await waitFor(() => {
      expect(signInWithGoogleMock).toHaveBeenCalledWith({
        callbackURL: `${window.location.origin}/auth/sign-in`,
        disableRedirect: true,
      });
      expect(screen.getByText("Google 로그인 중...")).toBeInTheDocument();
    });
  });

  it("shows fallback message when redirect URL is missing", async () => {
    signInWithGoogleMock.mockResolvedValue({ ok: true, data: undefined });

    const user = userEvent.setup();
    render(<SignInPageClient />);

    await user.click(screen.getByTestId("auth-signin-google-submit"));

    expect(
      await screen.findByText("Google 로그인 리다이렉트 URL을 찾을 수 없습니다."),
    ).toBeInTheDocument();
  });

  it("redirects to canonical domain before oauth when host differs", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://yonyoung.yonsei.ac.kr";

    const user = userEvent.setup();
    render(<SignInPageClient />);

    await user.click(screen.getByTestId("auth-signin-google-submit"));

    expect(signInWithGoogleMock).not.toHaveBeenCalled();
  });

  it("prioritizes auth canonical origin prop over NEXT_PUBLIC_SITE_URL", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://yonyoung.yonsei.ac.kr";
    signInWithGoogleMock.mockResolvedValue({
      ok: false,
      errorMessage: "Google 로그인 실패",
    });

    const user = userEvent.setup();
    render(<SignInPageClient authCanonicalOrigin={window.location.origin} />);

    await user.click(screen.getByTestId("auth-signin-google-submit"));

    expect(await screen.findByText("Google 로그인 실패")).toBeInTheDocument();
    expect(signInWithGoogleMock).toHaveBeenCalledWith({
      callbackURL: `${window.location.origin}/auth/sign-in`,
      disableRedirect: true,
    });
  });
});
