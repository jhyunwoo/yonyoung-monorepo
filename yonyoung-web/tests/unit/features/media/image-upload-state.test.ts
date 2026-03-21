import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createExistingUploadImageItem,
  createNewUploadImageItem,
  readFileList,
  readUploadFileFingerprint,
  reorderUploadImageItems,
  revokeUploadImageItem,
  revokeUploadImageItems,
} from "@/features/media/upload/image-upload-state";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("features/media/upload/image-upload-state", () => {
  it("reads upload file fingerprints", () => {
    const file = new File(["abc"], "a.png", {
      type: "image/png",
      lastModified: 123,
    });

    expect(readUploadFileFingerprint(file)).toBe("a.png:3:123:image/png");
  });

  it("reads FileList safely", () => {
    const first = new File(["1"], "1.png", { type: "image/png" });
    const second = new File(["2"], "2.png", { type: "image/png" });
    const fileList = {
      0: first,
      1: second,
      length: 2,
      item: (index: number) => [first, second][index] ?? null,
      [Symbol.iterator]: function* () {
        yield first;
        yield second;
      },
    } as unknown as FileList;

    expect(readFileList(fileList)).toEqual([first, second]);
    expect(readFileList(null)).toEqual([]);
  });

  it("creates and reorders upload image items", () => {
    const createSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockImplementation(() => "blob:local-image");

    const file = new File(["x"], "x.png", { type: "image/png" });
    const newItem = createNewUploadImageItem(file, "profile");

    expect(newItem.id.startsWith("profile-")).toBe(true);
    expect(newItem.imageUrl).toBe("blob:local-image");
    expect(newItem.source).toBe("new");
    expect(createSpy).toHaveBeenCalledOnce();

    const existing = createExistingUploadImageItem({ id: "ex-1", imageUrl: "https://img/ex-1" });
    const reordered = reorderUploadImageItems(
      [existing, newItem],
      [newItem.id, "unknown", existing.id],
    );
    expect(reordered.map((item) => item.id)).toEqual([newItem.id, existing.id]);
  });

  it("revokes only new image object URLs", () => {
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    const existing = createExistingUploadImageItem({ id: "ex-1", imageUrl: "https://img/ex-1" });
    const newItem = {
      id: "new-1",
      imageUrl: "blob:new-1",
      source: "new" as const,
      file: new File(["x"], "x.png", { type: "image/png" }),
    };

    revokeUploadImageItem(existing);
    revokeUploadImageItem(newItem);
    revokeUploadImageItems([existing, newItem]);

    expect(revokeSpy).toHaveBeenCalledTimes(2);
    expect(revokeSpy).toHaveBeenNthCalledWith(1, "blob:new-1");
  });
});
