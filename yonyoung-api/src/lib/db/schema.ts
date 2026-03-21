import { relations, sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

const nowTimestamp = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

export const generations = sqliteTable(
  "generations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().unique(),
    startDate: integer("start_date", { mode: "timestamp_ms" }).notNull(),
    endDate: integer("end_date", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate(/** integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
    /**
   * sqliteTable 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
   * @param table 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
   */
  (table) => [index("generations_start_date_idx").on(table.startDate)],
);

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  showcaseImageUrls: text("showcase_image_urls").default("[]").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(nowTimestamp)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(nowTimestamp)
    .$onUpdate(/** integer("updated_at", { mode: "timestamp_ms" })
    .default(nowTimestamp)
    .$onUpdate 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => /* @__PURE__ */ new Date())
    .notNull(),
  familyName: text("family_name"),
  givenName: text("given_name"),
  college: text("college"),
  department: text("department"),
  studentNumber: text("student_number"),
  phoneNumber: text("phone_number"),
  collaborationAvailable: integer("collaboration_available", { mode: "boolean" })
    .default(false)
    .notNull(),
  personalLink: text("personal_link"),
  role: text("role").default("unverified"),
  generationId: text("generation_id").references(/** text("generation_id").references 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => generations.id, {
    onDelete: "set null",
  }),
  latestGenerationSortOrder: integer("latest_generation_sort_order"),
  deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
});

export const userGenerations = sqliteTable(
  "user_generations",
  {
    userId: text("user_id")
      .notNull()
      .references(/** text("user_id")
      .notNull()
      .references 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => user.id, {
        onDelete: "cascade",
      }),
    generationId: text("generation_id")
      .notNull()
      .references(/** text("generation_id")
      .notNull()
      .references 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => generations.id, {
        onDelete: "cascade",
      }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
  },
    /**
   * sqliteTable 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
   * @param table 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
   */
  (table) => [
    primaryKey({ columns: [table.userId, table.generationId] }),
    index("user_generations_user_id_idx").on(table.userId),
    index("user_generations_generation_id_idx").on(table.generationId),
  ],
);

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(/** integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(/** text("user_id")
      .notNull()
      .references 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => user.id, { onDelete: "cascade" }),
  },
    /**
   * sqliteTable 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
   * @param table 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
   */
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(/** text("user_id")
      .notNull()
      .references 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(/** integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => /* @__PURE__ */ new Date())
      .notNull(),
  },
    /**
   * sqliteTable 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
   * @param table 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
   */
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate(/** integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => /* @__PURE__ */ new Date())
      .notNull(),
  },
    /**
   * sqliteTable 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
   * @param table 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
   */
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const activities = sqliteTable(
  "activities",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    startDate: integer("start_date", { mode: "timestamp_ms" }).notNull(),
    endDate: integer("end_date", { mode: "timestamp_ms" }).notNull(),
    coverImageUrl: text("cover_image_url").notNull(),
    generationId: text("generation_id")
      .notNull()
      .references(/** text("generation_id")
      .notNull()
      .references 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => generations.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate(/** integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
    /**
   * sqliteTable 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
   * @param table 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
   */
  (table) => [
    index("activities_generation_id_idx").on(table.generationId),
    index("activities_start_date_idx").on(table.startDate),
    index("activities_end_date_idx").on(table.endDate),
  ],
);

export const activityImages = sqliteTable(
  "activity_images",
  {
    id: text("id").primaryKey(),
    activityId: text("activity_id")
      .notNull()
      .references(/** text("activity_id")
      .notNull()
      .references 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => activities.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate(/** integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
    /**
   * sqliteTable 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
   * @param table 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
   */
  (table) => [
    index("activity_images_activity_id_idx").on(table.activityId),
    index("activity_images_sort_order_idx").on(table.sortOrder),
  ],
);

export const exhibitions = sqliteTable(
  "exhibitions",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    startDate: integer("start_date", { mode: "timestamp_ms" }).notNull(),
    endDate: integer("end_date", { mode: "timestamp_ms" }).notNull(),
    generationId: text("generation_id")
      .notNull()
      .references(/** text("generation_id")
      .notNull()
      .references 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => generations.id),
    place: text("place").notNull(),
    coverImageUrl: text("cover_image_url").notNull(),
    description: text("description").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate(/** integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
    /**
   * sqliteTable 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
   * @param table 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
   */
  (table) => [
    index("exhibitions_generation_id_idx").on(table.generationId),
    index("exhibitions_start_date_idx").on(table.startDate),
    index("exhibitions_end_date_idx").on(table.endDate),
  ],
);

export const exhibitionImages = sqliteTable(
  "exhibition_images",
  {
    id: text("id").primaryKey(),
    exhibitionId: text("exhibition_id")
      .notNull()
      .references(/** text("exhibition_id")
      .notNull()
      .references 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => exhibitions.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate(/** integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
    /**
   * sqliteTable 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
   * @param table 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
   */
  (table) => [
    index("exhibition_images_exhibition_id_idx").on(table.exhibitionId),
    index("exhibition_images_sort_order_idx").on(table.sortOrder),
  ],
);

export const generationNotices = sqliteTable(
  "generation_notices",
  {
    id: text("id").primaryKey(),
    generationId: text("generation_id")
      .notNull()
      .references(() => generations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    imageUrls: text("image_urls").default("[]").notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("generation_notices_generation_id_idx").on(table.generationId),
    index("generation_notices_author_id_idx").on(table.authorId),
    index("generation_notices_created_at_idx").on(table.createdAt),
  ],
);

export const globalNotices = sqliteTable(
  "global_notices",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    imageUrls: text("image_urls").default("[]").notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("global_notices_author_id_idx").on(table.authorId),
    index("global_notices_created_at_idx").on(table.createdAt),
  ],
);

export const marketItems = sqliteTable(
  "market_items",
  {
    id: text("id").primaryKey(),
    sellerId: text("seller_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    manufacturer: text("manufacturer"),
    productCode: text("product_code"),
    conditionGrade: text("condition_grade"),
    description: text("description"),
    price: integer("price").notNull(),
    status: text("status").default("selling").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("market_items_status_created_idx").on(
      table.status,
      table.createdAt,
      table.deletedAt,
    ),
    index("market_items_seller_deleted_idx").on(table.sellerId, table.deletedAt),
  ],
);

export const marketItemImages = sqliteTable(
  "market_item_images",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id")
      .notNull()
      .references(() => marketItems.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [index("market_item_images_item_sort_idx").on(table.itemId, table.sortOrder)],
);

export const marketComments = sqliteTable(
  "market_comments",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id")
      .notNull()
      .references(() => marketItems.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("market_comments_item_created_idx").on(
      table.itemId,
      table.createdAt,
      table.deletedAt,
    ),
    index("market_comments_author_deleted_idx").on(table.authorId, table.deletedAt),
  ],
);

export const marketPushSubscriptions = sqliteTable(
  "market_push_subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("market_push_subscriptions_user_idx").on(table.userId)],
);

export const linktree = sqliteTable("linktree", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(nowTimestamp)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(nowTimestamp)
    .$onUpdate(() => new Date())
    .notNull(),
  deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
});

export const linktreeItems = sqliteTable(
  "linktree_items",
  {
    id: text("id").primaryKey(),
    linktreeId: text("linktree_id")
      .notNull()
      .references(/** text("linktree_id")
      .notNull()
      .references 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => linktree.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    link: text("link").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
    /**
   * sqliteTable 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
   * @param table 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
   */
  (table) => [index("linktree_items_linktree_id_idx").on(table.linktreeId)],
);

export const siteSettings = sqliteTable("site_settings", {
  id: text("id").primaryKey(),
  footerOpenChatUrl: text("footer_open_chat_url").notNull(),
  footerInstagramId: text("footer_instagram_id").notNull(),
  footerEmail: text("footer_email").notNull(),
  footerPhone: text("footer_phone").notNull(),
  footerAddress: text("footer_address").notNull(),
  donateBankName: text("donate_bank_name").notNull(),
  donateAccountNumber: text("donate_account_number").notNull(),
  donateAccountHolder: text("donate_account_holder").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(nowTimestamp)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(nowTimestamp)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const recruitingPlans = sqliteTable("recruiting_plans", {
  year: integer("year").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  promotionImageUrls: text("promotion_image_urls").notNull(),
  recruitmentStartAt: integer("recruitment_start_at", { mode: "timestamp_ms" })
    .notNull(),
  recruitmentEndAt: integer("recruitment_end_at", { mode: "timestamp_ms" })
    .notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(nowTimestamp)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(nowTimestamp)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    action: text("action").notNull(),
    actorId: text("actor_id"),
    actorName: text("actor_name").notNull(),
    actorRole: text("actor_role"),
    changedFields: text("changed_fields").default("[]").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
  },
  (table) => [
    index("audit_logs_resource_idx").on(table.resourceType, table.resourceId, table.createdAt),
    index("audit_logs_actor_id_idx").on(table.actorId),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ],
);

export const generationsRelations = relations(generations, /** relations 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param { many } 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ ({ many }) => ({
  users: many(user),
  userGenerations: many(userGenerations),
  activities: many(activities),
  exhibitions: many(exhibitions),
  notices: many(generationNotices),
}));

export const userRelations = relations(user, /** relations 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param { many, one } 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ ({ many, one }) => ({
  generation: one(generations, {
    fields: [user.generationId],
    references: [generations.id],
  }),
  generationLinks: many(userGenerations),
  sessions: many(session),
  accounts: many(account),
  generationNotices: many(generationNotices),
  globalNotices: many(globalNotices),
  marketItems: many(marketItems),
  marketComments: many(marketComments),
  marketPushSubscriptions: many(marketPushSubscriptions),
}));

export const userGenerationsRelations = relations(
  userGenerations,
    /**
   * relations 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
   * @param { one } 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
   */
  ({ one }) => ({
    user: one(user, {
      fields: [userGenerations.userId],
      references: [user.id],
    }),
    generation: one(generations, {
      fields: [userGenerations.generationId],
      references: [generations.id],
    }),
  }),
);

export const sessionRelations = relations(session, /** relations 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param { one } 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, /** relations 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param { one } 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const activitiesRelations = relations(activities, /** relations 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param { many, one } 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ ({ many, one }) => ({
  generation: one(generations, {
    fields: [activities.generationId],
    references: [generations.id],
  }),
  detailImages: many(activityImages),
}));

export const activityImagesRelations = relations(activityImages, /** relations 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param { one } 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ ({ one }) => ({
  activity: one(activities, {
    fields: [activityImages.activityId],
    references: [activities.id],
  }),
}));

export const exhibitionsRelations = relations(exhibitions, /** relations 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param { many, one } 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ ({ many, one }) => ({
  generation: one(generations, {
    fields: [exhibitions.generationId],
    references: [generations.id],
  }),
  detailImages: many(exhibitionImages),
}));

export const exhibitionImagesRelations = relations(
  exhibitionImages,
    /**
   * relations 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
   * @param { one } 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
   */
  ({ one }) => ({
    exhibition: one(exhibitions, {
      fields: [exhibitionImages.exhibitionId],
      references: [exhibitions.id],
    }),
  }),
);

export const generationNoticesRelations = relations(
  generationNotices,
  ({ one }) => ({
    generation: one(generations, {
      fields: [generationNotices.generationId],
      references: [generations.id],
    }),
    author: one(user, {
      fields: [generationNotices.authorId],
      references: [user.id],
    }),
  }),
);

export const globalNoticesRelations = relations(globalNotices, ({ one }) => ({
  author: one(user, {
    fields: [globalNotices.authorId],
    references: [user.id],
  }),
}));

export const linktreeRelations = relations(linktree, /** relations 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param { many } 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ ({ many }) => ({
  items: many(linktreeItems),
}));

export const linktreeItemsRelations = relations(linktreeItems, /** relations 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param { one } 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ ({ one }) => ({
  linktree: one(linktree, {
    fields: [linktreeItems.linktreeId],
    references: [linktree.id],
  }),
}));

export const marketItemsRelations = relations(marketItems, ({ many, one }) => ({
  seller: one(user, {
    fields: [marketItems.sellerId],
    references: [user.id],
  }),
  images: many(marketItemImages),
  comments: many(marketComments),
}));

export const marketItemImagesRelations = relations(marketItemImages, ({ one }) => ({
  item: one(marketItems, {
    fields: [marketItemImages.itemId],
    references: [marketItems.id],
  }),
}));

export const marketCommentsRelations = relations(marketComments, ({ one }) => ({
  item: one(marketItems, {
    fields: [marketComments.itemId],
    references: [marketItems.id],
  }),
  author: one(user, {
    fields: [marketComments.authorId],
    references: [user.id],
  }),
}));

export const marketPushSubscriptionsRelations = relations(
  marketPushSubscriptions,
  ({ one }) => ({
    user: one(user, {
      fields: [marketPushSubscriptions.userId],
      references: [user.id],
    }),
  }),
);
