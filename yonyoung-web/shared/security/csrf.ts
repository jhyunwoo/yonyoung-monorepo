export const CSRF_HEADER_NAME = "x-yonyoung-csrf";
export const CSRF_HEADER_VALUE = "1";

export const isStateChangingMethod = (method: string): boolean => {
  const normalized = method.trim().toUpperCase();
  return normalized === "POST" || normalized === "PUT" || normalized === "PATCH" || normalized === "DELETE";
};
