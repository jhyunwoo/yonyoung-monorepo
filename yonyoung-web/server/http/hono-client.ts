import "server-only";
import { z } from "zod";
import { getApiBaseUrl } from "@/server/env";
import { fetchWithTimeout, FetchTimeoutError } from "@/server/http/fetch-with-timeout";
import { readServerForwardedRequestContext } from "@/server/http/request-context";
import { applyForwardedRequestContextHeaders } from "@/shared/http/http";

const DataEnvelopeSchema = z.object({
  data: z.unknown(),
});

const ApiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
  }),
});

export class HonoApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | null;

  constructor(input: {
    status: number;
    code?: string;
    message: string;
    requestId?: string | null;
  }) {
    super(input.message);
    this.name = "HonoApiError";
    this.status = input.status;
    this.code = input.code ?? "UNKNOWN";
    this.requestId = input.requestId ?? null;
  }
}

type HonoRequestOptions<TResponse> = {
  path: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  timeoutMs?: number;
  cache?: RequestCache;
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
  responseSchema: z.ZodType<TResponse>;
  requestId?: string;
  traceId?: string;
  cookieHeader?: string | null;
};

const normalizePath = (path: string): string =>
  path.startsWith("/") ? path : `/${path}`;

const tryReadJson = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json().catch(() => null);
};

const extractData = <T>(payload: unknown, schema: z.ZodType<T>): T => {
  const envelope = DataEnvelopeSchema.safeParse(payload);
  const raw = envelope.success ? envelope.data.data : payload;
  return schema.parse(raw);
};

export const honoRequest = async <TResponse>(
  options: HonoRequestOptions<TResponse>,
): Promise<TResponse> => {
  const targetUrl = `${getApiBaseUrl()}${normalizePath(options.path)}`;

  const headers = new Headers({
    Accept: "application/json",
  });

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.requestId) {
    headers.set("x-request-id", options.requestId);
  }

  if (options.traceId) {
    headers.set("x-trace-id", options.traceId);
  }

  if (options.cookieHeader) {
    headers.set("cookie", options.cookieHeader);
    applyForwardedRequestContextHeaders(
      headers,
      await readServerForwardedRequestContext(),
    );
  }

  try {
    const response = await fetchWithTimeout(
      targetUrl,
      {
        method: options.method ?? "GET",
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        cache: options.cache,
        next: options.next,
      },
      options.timeoutMs,
    );

    const payload = await tryReadJson(response);

    if (!response.ok) {
      const parsedError = ApiErrorEnvelopeSchema.safeParse(payload);
      if (parsedError.success) {
        throw new HonoApiError({
          status: response.status,
          code: parsedError.data.error.code,
          message: parsedError.data.error.message,
          requestId: parsedError.data.error.requestId ?? null,
        });
      }

      throw new HonoApiError({
        status: response.status,
        message: `API request failed with status ${response.status}`,
      });
    }

    return extractData(payload, options.responseSchema);
  } catch (error) {
    if (error instanceof FetchTimeoutError) {
      throw new HonoApiError({
        status: 408,
        code: "TIMEOUT",
        message: "요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.",
      });
    }

    if (error instanceof HonoApiError) {
      throw error;
    }

    throw new HonoApiError({
      status: 500,
      code: "UNKNOWN",
      message: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    });
  }
};
