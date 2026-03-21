"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import { buildMemberDisplayName } from "@/features/dashboard/members/display-name";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";
import { hasMeaningfulRichTextHtml } from "@/features/media/rich-text/rich-text";
import { RichTextContent } from "@/features/media/rich-text/rich-text-content";
import type {
  ApiMarketComment,
  ApiMarketItem,
  ApiMarketItemStatus,
  ApiMarketPushSubscriptionInput,
} from "@/shared/contracts/api-contracts";
import { Skeleton } from "@/components/ui/skeleton";
import FormSubmitButton from "@/app/(dashboard)/_components/form-submit-button";
import {
  type MarketViewer,
  STATUS_BADGE_CLASS,
  STATUS_LABEL,
  formatPrice,
  isMarketAdminRole,
  readMarketErrorMessage,
} from "@/app/(dashboard)/dashboard/market/market-shared";

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }
  return outputArray;
};

const toArrayBuffer = (value: Uint8Array): ArrayBuffer => {
  const copy = Uint8Array.from(value);
  return copy.buffer;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

const readSubscriptionPayload = (
  subscription: PushSubscription,
): ApiMarketPushSubscriptionInput | null => {
  const asJson = subscription.toJSON();
  const endpoint = asJson.endpoint ?? subscription.endpoint;
  const p256dhFromJson = asJson.keys?.p256dh;
  const authFromJson = asJson.keys?.auth;
  const p256dh =
    p256dhFromJson ??
    (subscription.getKey("p256dh")
      ? arrayBufferToBase64(subscription.getKey("p256dh") as ArrayBuffer)
      : "");
  const auth =
    authFromJson ??
    (subscription.getKey("auth")
      ? arrayBufferToBase64(subscription.getKey("auth") as ArrayBuffer)
      : "");

  if (!endpoint || !p256dh || !auth) {
    return null;
  }

  return {
    endpoint,
    p256dh,
    auth,
  };
};

const formatPostedDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(date);
};

const clampIndex = (index: number, imageCount: number): number => {
  if (imageCount === 0) {
    return 0;
  }
  if (index < 0) {
    return imageCount - 1;
  }
  if (index >= imageCount) {
    return 0;
  }
  return index;
};

const EMPTY_IMAGE_URLS: readonly string[] = [];

const ChevronLeftIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
    <path
      d="M12.5 4.16667L6.66667 10L12.5 15.8333"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ChevronRightIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
    <path
      d="M7.5 4.16667L13.3333 10L7.5 15.8333"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
    <path
      d="M5 5L15 15"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15 5L5 15"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function MarketItemDetailPageClient({
  viewer,
  itemId,
}: {
  viewer: MarketViewer;
  itemId: string;
}) {
  const router = useRouter();
  const [item, setItem] = useState<ApiMarketItem | null>(null);
  const [comments, setComments] = useState<ApiMarketComment[]>([]);
  const [isLoadingItem, setIsLoadingItem] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [isCommentPending, setIsCommentPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState("");

  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [isPushPending, setIsPushPending] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageAspectRatios, setImageAspectRatios] = useState<Record<string, number>>({});
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const canManageItem = useMemo(
    () =>
      item !== null && (item.sellerId === viewer.id || isMarketAdminRole(viewer.role)),
    [item, viewer.id, viewer.role],
  );

  const isOwnerItem = item !== null && item.sellerId === viewer.id;
  const imageUrls = item?.imageUrls ?? EMPTY_IMAGE_URLS;
  const selectedImageUrl = imageUrls[selectedImageIndex] ?? null;
  const shouldUseUnoptimizedSelectedImage = selectedImageUrl
    ? shouldUseUnoptimizedImage(selectedImageUrl)
    : false;
  const selectedImageAspectRatio = selectedImageUrl
    ? (imageAspectRatios[selectedImageUrl] ?? 1)
    : 1;
  const modalImageFrameStyle = useMemo(() => {
    const ratio = selectedImageAspectRatio > 0 ? selectedImageAspectRatio : 1;
    return {
      width: `min(calc(100vw - 5rem), calc((100dvh - 8rem) * ${ratio}))`,
      height: `min(calc(100dvh - 8rem), calc((100vw - 5rem) / ${ratio}))`,
    };
  }, [selectedImageAspectRatio]);

  const metadataItems = useMemo(() => {
    if (!item) {
      return [];
    }

    return [
      { label: "판매자", value: buildMemberDisplayName(item.seller) },
      { label: "게시일", value: formatPostedDate(item.createdAt) },
      { label: "판매상태", value: STATUS_LABEL[item.status] },
      { label: "제품 상태 등급", value: item.conditionGrade ?? "-" },
      { label: "제조사", value: item.manufacturer ?? "-" },
      { label: "제품 코드", value: item.productCode ?? "-" },
    ];
  }, [item]);

  const loadItem = useCallback(async () => {
    setIsLoadingItem(true);
    try {
      const nextItem = await adminResourceApi.getMarketItemById(itemId);
      setItem(nextItem);
    } catch (error) {
      setErrorMessage(readMarketErrorMessage(error));
    } finally {
      setIsLoadingItem(false);
    }
  }, [itemId]);

  const loadComments = useCallback(async () => {
    setIsLoadingComments(true);
    try {
      const nextComments = await adminResourceApi.listMarketCommentsByItemId(itemId);
      setComments(nextComments);
    } catch (error) {
      setErrorMessage(readMarketErrorMessage(error));
    } finally {
      setIsLoadingComments(false);
    }
  }, [itemId]);

  useEffect(() => {
    void loadItem();
  }, [loadItem]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  useEffect(() => {
    setSelectedImageIndex(0);
    setImageAspectRatios({});
    setIsImageModalOpen(false);
  }, [item?.id]);

  const updateImageAspectRatio = useCallback(
    (imageUrl: string, naturalWidth: number, naturalHeight: number) => {
      if (naturalWidth <= 0 || naturalHeight <= 0) {
        return;
      }

      const ratio = naturalWidth / naturalHeight;
      if (!Number.isFinite(ratio) || ratio <= 0) {
        return;
      }

      setImageAspectRatios((previous) => {
        if (previous[imageUrl] === ratio) {
          return previous;
        }
        return {
          ...previous,
          [imageUrl]: ratio,
        };
      });
    },
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined" || imageUrls.length === 0) {
      return;
    }

    const preloadedImages: HTMLImageElement[] = [];
    for (const imageUrl of imageUrls) {
      if (imageAspectRatios[imageUrl]) {
        continue;
      }

      const preloaded = new window.Image();
      preloaded.decoding = "async";
      preloaded.onload = () => {
        updateImageAspectRatio(imageUrl, preloaded.naturalWidth, preloaded.naturalHeight);
      };
      preloaded.src = imageUrl;
      preloadedImages.push(preloaded);
    }

    return () => {
      for (const preloaded of preloadedImages) {
        preloaded.onload = null;
        preloaded.onerror = null;
      }
    };
  }, [imageAspectRatios, imageUrls, updateImageAspectRatio]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      typeof Notification === "undefined"
    ) {
      setIsPushSupported(false);
      setIsPushSubscribed(false);
      return;
    }

    setIsPushSupported(true);
    void (async () => {
      try {
        const registration = await navigator.serviceWorker.register("/market-sw.js");
        const subscription = await registration.pushManager.getSubscription();
        setIsPushSubscribed(subscription !== null);
      } catch {
        setIsPushSubscribed(false);
      }
    })();
  }, []);

  const showPreviousImage = useCallback(() => {
    setSelectedImageIndex((previous) => clampIndex(previous - 1, imageUrls.length));
  }, [imageUrls.length]);

  const showNextImage = useCallback(() => {
    setSelectedImageIndex((previous) => clampIndex(previous + 1, imageUrls.length));
  }, [imageUrls.length]);

  useEffect(() => {
    if (!isImageModalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsImageModalOpen(false);
      }
      if (event.key === "ArrowLeft") {
        showPreviousImage();
      }
      if (event.key === "ArrowRight") {
        showNextImage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isImageModalOpen, showNextImage, showPreviousImage]);

  const handleChangeStatus = async (status: ApiMarketItemStatus) => {
    if (!item || !canManageItem) {
      return;
    }

    setIsChangingStatus(true);
    setErrorMessage(null);
    try {
      const updatedItem = await adminResourceApi.updateMarketItemStatus(item.id, {
        status,
      });
      setItem(updatedItem);
    } catch (error) {
      setErrorMessage(readMarketErrorMessage(error));
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleCreateComment = async () => {
    if (!item) {
      return;
    }

    const nextContent = commentInput.trim();
    if (!nextContent) {
      setErrorMessage("댓글 내용을 입력해 주세요.");
      return;
    }

    setIsCommentPending(true);
    setErrorMessage(null);
    try {
      const createdComment = await adminResourceApi.createMarketComment(item.id, {
        content: nextContent,
      });
      setComments((previous) => [...previous, createdComment]);
      setCommentInput("");
    } catch (error) {
      setErrorMessage(readMarketErrorMessage(error));
    } finally {
      setIsCommentPending(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!item || !isOwnerItem || isDeletingItem) {
      return;
    }

    const confirmed = window.confirm("이 게시글을 삭제하시겠습니까?");
    if (!confirmed) {
      return;
    }

    setIsDeletingItem(true);
    setErrorMessage(null);
    try {
      await adminResourceApi.deleteMarketItem(item.id);
      router.replace("/dashboard/market");
      router.refresh();
    } catch (error) {
      setErrorMessage(readMarketErrorMessage(error));
    } finally {
      setIsDeletingItem(false);
    }
  };

  const handleRegisterPush = async () => {
    if (!isPushSupported || typeof Notification === "undefined") {
      setPushMessage("현재 브라우저는 웹푸시를 지원하지 않습니다.");
      return;
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";
    if (!vapidPublicKey) {
      setPushMessage("웹푸시 설정이 누락되었습니다. VAPID 공개 키를 확인해 주세요.");
      return;
    }

    setIsPushPending(true);
    setPushMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushMessage("알림 권한이 허용되지 않았습니다.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/market-sw.js");
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        const applicationServerKey = toArrayBuffer(urlBase64ToUint8Array(vapidPublicKey));
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      const payload = readSubscriptionPayload(subscription);
      if (!payload) {
        setPushMessage("알림 구독 정보를 읽을 수 없습니다.");
        return;
      }

      await adminResourceApi.upsertMarketPushSubscription(payload);
      setIsPushSubscribed(true);
      setPushMessage("댓글 알림이 활성화되었습니다.");
    } catch (error) {
      setPushMessage(readMarketErrorMessage(error));
    } finally {
      setIsPushPending(false);
    }
  };

  const handleUnregisterPush = async () => {
    if (!isPushSupported) {
      setPushMessage("현재 브라우저는 웹푸시를 지원하지 않습니다.");
      return;
    }

    setIsPushPending(true);
    setPushMessage(null);
    try {
      const registration = await navigator.serviceWorker.register("/market-sw.js");
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setIsPushSubscribed(false);
        setPushMessage("이미 알림이 해제되어 있습니다.");
        return;
      }

      const payload = readSubscriptionPayload(subscription);
      if (payload) {
        await adminResourceApi.deleteMarketPushSubscription(payload);
      }
      await subscription.unsubscribe();
      setIsPushSubscribed(false);
      setPushMessage("댓글 알림이 해제되었습니다.");
    } catch (error) {
      setPushMessage(readMarketErrorMessage(error));
    } finally {
      setIsPushPending(false);
    }
  };

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <section className="mx-auto w-full max-w-7xl space-y-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-600 dark:text-slate-300 uppercase">
                Market
              </p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">
                판매글 상세
              </h1>
              {item ? <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{item.name}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard/market"
                className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                목록으로
              </Link>
              {isOwnerItem && item ? (
                <>
                  <Link
                    href={`/dashboard/market/${item.id}/edit`}
                    data-testid="market-edit-link"
                    className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    게시글 수정
                  </Link>
                  <button
                    type="button"
                    data-testid="market-delete-button"
                    onClick={() => void handleDeleteItem()}
                    disabled={isDeletingItem}
                    className="inline-flex rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeletingItem ? "삭제 중..." : "게시글 삭제"}
                  </button>
                </>
              ) : null}
              <Link
                href="/dashboard/market/new"
                className="inline-flex rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                판매글 작성
              </Link>
            </div>
          </div>
        </div>

        {isLoadingItem ? (
          <section
            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm"
            aria-hidden="true"
          >
            <Skeleton className="h-80 w-full" />
            <Skeleton className="mt-4 h-6 w-1/2" />
            <Skeleton className="mt-2 h-4 w-2/3" />
            <Skeleton className="mt-2 h-4 w-1/3" />
          </section>
        ) : item ? (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr,0.95fr]">
            <article className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
              {selectedImageUrl ? (
                <div className="mx-auto w-full max-w-full space-y-4 md:max-w-[50vw]">
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700">
                    <button
                      type="button"
                      data-testid="market-main-image-button"
                      onClick={() => setIsImageModalOpen(true)}
                      className="relative block h-full w-full p-0"
                    >
                      <Image
                        src={selectedImageUrl}
                        alt={`${item.name} 선택 이미지`}
                        fill
                        sizes="(min-width: 768px) 50vw, 100vw"
                        className="object-cover object-center"
                        unoptimized={shouldUseUnoptimizedSelectedImage}
                        onLoad={(event) =>
                          updateImageAspectRatio(
                            selectedImageUrl,
                            event.currentTarget.naturalWidth,
                            event.currentTarget.naturalHeight,
                          )
                        }
                        priority
                      />
                    </button>
                    {imageUrls.length > 1 ? (
                      <>
                        <button
                          type="button"
                          data-testid="market-image-prev"
                          onClick={showPreviousImage}
                          aria-label="이전 이미지"
                          className="absolute top-1/2 left-3 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 shadow transition hover:bg-white/70"
                        >
                          <ChevronLeftIcon />
                        </button>
                        <button
                          type="button"
                          data-testid="market-image-next"
                          onClick={showNextImage}
                          aria-label="다음 이미지"
                          className="absolute top-1/2 right-3 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 shadow transition hover:bg-white/70"
                        >
                          <ChevronRightIcon />
                        </button>
                      </>
                    ) : null}
                  </div>

                  <ul className="grid grid-cols-6 gap-2 lg:grid-cols-8">
                    {imageUrls.map((url, index) => (
                      <li key={`${url}-${index + 1}`}>
                        <button
                          type="button"
                          data-testid={`market-thumbnail-${index}`}
                          aria-pressed={selectedImageIndex === index}
                          onClick={() => setSelectedImageIndex(index)}
                          className={`relative aspect-square w-full overflow-hidden rounded-lg border bg-slate-100 dark:bg-slate-700 transition ${
                            selectedImageIndex === index
                              ? "border-slate-900 ring-2 ring-slate-200"
                              : "border-slate-200 dark:border-slate-700 hover:border-slate-400"
                          }`}
                        >
                          <Image
                            src={url}
                            alt={`${item.name} 썸네일 ${index + 1}`}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                            className={`object-cover transition ${
                              selectedImageIndex === index
                                ? "brightness-50"
                                : "brightness-100"
                            }`}
                            unoptimized={shouldUseUnoptimizedImage(url)}
                            onLoad={(event) =>
                              updateImageAspectRatio(
                                url,
                                event.currentTarget.naturalWidth,
                                event.currentTarget.naturalHeight,
                              )
                            }
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300">
                  등록된 이미지가 없습니다.
                </div>
              )}
            </article>

            <article className="space-y-6">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{item.name}</h2>
                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[item.status]}`}
                  >
                    {STATUS_LABEL[item.status]}
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold text-slate-800 dark:text-slate-100">
                  {formatPrice(item.price)}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  {metadataItems.map((entry) => (
                    <div
                      key={entry.label}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
                    >
                      <p className="text-[11px] font-semibold tracking-wide text-slate-600 dark:text-slate-300 uppercase">
                        {entry.label}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {entry.value}
                      </p>
                    </div>
                  ))}
                </div>

                {item.description && hasMeaningfulRichTextHtml(item.description) ? (
                  <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-3">
                    <p className="text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-300 uppercase">
                      제품 설명
                    </p>
                    <RichTextContent
                      html={item.description}
                      className="mt-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
                    />
                  </div>
                ) : null}

                {canManageItem ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      data-testid="market-status-selling"
                      onClick={() => void handleChangeStatus("selling")}
                      disabled={isChangingStatus}
                      className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      판매중
                    </button>
                    <button
                      type="button"
                      data-testid="market-status-reserved"
                      onClick={() => void handleChangeStatus("reserved")}
                      disabled={isChangingStatus}
                      className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      예약중
                    </button>
                    <button
                      type="button"
                      data-testid="market-status-sold"
                      onClick={() => void handleChangeStatus("sold")}
                      disabled={isChangingStatus}
                      className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      판매완료
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  브라우저 댓글 알림
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  상세 페이지에서 댓글 알림 등록/해제를 할 수 있습니다.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    data-testid="market-push-register"
                    onClick={handleRegisterPush}
                    disabled={!isPushSupported || isPushPending}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPushPending ? "처리 중..." : "알림 등록"}
                  </button>
                  <button
                    type="button"
                    data-testid="market-push-unregister"
                    onClick={handleUnregisterPush}
                    disabled={!isPushSupported || isPushPending}
                    className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    알림 해제
                  </button>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    상태:{" "}
                    {isPushSupported
                      ? isPushSubscribed
                        ? "등록됨"
                        : "미등록"
                      : "지원 안 함"}
                  </p>
                </div>
                {pushMessage ? (
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{pushMessage}</p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">댓글</h3>
                {isLoadingComments ? (
                  <div className="mt-3 space-y-2" aria-hidden="true">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={`market-comment-loading-${index + 1}`}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3"
                      >
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="mt-2 h-3 w-full" />
                        <Skeleton className="mt-1 h-3 w-2/3" />
                      </div>
                    ))}
                  </div>
                ) : comments.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">아직 댓글이 없습니다.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {comments.map((comment) => (
                      <li
                        key={comment.id}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3"
                      >
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {buildMemberDisplayName(comment.author)}
                        </p>
                        <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{comment.content}</p>
                      </li>
                    ))}
                  </ul>
                )}

                <form className="mt-3 flex gap-2" action={handleCreateComment}>
                  <input
                    value={commentInput}
                    onChange={(event) => setCommentInput(event.target.value)}
                    placeholder="댓글 작성"
                    className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                    disabled={isCommentPending}
                  />
                  <FormSubmitButton
                    data-testid="market-comment-submit"
                    disabled={isCommentPending}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    idleLabel="등록"
                    pendingLabel="등록 중..."
                  />
                </form>
              </div>
            </article>
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <p className="text-sm text-slate-600 dark:text-slate-300">판매글을 찾을 수 없습니다.</p>
          </section>
        )}

        {isImageModalOpen && selectedImageUrl ? (
          <div
            data-testid="market-image-modal"
            className="fixed inset-0 z-50 bg-black/80 p-4"
            onClick={() => setIsImageModalOpen(false)}
          >
            <div className="relative h-full w-full">
              <button
                type="button"
                data-testid="market-image-modal-close"
                onClick={() => setIsImageModalOpen(false)}
                aria-label="닫기"
                className="absolute top-1 right-1 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-black/40 text-white transition hover:bg-black/55"
              >
                <CloseIcon />
              </button>
              <div className="flex h-full w-full items-center justify-center">
                <div
                  className="relative flex items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-black"
                  style={modalImageFrameStyle}
                  onClick={(event) => event.stopPropagation()}
                >
                  <Image
                    src={selectedImageUrl}
                    alt={`${item?.name ?? "상품"} 확대 이미지`}
                    fill
                    sizes="(min-width: 1024px) 80vw, 94vw"
                    className="object-contain object-center"
                    unoptimized={shouldUseUnoptimizedSelectedImage}
                    onLoad={(event) =>
                      updateImageAspectRatio(
                        selectedImageUrl,
                        event.currentTarget.naturalWidth,
                        event.currentTarget.naturalHeight,
                      )
                    }
                  />
                  {imageUrls.length > 1 ? (
                    <>
                      <button
                        type="button"
                        data-testid="market-image-modal-prev"
                        onClick={showPreviousImage}
                        aria-label="이전 이미지"
                        className="absolute top-1/2 left-4 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white dark:bg-slate-900/50 text-slate-700 dark:text-slate-200"
                      >
                        <ChevronLeftIcon />
                      </button>
                      <button
                        type="button"
                        data-testid="market-image-modal-next"
                        onClick={showNextImage}
                        aria-label="다음 이미지"
                        className="absolute top-1/2 right-4 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white dark:bg-slate-900/50 text-slate-700 dark:text-slate-200"
                      >
                        <ChevronRightIcon />
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

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
