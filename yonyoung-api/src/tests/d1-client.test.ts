import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/db/d1-retry", () => ({
  runWithD1WriteRetry: vi.fn(
    async <T>(operation: () => Promise<T>): Promise<T> => operation(),
  ),
}));

import { createRetryingD1Database } from "../lib/db/d1-client";
import { runWithD1WriteRetry } from "../lib/db/d1-retry";

type PreparedStatementMock = {
  bind: ReturnType<typeof vi.fn>;
  first: ReturnType<typeof vi.fn>;
  run: ReturnType<typeof vi.fn>;
  all: ReturnType<typeof vi.fn>;
  raw: ReturnType<typeof vi.fn>;
  statement: D1PreparedStatement;
};

const createPreparedStatementMock = (): PreparedStatementMock => {
  const statement = {} as D1PreparedStatement;
  const bind = vi.fn((...values: unknown[]) => {
    void values;
    return statement;
  });
  const first = vi.fn(async (...args: unknown[]) => {
    void args;
    return { id: "first" };
  });
  const run = vi.fn(async () => ({ success: true }));
  const all = vi.fn(async () => ({ results: [] }));
  const raw = vi.fn(async (...args: unknown[]) => {
    void args;
    return [];
  });

  Object.assign(statement, {
    bind,
    first,
    run,
    all,
    raw,
  });

  return {
    bind,
    first,
    run,
    all,
    raw,
    statement,
  };
};

const createDatabaseMock = () => {
  const basePrepared = createPreparedStatementMock();
  const sessionPrepared = createPreparedStatementMock();
  const session = {
    prepare: vi.fn((query: string) => {
      void query;
      return sessionPrepared.statement;
    }),
    batch: vi.fn(async <T = unknown>(statements: D1PreparedStatement[]) => {
      void statements;
      return [] as T[];
    }),
    getBookmark: vi.fn(() => "bookmark"),
  } as unknown as D1DatabaseSession;

  const database = {
    prepare: vi.fn((query: string) => {
      void query;
      return basePrepared.statement;
    }),
    batch: vi.fn(async <T = unknown>(statements: D1PreparedStatement[]) => {
      void statements;
      return [] as T[];
    }),
    exec: vi.fn(async (query: string) => {
      void query;
      return { count: 1 };
    }),
    withSession: vi.fn((bookmark?: D1SessionBookmark | D1SessionConstraint) => {
      void bookmark;
      return session;
    }),
    dump: vi.fn(async () => new ArrayBuffer(0)),
  } as unknown as D1Database;

  return {
    database,
    session,
    basePrepared,
    sessionPrepared,
  };
};

describe("createRetryingD1Database", () => {
  const runWithRetryMock = vi.mocked(runWithD1WriteRetry);

  beforeEach(() => {
    runWithRetryMock.mockClear();
  });

  it("retry 기능이 비활성화되면 원본 데이터베이스를 그대로 반환한다", () => {
    const { database } = createDatabaseMock();

    const result = createRetryingD1Database(database, {
      enabled: false,
    });

    expect(result).toBe(database);
    expect(runWithRetryMock).not.toHaveBeenCalled();
  });

  it("쓰기 exec/batch/withSession.batch는 retry로 감싼다", async () => {
    const { database, basePrepared, session, sessionPrepared } = createDatabaseMock();
    const wrapped = createRetryingD1Database(database, {
      enabled: true,
      options: { maxRetries: 3 },
    }) as D1Database;

    const writePrepared = wrapped.prepare("INSERT INTO activities VALUES (?)");
    const bound = writePrepared.bind("activity-id");
    await bound.first();
    await bound.run();
    await bound.all();
    await bound.raw();
    await wrapped.exec("UPDATE activities SET title = 'x'");
    await wrapped.batch([]);
    await wrapped.withSession("bookmark").batch([]);

    expect(basePrepared.bind).toHaveBeenCalledWith("activity-id");
    expect(basePrepared.first).toHaveBeenCalledTimes(1);
    expect(basePrepared.run).toHaveBeenCalledTimes(1);
    expect(basePrepared.all).toHaveBeenCalledTimes(1);
    expect(basePrepared.raw).toHaveBeenCalledTimes(1);
    expect(database.exec).toHaveBeenCalledTimes(1);
    expect(database.batch).toHaveBeenCalledTimes(1);
    expect(database.withSession).toHaveBeenCalledWith("bookmark");
    expect(session.batch).toHaveBeenCalledTimes(1);
    expect(sessionPrepared.run).not.toHaveBeenCalled();
    expect(runWithRetryMock).toHaveBeenCalledTimes(3);
  });

  it("읽기 쿼리는 retry를 적용하지 않는다", async () => {
    const { database, basePrepared } = createDatabaseMock();
    const wrapped = createRetryingD1Database(database, {
      enabled: true,
    }) as D1Database;

    const readPrepared = wrapped.prepare("SELECT * FROM activities");
    await readPrepared.run();
    await wrapped.exec("SELECT 1");

    expect(basePrepared.run).toHaveBeenCalledTimes(1);
    expect(database.exec).toHaveBeenCalledTimes(1);
    expect(runWithRetryMock).not.toHaveBeenCalled();
  });

  it("session 객체를 직접 입력하면 batch만 retry로 감싼다", async () => {
    const { session, sessionPrepared } = createDatabaseMock();
    const wrappedSession = createRetryingD1Database(session, {
      enabled: true,
    }) as D1DatabaseSession;

    expect(wrappedSession.getBookmark()).toBe("bookmark");

    const writePrepared = wrappedSession.prepare("DELETE FROM activities");
    await writePrepared.run();
    await wrappedSession.batch([]);

    const readPrepared = wrappedSession.prepare("SELECT * FROM activities");
    await readPrepared.run();

    expect(sessionPrepared.run).toHaveBeenCalledTimes(2);
    expect(runWithRetryMock).toHaveBeenCalledTimes(1);
  });

  it("getBookmark 필드가 있어도 withSession이 있으면 DB 래퍼로 처리한다", async () => {
    const { database } = createDatabaseMock();
    const hybrid = {
      ...database,
      getBookmark: vi.fn(() => "bookmark-db"),
    } as unknown as D1Database & {
      getBookmark: () => string;
    };

    const wrapped = createRetryingD1Database(hybrid, {
      enabled: true,
    }) as D1Database;

    await wrapped.exec("SELECT 1");

    expect(database.exec).toHaveBeenCalledTimes(1);
    expect(wrapped).toHaveProperty("withSession");
    expect(runWithRetryMock).not.toHaveBeenCalled();
  });
});
