"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import { buildMemberDisplayName } from "@/features/dashboard/members/display-name";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";
import type {
  ApiMarketItem,
  ApiMarketItemStatus,
} from "@/shared/contracts/api-contracts";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type MarketViewer,
  STATUS_BADGE_CLASS,
  STATUS_LABEL,
  formatPrice,
  readMarketErrorMessage,
} from "@/app/(dashboard)/dashboard/market/market-shared";

const formatPostedDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(date);
};

export default function MarketPageClient({ viewer }: { viewer: MarketViewer }) {
  const [items, setItems] = useState<ApiMarketItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"" | ApiMarketItemStatus>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setIsLoadingItems(true);
    try {
      const nextItems = await adminResourceApi.listMarketItems(
        statusFilter ? { status: statusFilter } : {},
      );
      setItems(nextItems);
    } catch (error) {
      setErrorMessage(readMarketErrorMessage(error));
    } finally {
      setIsLoadingItems(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <section className="mx-auto w-full max-w-7xl space-y-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-600 dark:text-slate-300 uppercase">
                Market
              </p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">
                연영장터
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 md:text-base">
                판매글 목록입니다. 카드를 클릭하면 상세 페이지에서 전체 정보를 확인할 수
                있습니다.
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                접속 사용자: {viewer.displayName}
              </p>
            </div>
            <Link
              href="/dashboard/market/new"
              className="inline-flex rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              판매글 작성
            </Link>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">판매글 목록</h2>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "" | ApiMarketItemStatus)
              }
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
            >
              <option value="">전체 상태</option>
              <option value="selling">판매중</option>
              <option value="reserved">예약중</option>
              <option value="sold">판매완료</option>
            </select>
          </div>

          {isLoadingItems ? (
            <ul
              className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
              aria-hidden="true"
            >
              {Array.from({ length: 6 }).map((_, index) => (
                <li
                  key={`market-grid-loading-${index + 1}`}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3"
                >
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="mt-3 h-5 w-3/4" />
                  <Skeleton className="mt-2 h-4 w-1/2" />
                  <Skeleton className="mt-2 h-4 w-2/3" />
                </li>
              ))}
            </ul>
          ) : items.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">등록된 판매글이 없습니다.</p>
          ) : (
            <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/dashboard/market/${item.id}`}
                    data-testid={`market-item-link-${item.id}`}
                    className="group block overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  >
                    <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-700">
                      {item.imageUrls[0] ? (
                        <Image
                          src={item.imageUrls[0]}
                          alt={`${item.name} 대표 이미지`}
                          fill
                          sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover"
                          unoptimized={shouldUseUnoptimizedImage(item.imageUrls[0])}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-slate-600 dark:text-slate-300">
                          이미지 없음
                        </div>
                      )}
                      <span
                        className={`absolute top-2 right-2 rounded-full border px-2 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[item.status]}`}
                      >
                        {STATUS_LABEL[item.status]}
                      </span>
                    </div>
                    <div className="space-y-1 p-3">
                      <p className="line-clamp-1 font-semibold text-slate-900 dark:text-slate-50">
                        {item.name}
                      </p>
                      <p className="text-sm text-slate-700 dark:text-slate-200">{formatPrice(item.price)}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        판매자: {buildMemberDisplayName(item.seller)}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        게시일: {formatPostedDate(item.createdAt)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {errorMessage ? (
          <p
            data-testid="market-error-message"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {errorMessage}
          </p>
        ) : null}
      </section>
    </main>
  );
}
