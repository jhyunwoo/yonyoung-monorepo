"use client";

import { authClient } from "@/features/auth/client/auth-client";

const DEFAULT_AUTH_ERROR_MESSAGE =
  "인증 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";

type AuthActionResult<T = undefined> =
  | {
      ok: true;
      data?: T;
    }
  | {
      ok: false;
      errorMessage: string;
    };

type SignInWithGoogleParams = {
  callbackURL?: string;
  disableRedirect?: boolean;
};

/**
 * getAuthErrorMessage 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
 * @param error 에러 상황을 나타내는 객체입니다.
 * @param fallback 함수 로직에서 사용하는 입력값입니다.
 * @returns 조회/계산된 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const getAuthErrorMessage = (
  error: unknown,
  fallback = DEFAULT_AUTH_ERROR_MESSAGE,
): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.length > 0
  ) {
    return error.message;
  }

  return fallback;
};

/**
 * signInWithGoogle의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
 * @param {
  callbackURL,
  disableRedirect = true,
} 요청/이동 대상 URL 문자열입니다.
 * @returns 비동기 처리 결과를 Promise로 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const signInWithGoogle = async ({
  callbackURL,
  disableRedirect = true,
}: SignInWithGoogleParams): Promise<AuthActionResult<{ redirectUrl: string }>> => {
  try {
    const resolvedCallbackURL = (() => {
      if (typeof window === "undefined") {
        return callbackURL;
      }

      const fallback = `${window.location.origin}/auth/sign-in`;
      const raw = callbackURL?.trim();
      if (!raw) {
        return fallback;
      }

      try {
        return new URL(raw, window.location.origin).toString();
      } catch {
        return fallback;
      }
    })();

    const response = await authClient.signIn.social({
      provider: "google",
      callbackURL: resolvedCallbackURL,
      disableRedirect,
    });

    if (response.error) {
      return {
        ok: false,
        errorMessage: getAuthErrorMessage(
          response.error,
          "Google 로그인에 실패했습니다.",
        ),
      };
    }

    if (!disableRedirect) {
      return {
        ok: true,
      };
    }

    const redirectUrl = response.data?.url;
    if (!redirectUrl) {
      return {
        ok: false,
        errorMessage: "Google 로그인 리다이렉트 URL을 찾을 수 없습니다.",
      };
    }

    return {
      ok: true,
      data: {
        redirectUrl,
      },
    };
  } catch (error) {
    return {
      ok: false,
      errorMessage: getAuthErrorMessage(error, "Google 로그인에 실패했습니다."),
    };
  }
};

/**
 * signOut의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
 * @returns 비동기 처리 결과를 Promise로 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const signOut = async (): Promise<AuthActionResult> => {
  try {
    const response = await authClient.signOut();

    if (response.error) {
      return {
        ok: false,
        errorMessage: getAuthErrorMessage(response.error, "로그아웃에 실패했습니다."),
      };
    }

    return {
      ok: true,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessage: getAuthErrorMessage(error, "로그아웃에 실패했습니다."),
    };
  }
};
