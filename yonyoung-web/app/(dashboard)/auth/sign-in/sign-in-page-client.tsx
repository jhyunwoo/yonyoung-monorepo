"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { signInWithGoogle } from "@/features/auth/client/auth-actions";

type SignInPageClientProps = {
  authCanonicalOrigin?: string | null;
};

const parseOrigin = (value: string | null | undefined): string | null => {
  const raw = value?.trim();
  if (!raw) {
    return null;
  }

  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
};

const resolveCanonicalSiteOrigin = (
  authCanonicalOrigin?: string | null,
): string | null => {
  const explicitOrigin = parseOrigin(authCanonicalOrigin);
  if (explicitOrigin) {
    return explicitOrigin;
  }

  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) {
    return null;
  }

  return parseOrigin(raw);
};

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} focusable="false">
    <path
      d="M21.82 12.233c0-.793-.071-1.554-.204-2.284H12v4.32h5.498a4.704 4.704 0 0 1-2.041 3.086v2.56h3.305c1.935-1.782 3.058-4.408 3.058-7.682Z"
      fill="#4285F4"
    />
    <path
      d="M12 22c2.76 0 5.076-.915 6.768-2.485l-3.305-2.56c-.915.614-2.084.977-3.463.977-2.653 0-4.902-1.791-5.706-4.2H2.878v2.64A10.22 10.22 0 0 0 12 22Z"
      fill="#34A853"
    />
    <path
      d="M6.294 13.732A6.14 6.14 0 0 1 5.975 12c0-.6.108-1.181.319-1.732v-2.64H2.878A10.224 10.224 0 0 0 1.8 12c0 1.64.393 3.193 1.078 4.372l3.416-2.64Z"
      fill="#FBBC05"
    />
    <path
      d="M12 6.068c1.5 0 2.848.516 3.91 1.529l2.93-2.93C17.07 3.027 14.754 2 12 2a10.22 10.22 0 0 0-9.122 5.628l3.416 2.64c.804-2.41 3.053-4.2 5.706-4.2Z"
      fill="#EA4335"
    />
  </svg>
);

export default function SignInPageClient({ authCanonicalOrigin }: SignInPageClientProps) {
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsPending(true);
    setErrorMessage(null);

    const canonicalOrigin = resolveCanonicalSiteOrigin(authCanonicalOrigin);
    if (canonicalOrigin && new URL(canonicalOrigin).host !== window.location.host) {
      const canonicalSignInUrl = new URL("/auth/sign-in", canonicalOrigin);
      canonicalSignInUrl.search = window.location.search;
      window.location.assign(canonicalSignInUrl.toString());
      return;
    }

    const callbackOrigin = canonicalOrigin ?? window.location.origin;
    const callbackURL = `${callbackOrigin}/auth/sign-in`;
    const signInResult = await signInWithGoogle({
      callbackURL,
      disableRedirect: true,
    });

    if (!signInResult.ok) {
      setErrorMessage(signInResult.errorMessage);
      setIsPending(false);
      return;
    }

    const redirectUrl = signInResult.data?.redirectUrl;
    if (!redirectUrl) {
      setErrorMessage("Google 로그인 리다이렉트 URL을 찾을 수 없습니다.");
      setIsPending(false);
      return;
    }

    window.location.assign(redirectUrl);
  };

  return (
    <main className="relative isolate min-h-screen overflow-hidden  text-[#2c3357]">
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <section className="w-full max-w-xl overflow-hidden rounded-4xl border border-[#2c3357] bg-[#2c3357] p-px shadow-[0_32px_80px_rgba(44,51,87,0.2)]">
          <div className="rounded-[calc(2rem-1px)] bg-white px-6 py-7 sm:px-8 sm:py-9">
            <div className="flex items-center justify-between gap-4 border-b border-[#2c3357]/10 pb-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[1.15rem] border border-[#2c3357]/12 bg-neutral-100 shadow-[0_12px_24px_rgba(44,51,87,0.08)]">
                  <Image
                    src="/yonyoung-logo-black.png"
                    alt="연영회 심볼"
                    width={46}
                    height={46}
                    className="h-11 w-11 object-contain"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#667089]">
                    YonYoungHoe Dashboard
                  </p>
                  <h1 className="mt-1 text-[1.9rem] font-semibold tracking-[-0.04em] text-[#2c3357] sm:text-[2.2rem]">
                    연영회 로그인
                  </h1>
                </div>
              </div>

              <Link
                href="/"
                className="hidden items-center gap-1 text-sm font-semibold text-[#667089] transition hover:text-[#2c3357] sm:inline-flex"
              >
                홈으로
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 rounded-[1.6rem] border border-[#2c3357]/10 bg-white px-5 py-6 shadow-[0_18px_40px_rgba(44,51,87,0.08)] sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#667089]">
                Dashboard Auth
              </p>
              <p className="mt-3 text-sm leading-7 text-[#4e556e] sm:text-[0.95rem]">
                내부 운영 화면 이용을 위해 승인된 Google 계정으로 로그인해 주세요.
              </p>

              <button
                type="button"
                data-testid="auth-signin-google-submit"
                disabled={isPending}
                onClick={handleGoogleSignIn}
                className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-[1.25rem] border border-[#2c3357]/14 bg-neutral-100 px-4 py-4 text-sm font-semibold text-[#2c3357] shadow-[0_16px_28px_rgba(44,51,87,0.08)] transition hover:-translate-y-0.5 hover:bg-neutral-200 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <GoogleIcon className="h-5 w-5 shrink-0" />
                <span>
                  {isPending ? "Google 로그인 중..." : "Google 계정으로 로그인"}
                </span>
              </button>

              {errorMessage ? (
                <p
                  role="alert"
                  className="mt-4 rounded-[1.1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
                >
                  {errorMessage}
                </p>
              ) : null}
            </div>

            <Link
              href="/"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#667089] transition hover:text-[#2c3357] sm:hidden"
            >
              홈으로 돌아가기
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
