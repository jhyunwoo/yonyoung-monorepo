import { useCallback, useEffect, useRef, useState } from "react";
import {
  createExistingUploadImageItem,
  createNewUploadImageItem,
  readFileList,
  readUploadFileFingerprint,
  reorderUploadImageItems,
  revokeUploadImageItem,
  revokeUploadImageItems,
  type UploadImageItem,
} from "@/features/media/upload/image-upload-state";

const readRemovedItems = (
  previousItems: UploadImageItem[],
  nextItems: UploadImageItem[],
): UploadImageItem[] => {
  const nextItemIdSet = new Set(nextItems.map((item) => item.id));
  return previousItems.filter((item) => !nextItemIdSet.has(item.id));
};

type UseImageUploadStateOptions = {
  initialItems?: UploadImageItem[];
  maxItems?: number;
};

const readItemIdentityKey = (item: UploadImageItem): string => {
  if (item.source === "existing") {
    return `existing:${item.imageUrl}`;
  }

  if (item.file) {
    return `new:${readUploadFileFingerprint(item.file)}`;
  }

  return `new:${item.imageUrl}`;
};

const clampItemsByMaxCount = (
  items: UploadImageItem[],
  maxItems: number | undefined,
): UploadImageItem[] => {
  if (!maxItems || maxItems <= 0) {
    return items;
  }
  return items.slice(0, maxItems);
};

const dedupeItemsByIdentity = (items: UploadImageItem[]): UploadImageItem[] => {
  const deduped: UploadImageItem[] = [];
  const seenKeys = new Set<string>();

  for (const item of items) {
    const key = readItemIdentityKey(item);
    if (seenKeys.has(key)) {
      revokeUploadImageItem(item);
      continue;
    }
    seenKeys.add(key);
    deduped.push(item);
  }

  return deduped;
};

const normalizeItems = (
  items: UploadImageItem[],
  maxItems: number | undefined,
): UploadImageItem[] => {
  const dedupedItems = dedupeItemsByIdentity(items);
  const limitedItems = clampItemsByMaxCount(dedupedItems, maxItems);
  if (limitedItems.length < dedupedItems.length) {
    revokeUploadImageItems(dedupedItems.slice(limitedItems.length));
  }
  return limitedItems;
};

export const useImageUploadState = (options: UseImageUploadStateOptions = {}) => {
  const initialItems = options.initialItems ?? [];
  const initialNormalizedItemsRef = useRef<UploadImageItem[] | null>(null);
  if (initialNormalizedItemsRef.current === null) {
    initialNormalizedItemsRef.current = normalizeItems(initialItems, options.maxItems);
  }

  const [items, setItems] = useState<UploadImageItem[]>(
    initialNormalizedItemsRef.current,
  );
  const itemsRef = useRef<UploadImageItem[]>(initialNormalizedItemsRef.current);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    return () => {
      revokeUploadImageItems(itemsRef.current);
    };
  }, []);

  const replaceItems = useCallback(
    (nextItems: UploadImageItem[]) => {
      const normalizedItems = normalizeItems(nextItems, options.maxItems);
      const removedItems = readRemovedItems(itemsRef.current, normalizedItems);
      revokeUploadImageItems(removedItems);
      itemsRef.current = normalizedItems;
      setItems(normalizedItems);
    },
    [options.maxItems],
  );

  const appendFiles = useCallback(
    (files: FileList | File[] | null) => {
      const nextFiles = Array.isArray(files) ? files : readFileList(files);
      if (nextFiles.length === 0) {
        return;
      }

      const nextItems = nextFiles.map((file) => createNewUploadImageItem(file));
      setItems((previousItems) =>
        normalizeItems([...previousItems, ...nextItems], options.maxItems),
      );
    },
    [options.maxItems],
  );

  const appendExistingUrls = useCallback(
    (urls: string[]) => {
      const normalizedUrls = urls
        .map((url) => url.trim())
        .filter((url) => url.length > 0);
      if (normalizedUrls.length === 0) {
        return;
      }

      const nextItems = normalizedUrls.map((url) =>
        createExistingUploadImageItem({
          id: `existing-${crypto.randomUUID()}`,
          imageUrl: url,
        }),
      );
      setItems((previousItems) =>
        normalizeItems([...previousItems, ...nextItems], options.maxItems),
      );
    },
    [options.maxItems],
  );

  const removeItemById = useCallback((itemId: string) => {
    setItems((previousItems) => {
      const target = previousItems.find((item) => item.id === itemId);
      if (target) {
        revokeUploadImageItem(target);
      }
      return previousItems.filter((item) => item.id !== itemId);
    });
  }, []);

  const reorderByIds = useCallback((orderedIds: string[]) => {
    setItems((previousItems) => reorderUploadImageItems(previousItems, orderedIds));
  }, []);

  const clear = useCallback(() => {
    setItems((previousItems) => {
      revokeUploadImageItems(previousItems);
      return [];
    });
  }, []);

  return {
    items,
    replaceItems,
    appendFiles,
    appendExistingUrls,
    removeItemById,
    reorderByIds,
    clear,
  };
};
