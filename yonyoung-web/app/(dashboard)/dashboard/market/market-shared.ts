import type {
  ApiMarketConditionGrade,
  ApiMarketItemStatus,
} from "@/shared/contracts/api-contracts";

export const MARKET_MAX_IMAGES = 10;

export const STATUS_LABEL: Record<ApiMarketItemStatus, string> = {
  selling: "판매중",
  reserved: "예약중",
  sold: "판매완료",
};

export const STATUS_BADGE_CLASS: Record<ApiMarketItemStatus, string> = {
  selling: "border-emerald-200 bg-emerald-50 text-emerald-700",
  reserved: "border-amber-200 bg-amber-50 text-amber-700",
  sold: "border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
};

export const CONDITION_OPTIONS: Array<"" | ApiMarketConditionGrade> = [
  "",
  "A",
  "B",
  "C",
  "D",
];

export type MarketViewer = {
  id: string;
  displayName: string;
  role: string | null;
};

export const formatPrice = (price: number): string => {
  return `${new Intl.NumberFormat("ko-KR").format(price)}원`;
};

export const readMarketErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "요청 처리 중 오류가 발생했습니다.";
};

export const isMarketAdminRole = (role: string | null): boolean => {
  return role === "president" || role === "vice_president" || role === "manager";
};
