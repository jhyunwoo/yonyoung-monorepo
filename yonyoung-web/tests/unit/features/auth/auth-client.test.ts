import { describe, expect, it, vi } from "vitest";
import {
  CSRF_HEADER_NAME,
  CSRF_HEADER_VALUE,
} from "@/shared/security/csrf";

const createAuthClientMock = vi.hoisted(() =>
  vi.fn((options: unknown) => options),
);

vi.mock("better-auth/react", () => ({
  createAuthClient: createAuthClientMock,
}));

import { authClient } from "@/features/auth/client/auth-client";

describe("features/auth/client/auth-client", () => {
  it("adds the app-owned CSRF header to state-changing auth requests", () => {
    const config = authClient as {
      fetchOptions: {
        onRequest: (context: {
          method: string;
          headers: Headers;
        }) => unknown;
      };
    };

    const context = {
      method: "POST",
      headers: new Headers(),
    };

    config.fetchOptions.onRequest(context);

    expect(context.headers.get(CSRF_HEADER_NAME)).toBe(CSRF_HEADER_VALUE);
  });

  it("keeps safe auth reads free of the CSRF header requirement", () => {
    const config = authClient as {
      fetchOptions: {
        onRequest: (context: {
          method: string;
          headers: Headers;
        }) => unknown;
      };
    };

    const context = {
      method: "GET",
      headers: new Headers(),
    };

    config.fetchOptions.onRequest(context);

    expect(context.headers.has(CSRF_HEADER_NAME)).toBe(false);
  });
});
