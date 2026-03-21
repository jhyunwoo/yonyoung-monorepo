"use client";

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import { PRESIGN_PATHS } from "@/features/dashboard/api/admin-api/upload";
import { uploadFilesWithPresign } from "@/features/dashboard/api/admin-api/upload-batch";
import type {
  ApiMarketConditionGrade,
  ApiMarketItem,
  ApiUpdateMarketItemInput,
} from "@/shared/contracts/api-contracts";
import { hasMeaningfulRichTextHtml } from "@/features/media/rich-text/rich-text";
import { useImageUploadState } from "@/features/media/upload/use-image-upload-state";
import { Skeleton } from "@/components/ui/skeleton";
import RichTextEditor, {
  EMPTY_RICH_TEXT_HTML,
} from "@/app/(dashboard)/_components/rich-text-editor";
import FormSubmitButton from "@/app/(dashboard)/_components/form-submit-button";
import SortableImageGrid from "@/app/(dashboard)/_components/sortable-image-grid";
import UploadProgressBar from "@/app/(dashboard)/_components/upload-progress-bar";
import {
  CONDITION_OPTIONS,
  MARKET_MAX_IMAGES,
  type MarketViewer,
  readMarketErrorMessage,
} from "@/app/(dashboard)/dashboard/market/market-shared";

