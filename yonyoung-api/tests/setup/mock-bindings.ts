import type { AppBindings } from "../../src/types/honoAppType";

const createMockD1PreparedStatement = (): D1PreparedStatement => {
  const prepared = {
    bind: (..._values: unknown[]) => prepared as unknown as D1PreparedStatement,
    first: async <T = Record<string, unknown>>() =>
      ({ result: 1 } as unknown as T),
    run: async <T = Record<string, unknown>>() =>
      ({
        success: true,
        meta: { duration: 0, rows_read: 0, rows_written: 0 },
        results: [] as T[],
      } as unknown as D1Result<T>),
    all: async <T = Record<string, unknown>>() =>
      ({
        success: true,
        meta: { duration: 0, rows_read: 0, rows_written: 0 },
        results: [] as T[],
      } as unknown as D1Result<T>),
    raw: async <T = unknown[]>(options?: { columnNames?: boolean }) => {
      if (options?.columnNames) {
        return ([[]] as unknown) as [string[], ...T[]];
      }

      return ([] as unknown) as T[];
    },
  };

  return prepared as unknown as D1PreparedStatement;
};

const createMockD1Result = <T>(results: T[] = []): D1Result<T> => {
  return {
    success: true,
    meta: { duration: 0, rows_read: 0, rows_written: 0 },
    results,
  } as unknown as D1Result<T>;
};

export const createMockD1Database = (): D1Database => {
  const database = {
    prepare: (_query: string) => createMockD1PreparedStatement(),
    batch: async <T = unknown>(_statements: D1PreparedStatement[]) =>
      [createMockD1Result<T>()],
    exec: async (_query: string) => ({ count: 0, duration: 0 }),
    dump: async () => new ArrayBuffer(0),
    withSession: (_bookmark?: D1SessionBookmark | D1SessionConstraint) =>
      ({
        prepare: (_query: string) => createMockD1PreparedStatement(),
        batch: async <T = unknown>(_statements: D1PreparedStatement[]) =>
          [createMockD1Result<T>()],
        getBookmark: () => "bookmark",
      }) as D1DatabaseSession,
  };

  return database as unknown as D1Database;
};

export const createMockR2Bucket = (): R2Bucket => {
  const store = new Map<string, string>();

  const bucket = {
    put: async (
      key: string,
      value:
        | string
        | ArrayBuffer
        | ReadableStream
        | ArrayBufferView
        | Blob
        | null,
    ) => {
      const text = typeof value === "string" ? value : "value";
      store.set(key, text);
      return {
        key,
        size: text.length,
      } as R2Object;
    },
    head: async (key: string) => {
      if (!store.has(key)) {
        return null;
      }

      const value = store.get(key) ?? "";
      return {
        key,
        size: value.length,
      } as R2Object;
    },
    delete: async (key: string) => {
      store.delete(key);
    },
    list: async (_options?: R2ListOptions) => {
      const objects = Array.from(store.entries()).map(([key, value]) => ({
        key,
        size: value.length,
      })) as R2Object[];

      return {
        objects,
        truncated: false,
        delimitedPrefixes: [],
      } as R2Objects;
    },
    get: async (key: string) => {
      if (!store.has(key)) {
        return null;
      }

      return {
        key,
      } as R2ObjectBody;
    },
  };

  return bucket as unknown as R2Bucket;
};

const createMockAssetsFetcher = (): Fetcher => {
  return new Proxy(
    {
      fetch: async () => new Response(null, { status: 404 }),
    },
    {
      get: (target, property, receiver) => {
        if (Reflect.has(target, property)) {
          return Reflect.get(target, property, receiver);
        }

        return () => {
          throw new Error(
            `The RPC receiver does not implement the method "${String(property)}".`,
          );
        };
      },
    },
  ) as unknown as Fetcher;
};

export const createHealthyBindings = (): AppBindings => {
  return {
    db: createMockD1Database(),
    DB: createMockD1Database(),
    r2: createMockR2Bucket(),
    R2: createMockR2Bucket(),
    ASSETS: createMockAssetsFetcher(),
    R2_S3_ENDPOINT: "https://example-account.r2.cloudflarestorage.com",
    R2_ACCESS_KEY_ID: "key",
    R2_SECRET_ACCESS_KEY: "secret",
    R2_BUCKET: "yonyoung-storage",
    R2_PUBLIC_BASE_URL: "https://storage.example.com",
    R2_PUBLIC_URL_SIGNING_SECRET:
      "test-public-url-signing-secret-at-least-32-chars",
    BETTER_AUTH_URL: "https://api.example.com",
    BETTER_AUTH_TRUSTED_ORIGINS: "https://app.example.com",
    BETTER_AUTH_SECRET: "test-better-auth-secret-with-at-least-32-chars",
  } as AppBindings;
};
