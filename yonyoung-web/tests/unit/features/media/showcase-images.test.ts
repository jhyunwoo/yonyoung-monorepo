import { describe, expect, it, vi } from "vitest";

import {
  SHOWCASE_MAX_IMAGES,
  normalizeShowcaseImageUrls,
  toShowcaseUploadImageItems,
} from "@/features/media/upload/showcase-images";

describe("features/media/upload/showcase-images", () => {
  it("normalizes showcase image urls", () => {
    const urls = normalizeShowcaseImageUrls([
      "  https://a.com/1.jpg  ",
      "https://a.com/1.jpg",
      "not-url",
      "ftp://a.com/x",
      "http://b.com/2.jpg",
    ]);

    expect(urls).toEqual(["https://a.com/1.jpg", "http://b.com/2.jpg"]);
  });

  it("caps showcase list and creates upload image items", () => {
    const input = Array.from({ length: SHOWCASE_MAX_IMAGES + 3 }).map(
      (_, index) => `https://cdn.example.com/${index}.jpg`,
    );

    const spy = vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("uuid");
    const items = toShowcaseUploadImageItems(input);

    expect(items).toHaveLength(SHOWCASE_MAX_IMAGES);
    expect(items[0]?.id).toBe("showcase-uuid");
    expect(items[0]?.source).toBe("existing");
    spy.mockRestore();
  });
});
