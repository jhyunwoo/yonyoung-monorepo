import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/db", () => ({
  default: vi.fn((database: D1Database) => ({ database, kind: "client" })),
}));

vi.mock("../lib/services/db-service", () => ({
  createDbDataService: vi.fn((database: D1Database) => ({
    database,
    kind: "service",
  })),
}));

import createDB from "../lib/db";
import { getDbClient, getDbDataService } from "../lib/db/factory";
import { createDbDataService } from "../lib/services/db-service";

const createDatabase = (): D1Database => {
  return {} as D1Database;
};

describe("db factory cache", () => {
  const createDbMock = vi.mocked(createDB);
  const createDbDataServiceMock = vi.mocked(createDbDataService);

  beforeEach(() => {
    createDbMock.mockClear();
    createDbDataServiceMock.mockClear();
  });

  it("같은 D1 인스턴스에 대해 drizzle client를 재사용한다", () => {
    const database = createDatabase();

    const first = getDbClient(database);
    const second = getDbClient(database);

    expect(first).toBe(second);
    expect(createDbMock).toHaveBeenCalledTimes(1);
    expect(createDbMock).toHaveBeenCalledWith(database);
  });

  it("다른 D1 인스턴스면 서로 다른 drizzle client를 생성한다", () => {
    const firstDatabase = createDatabase();
    const secondDatabase = createDatabase();

    const first = getDbClient(firstDatabase);
    const second = getDbClient(secondDatabase);

    expect(first).not.toBe(second);
    expect(createDbMock).toHaveBeenCalledTimes(2);
  });

  it("같은 D1 인스턴스에 대해 data service를 재사용한다", () => {
    const database = createDatabase();

    const first = getDbDataService(database);
    const second = getDbDataService(database);

    expect(first).toBe(second);
    expect(createDbDataServiceMock).toHaveBeenCalledTimes(1);
    expect(createDbDataServiceMock).toHaveBeenCalledWith(database);
  });

  it("다른 D1 인스턴스면 서로 다른 data service를 생성한다", () => {
    const firstDatabase = createDatabase();
    const secondDatabase = createDatabase();

    const first = getDbDataService(firstDatabase);
    const second = getDbDataService(secondDatabase);

    expect(first).not.toBe(second);
    expect(createDbDataServiceMock).toHaveBeenCalledTimes(2);
  });
});
