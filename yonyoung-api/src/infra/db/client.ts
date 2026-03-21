import { drizzle } from "drizzle-orm/d1";
import type { Bindings } from "../../bindings/types";
import { AppError } from "../../shared/errors/AppError";
import * as schema from "../../lib/db/schema";

export const resolveD1Database = (
  env: Pick<Bindings, "DB" | "db">,
): D1Database => {
  const database = env.DB ?? env.db;
  if (!database) {
    throw AppError.internal("D1 데이터베이스 바인딩이 구성되지 않았습니다.");
  }

  return database;
};

export const createDb = (database: D1Database) => {
  return drizzle(database, { schema });
};

export type DbClient = ReturnType<typeof createDb>;

export const createDbFromEnv = (env: Pick<Bindings, "DB" | "db">) => {
  return createDb(resolveD1Database(env));
};
