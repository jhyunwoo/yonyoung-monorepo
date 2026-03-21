export type UploadImageSource = "existing" | "new";

export type UploadImageItem = {
  id: string;
  imageUrl: string;
  source: UploadImageSource;
  file: File | null;
};

export const readUploadFileFingerprint = (file: File): string => {
  return [file.name, file.size, file.lastModified, file.type].join(":");
};

export const readFileList = (files: FileList | null): File[] => {
  if (!files) {
    return [];
  }

  return Array.from(files);
};

export const createNewUploadImageItem = (
  file: File,
  idPrefix = "new",
): UploadImageItem => ({
  id: `${idPrefix}-${crypto.randomUUID()}`,
  imageUrl: URL.createObjectURL(file),
  source: "new",
  file,
});

export const createExistingUploadImageItem = (input: {
  id: string;
  imageUrl: string;
}): UploadImageItem => ({
  id: input.id,
  imageUrl: input.imageUrl,
  source: "existing",
  file: null,
});

export const reorderUploadImageItems = (
  items: UploadImageItem[],
  orderedIds: string[],
): UploadImageItem[] => {
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const orderedItems = orderedIds
    .map((id) => itemMap.get(id))
    .filter((item): item is UploadImageItem => item !== undefined);
  const orderedIdSet = new Set(orderedItems.map((item) => item.id));

  const remainingItems = items.filter((item) => !orderedIdSet.has(item.id));
  return [...orderedItems, ...remainingItems];
};

export const revokeUploadImageItem = (item: UploadImageItem): void => {
  if (item.source !== "new") {
    return;
  }

  URL.revokeObjectURL(item.imageUrl);
};

export const revokeUploadImageItems = (items: UploadImageItem[]): void => {
  for (const item of items) {
    revokeUploadImageItem(item);
  }
};
