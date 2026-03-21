import "server-only";
import { headers as readHeaders } from "next/headers";
import {
  resolveForwardedRequestContext,
  type ForwardedRequestContext,
} from "@/shared/http/http";

export const readServerForwardedRequestContext =
  async (): Promise<ForwardedRequestContext> => {
    const requestHeaders = await readHeaders();

    return resolveForwardedRequestContext({
      host: requestHeaders.get("host"),
      forwardedHost: requestHeaders.get("x-forwarded-host"),
      forwardedProto: requestHeaders.get("x-forwarded-proto"),
      origin: requestHeaders.get("origin"),
    });
  };
