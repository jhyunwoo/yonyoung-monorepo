import { AdminApiError } from "@/shared/http/http";
import type { AdminWriteActionResult } from "@/features/dashboard/actions/admin-write-actions";

export const unwrapAdminWriteActionResult = <T>(result: AdminWriteActionResult<T>): T => {
  if (result.ok) {
    return result.data;
  }

  throw new AdminApiError({
    status: result.status,
    code: result.code,
    message: result.errorMessage,
    requestId: result.requestId,
  });
};

export const bindAdminWriteAction = <TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<AdminWriteActionResult<TResult>>,
) => {
  return async (...args: TArgs): Promise<TResult> =>
    unwrapAdminWriteActionResult(await action(...args));
};
