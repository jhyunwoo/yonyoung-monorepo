import { beforeEach, describe, expect, it, vi } from "vitest";
import { signInWithGoogle } from "../../../../features/auth/client/auth-actions";

const signInSocialMock = vi.hoisted(() => vi.fn());
const signOutMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/auth/client/auth-client", () => ({
  authClient: {
    signIn: {
      social: signInSocialMock,
    },
    signOut: signOutMock,
  },
}));


describe("signInWithGoogle", () => {
  beforeEach(() => {
    signInSocialMock.mockReset();
    signOutMock.mockReset();
  });

  it("uses absolute sign-in callback when callbackURL is omitted", async () => {
    signInSocialMock.mockResolvedValue({
      data: { url: "https://accounts.google.com/o/oauth2/v2/auth?state=test" },
      error: null,
    });

    await signInWithGoogle({});

    expect(signInSocialMock).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: `${window.location.origin}/auth/sign-in`,
      disableRedirect: true,
    });
  });

  it("preserves explicit callbackURL", async () => {
    const callbackURL = "https://yonyoung.yonsei.ac.kr/auth/sign-in";
    signInSocialMock.mockResolvedValue({
      data: { url: "https://accounts.google.com/o/oauth2/v2/auth?state=test" },
      error: null,
    });

    await signInWithGoogle({ callbackURL });

    expect(signInSocialMock).toHaveBeenCalledWith({
      provider: "google",
      callbackURL,
      disableRedirect: true,
    });
  });

  it("normalizes relative callbackURL to absolute URL", async () => {
    signInSocialMock.mockResolvedValue({
      data: { url: "https://accounts.google.com/o/oauth2/v2/auth?state=test" },
      error: null,
    });

    await signInWithGoogle({ callbackURL: "/message" });

    expect(signInSocialMock).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: `${window.location.origin}/message`,
      disableRedirect: true,
    });
  });
});
