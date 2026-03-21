import { createDb } from "../../infra/db/client";

export default function createDB(database: D1Database) {
  return createDb(database);
}