export default function MarketItemEditPageClient({
  itemId,
  viewer,
}: {
  itemId: string;
  viewer: MarketViewer;
}) {
  const router = useRouter();
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);

  const [item, setItem] = useState<ApiMarketItem | null>(null);
  const [isLoadingItem, setIsLoadingItem] = useState(true);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [productCode, setProductCode] = useState("");
  const [conditionGrade, setConditionGrade] = useState<"" | ApiMarketConditionGrade>("");
  const [description, setDescription] = useState(EMPTY_RICH_TEXT_HTML);
  const [price, setPrice] = useState("");

  const {
    items: imageItems,
    appendExistingUrls,
    removeItemById,
    reorderByIds,
    clear: clearImageItems,
  } = useImageUploadState({ maxItems: MARKET_MAX_IMAGES });

  const imageUrls = useMemo(
    () => imageItems.map((imageItem) => imageItem.imageUrl),
    [imageItems],
  );
  const isImageUploadDisabled =
    isSavingItem || isUploadingImage || imageUrls.length >= MARKET_MAX_IMAGES;

  const canEdit = item !== null && item.sellerId === viewer.id;

  const loadItem = useCallback(async () => {
    setIsLoadingItem(true);
    try {
      const nextItem = await adminResourceApi.getMarketItemById(itemId);
      setItem(nextItem);
      setName(nextItem.name);
      setManufacturer(nextItem.manufacturer ?? "");
      setProductCode(nextItem.productCode ?? "");
      setConditionGrade(nextItem.conditionGrade ?? "");
      setDescription(
        nextItem.description && nextItem.description.length > 0
          ? nextItem.description
          : EMPTY_RICH_TEXT_HTML,
      );
      setPrice(String(nextItem.price));
      clearImageItems();
      appendExistingUrls(nextItem.imageUrls);
    } catch (error) {
      setErrorMessage(readMarketErrorMessage(error));
    } finally {
      setIsLoadingItem(false);
    }
  }, [appendExistingUrls, clearImageItems, itemId]);

  useEffect(() => {
    void loadItem();
  }, [loadItem]);

  const handleUploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) {
      return;
    }

    const remainingSlots = MARKET_MAX_IMAGES - imageUrls.length;
    if (remainingSlots <= 0) {
      setErrorMessage(`이미지는 최대 ${MARKET_MAX_IMAGES}장까지 등록할 수 있습니다.`);
      return;
    }

    const uploadTargets = files.slice(0, remainingSlots);
    setIsUploadingImage(true);
    setUploadProgressPercent(0);
    setErrorMessage(null);

    try {
      const uploadedUrls = await uploadFilesWithPresign({
        presignPath: PRESIGN_PATHS.marketImage,
        files: uploadTargets,
        onProgress: setUploadProgressPercent,
      });
      appendExistingUrls(uploadedUrls);
    } catch (error) {
      setErrorMessage(readMarketErrorMessage(error));
    } finally {
      setIsUploadingImage(false);
      setUploadProgressPercent(null);
    }
  };

  const handleOpenImageFilePicker = () => {
    if (isImageUploadDisabled) {
      return;
    }

    imageFileInputRef.current?.click();
  };

  const handleUpdateItem = async () => {

    if (!item) {
      return;
    }

    const trimmedName = name.trim();
    const numericPrice = Number(price);
    if (!trimmedName) {
      setErrorMessage("판매물건 이름은 필수입니다.");
      return;
    }
    if (imageUrls.length === 0 || imageUrls.length > MARKET_MAX_IMAGES) {
      setErrorMessage(
        `상품 이미지는 1장 이상, 최대 ${MARKET_MAX_IMAGES}장까지 등록할 수 있습니다.`,
      );
      return;
    }
    if (!Number.isInteger(numericPrice) || numericPrice < 0) {
      setErrorMessage("가격은 0 이상의 원 단위 정수여야 합니다.");
      return;
    }

    const payload: ApiUpdateMarketItemInput = {
      name: trimmedName,
      imageUrls,
      manufacturer: manufacturer.trim() || null,
      productCode: productCode.trim() || null,
      conditionGrade: conditionGrade || null,
      description: hasMeaningfulRichTextHtml(description) ? description : null,
      price: numericPrice,
    };

    setIsSavingItem(true);
    setErrorMessage(null);
    try {
      await adminResourceApi.updateMarketItem(item.id, payload);
      router.push(`/dashboard/market/${item.id}`);
      router.refresh();
    } catch (error) {
      setErrorMessage(readMarketErrorMessage(error));
    } finally {
      setIsSavingItem(false);
    }
  };

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <section className="mx-auto w-full max-w-4xl space-y-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-600 dark:text-slate-300 uppercase">
            Market
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">
            판매글 수정
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 md:text-base">
            본인이 작성한 판매글만 수정할 수 있습니다.
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">작성자: {viewer.displayName}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              href={`/dashboard/market/${itemId}`}
              className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              상세로 돌아가기
            </Link>
            <Link
              href="/dashboard/market"
              className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              목록으로
            </Link>
          </div>
        </div>

        {isLoadingItem ? (
          <section
            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm"
            aria-hidden="true"
          >
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="mt-3 h-10 w-full" />
            <Skeleton className="mt-3 h-24 w-full" />
          </section>
        ) : !canEdit ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm">
            본인이 작성한 판매글만 수정할 수 있습니다.
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
            <form
              data-testid="market-edit-form"
              className="space-y-4"
              action={handleUpdateItem}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="판매물건 이름"
                  className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  disabled={isSavingItem || isUploadingImage}
                />
                <input
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="가격(원)"
                  inputMode="numeric"
                  className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  disabled={isSavingItem || isUploadingImage}
                />
                <input
                  value={manufacturer}
                  onChange={(event) => setManufacturer(event.target.value)}
                  placeholder="제조사 (선택)"
                  className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  disabled={isSavingItem || isUploadingImage}
                />
                <input
                  value={productCode}
                  onChange={(event) => setProductCode(event.target.value)}
                  placeholder="제품 코드 (선택)"
                  className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  disabled={isSavingItem || isUploadingImage}
                />
                <select
                  value={conditionGrade}
                  onChange={(event) =>
                    setConditionGrade(event.target.value as "" | ApiMarketConditionGrade)
                  }
                  className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  disabled={isSavingItem || isUploadingImage}
                >
                  {CONDITION_OPTIONS.map((option) => (
                    <option key={option || "none"} value={option}>
                      {option ? `상태 등급 ${option}` : "상태 등급 (선택)"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    제품 설명
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    선택 항목입니다. 강조, 목록, 링크 등 서식을 유지한 채 수정할 수 있습니다.
                  </p>
                </div>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  disabled={isSavingItem || isUploadingImage}
                  minHeight={180}
                />
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    data-testid="market-edit-image-upload-open"
                    onClick={handleOpenImageFilePicker}
                    disabled={isImageUploadDisabled}
                    className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    사진 업로드
                  </button>
                  <input
                    ref={imageFileInputRef}
                    data-testid="market-edit-image-input"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleUploadImage}
                    disabled={isImageUploadDisabled}
                    className="sr-only"
                  />
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    최소 1장, 최대 {MARKET_MAX_IMAGES}장
                  </p>
                </div>
                {!isUploadingImage && imageUrls.length >= MARKET_MAX_IMAGES ? (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                    최대 {MARKET_MAX_IMAGES}장까지 등록되어 추가 업로드가
                    비활성화되었습니다.
                  </p>
                ) : null}
                <UploadProgressBar
                  progressPercent={uploadProgressPercent}
                  label="장터 이미지 업로드 진행률"
                />
                <div className="mt-3">
                  <SortableImageGrid
                    items={imageItems.map((image, index) => ({
                      id: image.id,
                      imageUrl: image.imageUrl,
                      label: `상품 이미지 ${index + 1}`,
                      alt: "상품 이미지",
                    }))}
                    onReorder={(nextItems) =>
                      reorderByIds(nextItems.map((entry) => entry.id))
                    }
                    onRemoveItem={removeItemById}
                    disabled={isSavingItem || isUploadingImage}
                    emptyMessage="등록된 상품 이미지가 없습니다."
                  />
                </div>
              </div>

              <FormSubmitButton
                data-testid="market-edit-submit"
                disabled={isSavingItem || isUploadingImage}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                idleLabel="수정 저장"
                pendingLabel="저장 중..."
              />
            </form>
          </section>
        )}

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
