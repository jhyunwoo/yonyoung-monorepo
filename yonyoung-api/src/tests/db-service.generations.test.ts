import { beforeEach, describe, expect, it, vi } from "vitest";
import { activities, exhibitions, generationNotices, generations } from "../lib/db/schema";

const createDBMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/db", () => ({
  default: createDBMock,
}));

import { createDbDataService } from "../lib/services/db-service";

const createMockDb = () => {
  const findMany = vi.fn(async () => [] as Array<{ id: string }>);
  const insertValues = vi.fn(async () => undefined);
  const insert = vi.fn(() => ({ values: insertValues }));
  const deleteWhere = vi.fn(async () => undefined);
  const remove = vi.fn(() => ({ where: deleteWhere }));

  return {
    db: {
      query: {
        generations: {
          findMany,
        },
      },
      insert,
      delete: remove,
    },
    findMany,
    insert,
    insertValues,
    remove,
  };
};

describe("db service generations create", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    createDBMock.mockReset();
  });

  it("같은 이름 기수가 있으면 기존 데이터 삭제 후 새로 생성한다", async () => {
    const mockDb = createMockDb();
    mockDb.findMany.mockResolvedValueOnce([{ id: "old-generation-id" }]);
    createDBMock.mockReturnValue(mockDb.db as never);

    const service = createDbDataService({} as D1Database);
    const getGenerationById = vi.fn(async () => ({
      id: "new-generation-id",
      name: "60기",
      sortOrder: 60,
      startDate: new Date("2030-01-01T00:00:00.000Z"),
      endDate: new Date("2030-12-31T00:00:00.000Z"),
      createdAt: new Date("2030-01-01T00:00:00.000Z"),
      updatedAt: new Date("2030-01-01T00:00:00.000Z"),
      updatedBy: null,
    }));
    Object.assign(service, { getGenerationById });
    vi.spyOn(crypto, "randomUUID").mockReturnValue("new-generation-id");

    const result = await service.createGeneration({
      name: " 60기 ",
      sortOrder: 60,
      startDate: Date.parse("2030-01-01T00:00:00.000Z"),
      endDate: Date.parse("2030-12-31T00:00:00.000Z"),
    });

    expect(mockDb.remove).toHaveBeenNthCalledWith(1, activities);
    expect(mockDb.remove).toHaveBeenNthCalledWith(2, exhibitions);
    expect(mockDb.remove).toHaveBeenNthCalledWith(3, generationNotices);
    expect(mockDb.remove).toHaveBeenNthCalledWith(4, generations);
    expect(mockDb.insert).toHaveBeenCalledWith(generations);
    expect(mockDb.insertValues).toHaveBeenCalledWith({
      id: "new-generation-id",
      name: "60기",
      sortOrder: 60,
      startDate: new Date("2030-01-01T00:00:00.000Z"),
      endDate: new Date("2030-12-31T00:00:00.000Z"),
    });
    expect(getGenerationById).toHaveBeenCalledWith("new-generation-id");
    expect(result.id).toBe("new-generation-id");
  });

  it("같은 이름 기수가 없으면 기존 데이터 삭제 없이 생성한다", async () => {
    const mockDb = createMockDb();
    mockDb.findMany.mockResolvedValueOnce([]);
    createDBMock.mockReturnValue(mockDb.db as never);

    const service = createDbDataService({} as D1Database);
    Object.assign(service, {
      getGenerationById: vi.fn(async () => ({
        id: "new-generation-id",
        name: "61기",
        sortOrder: 61,
        startDate: new Date("2031-01-01T00:00:00.000Z"),
        endDate: new Date("2031-12-31T00:00:00.000Z"),
        createdAt: new Date("2031-01-01T00:00:00.000Z"),
        updatedAt: new Date("2031-01-01T00:00:00.000Z"),
        updatedBy: null,
      })),
    });
    vi.spyOn(crypto, "randomUUID").mockReturnValue("new-generation-id");

    await service.createGeneration({
      name: "61기",
      sortOrder: 61,
      startDate: Date.parse("2031-01-01T00:00:00.000Z"),
      endDate: Date.parse("2031-12-31T00:00:00.000Z"),
    });

    expect(mockDb.remove).not.toHaveBeenCalled();
    expect(mockDb.insert).toHaveBeenCalledWith(generations);
  });
});
