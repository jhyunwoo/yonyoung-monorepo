import { describe, expect, it, vi } from "vitest";
import { readR2TotalUsageBytes } from "../lib/storage/usage";

describe("readR2TotalUsageBytes", () => {
  it("페이지네이션된 객체 크기를 모두 합산한다", async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce({
        objects: [{ size: 1024 }, { size: 2048 }],
        truncated: true,
        cursor: "cursor-1",
      })
      .mockResolvedValueOnce({
        objects: [{ size: 4096 }],
        truncated: false,
        cursor: undefined,
      });

    const total = await readR2TotalUsageBytes({
      list,
    } as unknown as R2Bucket);

    expect(total).toBe(1024 + 2048 + 4096);
    expect(list).toHaveBeenNthCalledWith(1, {});
    expect(list).toHaveBeenNthCalledWith(2, { cursor: "cursor-1" });
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("버킷이 비어 있으면 0을 반환한다", async () => {
    const list = vi.fn().mockResolvedValue({
      objects: [],
      truncated: false,
      cursor: undefined,
    });

    const total = await readR2TotalUsageBytes({
      list,
    } as unknown as R2Bucket);

    expect(total).toBe(0);
    expect(list).toHaveBeenCalledWith({});
  });
});
