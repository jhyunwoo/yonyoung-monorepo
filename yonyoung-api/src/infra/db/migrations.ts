export type Migration = {
  name: string;
  sql: string;
};

const splitStatements = (sql: string): string[] => {
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)
    .map((statement) => `${statement};`);
};

export const applyMigrations = async (
  database: D1Database,
  migrations: Migration[],
): Promise<void> => {
  for (const migration of migrations) {
    const statements = splitStatements(migration.sql);
    for (const statement of statements) {
      await database.exec(statement);
    }
  }
};
