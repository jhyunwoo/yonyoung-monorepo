import { createAuthClient } from "better-auth/react";
import { resolveApiBaseUrl } from "@/shared/http/http";
import {
  CSRF_HEADER_NAME,
  CSRF_HEADER_VALUE,
  isStateChangingMethod,
} from "@/shared/security/csrf";

export const authClient = createAuthClient({
  baseURL: resolveApiBaseUrl({ clientSide: true }),
  basePath: "/api/auth",
  fetchOptions: {
    onRequest(context) {
      if (!isStateChangingMethod(context.method)) {
        return context;
      }

      context.headers.set(CSRF_HEADER_NAME, CSRF_HEADER_VALUE);
      return context;
    },
  },
});
