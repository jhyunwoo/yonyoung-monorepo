import "server-only";

export type RequestContext = {
  requestId: string;
  traceId: string;
  route?: string;
  method?: string;
};

let currentContext: RequestContext | undefined;

export const runWithRequestContext = <T>(
  context: RequestContext,
  callback: () => T,
): T => {
  const previousContext = currentContext;
  currentContext = context;

  try {
    return callback();
  } finally {
    currentContext = previousContext;
  }
};

export const getRequestContext = (): RequestContext | undefined => {
  return currentContext;
};
