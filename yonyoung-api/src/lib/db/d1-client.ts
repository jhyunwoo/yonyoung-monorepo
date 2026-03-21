import { runWithD1WriteRetry, type D1WriteRetryOptions } from "./d1-retry";

const WRITE_QUERY_PREFIX = /^(insert|update|delete|replace|create|alter|drop|pragma)\b/i;

const isWriteQuery = (query: string): boolean => {
  return WRITE_QUERY_PREFIX.test(query.trim());
};

const wrapDatabaseSession = (
  session: D1DatabaseSession,
  options: D1WriteRetryOptions,
): D1DatabaseSession => {
  return {
    prepare: (query: string) => session.prepare(query),
    batch: <T = unknown>(statements: D1PreparedStatement[]) =>
      runWithD1WriteRetry(() => session.batch<T>(statements), options),
    getBookmark: () => session.getBookmark(),
  } as D1DatabaseSession;
};

const isD1DatabaseSession = (
  database: D1Database | D1DatabaseSession,
): database is D1DatabaseSession => {
  return "getBookmark" in database && !("withSession" in database);
};

export const createRetryingD1Database = (
  database: D1Database | D1DatabaseSession,
  input?: {
    enabled?: boolean;
    options?: D1WriteRetryOptions;
  },
): D1Database | D1DatabaseSession => {
  if (!input?.enabled) {
    return database;
  }

  const options = input.options ?? {};

  if (isD1DatabaseSession(database)) {
    return wrapDatabaseSession(database, options);
  }

  const baseDatabase = database;

  return {
    prepare: (query: string) => baseDatabase.prepare(query),
    batch: <T = unknown>(statements: D1PreparedStatement[]) =>
      runWithD1WriteRetry(() => baseDatabase.batch<T>(statements), options),
    exec: (query: string) =>
      isWriteQuery(query)
        ? runWithD1WriteRetry(() => baseDatabase.exec(query), options)
        : baseDatabase.exec(query),
    withSession: (
      constraintOrBookmark?: D1SessionBookmark | D1SessionConstraint,
    ) =>
      wrapDatabaseSession(
        baseDatabase.withSession(constraintOrBookmark),
        options,
      ),
    dump: () => baseDatabase.dump(),
  } as D1Database;
};
