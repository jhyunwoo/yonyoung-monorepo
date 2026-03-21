import createDB from ".";
import { createDbDataService } from "../services/db-service";
import type { DataService } from "../services/types";

const drizzleClientCache = new WeakMap<D1Database, ReturnType<typeof createDB>>();
const dataServiceCache = new WeakMap<D1Database, DataService>();

export const getDbClient = (database: D1Database): ReturnType<typeof createDB> => {
  const cached = drizzleClientCache.get(database);
  if (cached) {
    return cached;
  }

  const db = createDB(database);
  drizzleClientCache.set(database, db);
  return db;
};

export const getDbDataService = (database: D1Database): DataService => {
  const cached = dataServiceCache.get(database);
  if (cached) {
    return cached;
  }

  const service = createDbDataService(database);
  dataServiceCache.set(database, service);
  return service;
};
