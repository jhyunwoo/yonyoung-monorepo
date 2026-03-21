import type { BrowserContext } from "@playwright/test";
import type { MockRole } from "../mock-api/contracts";

const BASE_DOMAIN = "127.0.0.1";

type MockSessionOptions = {
  role: MockRole;
  profileMode?: "complete" | "incomplete";
  namespace?: string;
};

const createCookie = (input: {
  name: string;
  value: string;
  path?: string;
}) => ({
  name: input.name,
  value: input.value,
  domain: BASE_DOMAIN,
  path: input.path ?? "/",
  httpOnly: false,
  secure: false,
  sameSite: "Lax" as const,
});

export const clearMockSession = async (context: BrowserContext): Promise<void> => {
  await context.clearCookies();
};

export const setMockSession = async (
  context: BrowserContext,
  options: MockSessionOptions,
): Promise<void> => {
  await clearMockSession(context);
  const cookies = [
    createCookie({ name: "mock_role", value: options.role }),
    createCookie({ name: "mock_profile", value: options.profileMode ?? "complete" }),
    createCookie({ name: "mock_worker", value: options.namespace ?? "default" }),
  ];

  await context.addCookies(cookies);
};
