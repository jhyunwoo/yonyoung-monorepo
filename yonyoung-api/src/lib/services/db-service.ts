import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { DEFAULT_SITE_SETTINGS } from "../../shared/api-contracts";
import createDB from "../db";
import {
	activities,
	activityImages,
	auditLogs,
	exhibitions,
	exhibitionImages,
	generationNotices,
	generations,
	globalNotices,
	linktree,
	linktreeItems,
	marketComments,
	marketItemImages,
	marketItems,
	marketPushSubscriptions,
	recruitingPlans,
	siteSettings,
	user,
	userGenerations,
} from "../db/schema";
import {
	ActivityEntity,
	ActivityImageEntity,
	AuditAction,
	AuditActorEntity,
	AuditLogEntity,
	AuditResourceType,
	DataService,
	ExhibitionEntity,
	ExhibitionImageEntity,
	GenerationNoticeEntity,
	GlobalNoticeEntity,
	LinktreeEntity,
	MarketCommentEntity,
	MarketConditionGrade,
	MarketItemEntity,
	MarketItemStatus,
	MarketSellerEntity,
	NoticeAuthorEntity,
	RecruitingPlanEntity,
	SiteSettingsEntity,
	UserEntity,
	UserResourceHistoryItemEntity,
	UserResourceHistoryResourceType,
} from "./types";

const isMissingUserGenerationsTableError = (error: unknown): boolean => {
	if (!(error instanceof Error)) {
		return false;
	}

	return error.message.includes("no such table: user_generations");
};

const isMissingActivityDateRangeColumnsError = (error: unknown): boolean => {
	if (!(error instanceof Error)) {
		return false;
	}

	return (
		error.message.includes("no such column: activities.start_date") ||
		error.message.includes("no such column: activities.end_date") ||
		error.message.includes("no such column: start_date") ||
		error.message.includes("no such column: end_date")
	);
};

const isMissingNoticeImageUrlsColumnsError = (error: unknown): boolean => {
	if (!(error instanceof Error)) {
		return false;
	}

	return (
		error.message.includes("no such column: generation_notices.image_urls") ||
		error.message.includes("no such column: global_notices.image_urls") ||
		error.message.includes("no such column: image_urls")
	);
};

const toTimestampDate = (value: unknown): Date => {
	if (value instanceof Date) {
		return value;
	}

	if (typeof value === "number") {
		return new Date(value);
	}

	if (typeof value === "string") {
		const trimmed = value.trim();
		if (trimmed.length === 0) {
			return new Date(0);
		}

		const numericValue = Number(trimmed);
		if (Number.isFinite(numericValue)) {
			return new Date(
				trimmed.length <= 10 ? numericValue * 1000 : numericValue,
			);
		}

		const parsed = Date.parse(trimmed);
		if (Number.isFinite(parsed)) {
			return new Date(parsed);
		}
	}

	return new Date(0);
};

const parseChangedFields = (value: string | null | undefined): string[] => {
	if (!value) {
		return [];
	}

	try {
		const parsed = JSON.parse(value) as unknown;
		if (!Array.isArray(parsed)) {
			return [];
		}

		return parsed.filter((item): item is string => typeof item === "string");
	} catch {
		return [];
	}
};

const USER_RESOURCE_HISTORY_RESOURCE_TYPES = [
	"activity",
	"exhibition",
	"generation_notice",
	"global_notice",
	"linktree",
	"linktree_item",
] as const satisfies readonly UserResourceHistoryResourceType[];

const isUserResourceHistoryResourceType = (
	value: string,
): value is UserResourceHistoryResourceType =>
	(USER_RESOURCE_HISTORY_RESOURCE_TYPES as readonly string[]).includes(value);

type UserResourceMeta = {
	resourceTitle: string | null;
	generationId: string | null;
	linktreeId: string | null;
	deletedAt: Date | null;
};

const toAuditActor = (input: {
	actorId: string | null;
	actorName: string;
	actorFamilyName: string | null;
	actorGivenName: string | null;
	actorRole: string | null;
}): AuditActorEntity | null => {
	if (!input.actorId) {
		return null;
	}

	return {
		id: input.actorId,
		name: input.actorName,
		familyName: input.actorFamilyName,
		givenName: input.actorGivenName,
		role: input.actorRole,
	};
};

const listLatestAuditActorsByResourceId = async (
	db: ReturnType<typeof createDB>,
	resourceType: AuditResourceType,
	resourceIds: string[],
): Promise<Record<string, AuditActorEntity | null>> => {
	const normalizedResourceIds = Array.from(
		new Set(resourceIds.map((resourceId) => resourceId.trim()).filter(Boolean)),
	);
	if (normalizedResourceIds.length === 0) {
		return {};
	}

	const result: Record<string, AuditActorEntity | null> = {};
	for (const resourceId of normalizedResourceIds) {
		result[resourceId] = null;
	}

	const latestCreatedAtRows = await db
		.select({
			resourceId: auditLogs.resourceId,
			latestCreatedAt: sql<number>`max(${auditLogs.createdAt})`,
		})
		.from(auditLogs)
		.where(
			and(
				eq(auditLogs.resourceType, resourceType),
				inArray(auditLogs.resourceId, normalizedResourceIds),
			),
		)
		.groupBy(auditLogs.resourceId);

	if (latestCreatedAtRows.length === 0) {
		return result;
	}

	const latestCreatedAtByResourceId = new Map<string, number>();
	for (const row of latestCreatedAtRows) {
		latestCreatedAtByResourceId.set(
			row.resourceId,
			toTimestampDate(row.latestCreatedAt).getTime(),
		);
	}

	const latestCreatedAtValues = Array.from(
		new Set(Array.from(latestCreatedAtByResourceId.values())),
	).map((value) => new Date(value));

	const latestRows = await db
		.select({
			id: auditLogs.id,
			resourceId: auditLogs.resourceId,
			actorId: auditLogs.actorId,
			actorName: auditLogs.actorName,
			actorFamilyName: user.familyName,
			actorGivenName: user.givenName,
			actorRole: auditLogs.actorRole,
			createdAt: auditLogs.createdAt,
		})
		.from(auditLogs)
		.leftJoin(
			user,
			and(eq(auditLogs.actorId, user.id), isNull(user.deletedAt)),
		)
		.where(
			and(
				eq(auditLogs.resourceType, resourceType),
				inArray(auditLogs.resourceId, normalizedResourceIds),
				inArray(auditLogs.createdAt, latestCreatedAtValues),
			),
		)
		.orderBy(desc(auditLogs.createdAt), desc(auditLogs.id));

	const resolvedResourceIds = new Set<string>();
	for (const row of latestRows) {
		const expectedCreatedAt = latestCreatedAtByResourceId.get(row.resourceId);
		if (expectedCreatedAt === undefined) {
			continue;
		}
		if (resolvedResourceIds.has(row.resourceId)) {
			continue;
		}
		if (row.createdAt.getTime() !== expectedCreatedAt) {
			continue;
		}

		result[row.resourceId] = toAuditActor(row);
		resolvedResourceIds.add(row.resourceId);

		if (resolvedResourceIds.size === normalizedResourceIds.length) {
			break;
		}
	}

	return result;
};

type LegacyActivityRow = {
	id: string;
	title: string;
	description: string;
	activity_date: unknown;
	cover_image_url: string;
	generation_id: string;
	created_at: unknown;
	updated_at: unknown;
	deleted_at: unknown;
};

const mapLegacyActivityRow = (
	row: LegacyActivityRow,
): typeof activities.$inferSelect => {
	return {
		id: row.id,
		title: row.title,
		description: row.description,
		startDate: toTimestampDate(row.activity_date),
		endDate: toTimestampDate(row.activity_date),
		coverImageUrl: row.cover_image_url,
		generationId: row.generation_id,
		createdAt: toTimestampDate(row.created_at),
		updatedAt: toTimestampDate(row.updated_at),
		deletedAt:
			row.deleted_at === null || row.deleted_at === undefined
				? null
				: toTimestampDate(row.deleted_at),
	};
};

const listLegacyActivities = async (
	database: D1Database,
	orderByDirection: "ASC" | "DESC",
	generationId?: string,
): Promise<(typeof activities.$inferSelect)[]> => {
	let executed: Promise<D1Result<LegacyActivityRow>>;
	if (generationId) {
		if (orderByDirection === "ASC") {
			executed = database
				.prepare(
					`
            select
              "id",
              "title",
              "description",
              "activity_date",
              "cover_image_url",
              "generation_id",
              "created_at",
              "updated_at",
              "deleted_at"
            from "activities"
            where "activities"."deleted_at" is null
              and "activities"."generation_id" = ?
            order by "activities"."activity_date" ASC`,
				)
				.bind(generationId)
				.all<LegacyActivityRow>();
		} else {
			executed = database
				.prepare(
					`
            select
              "id",
              "title",
              "description",
              "activity_date",
              "cover_image_url",
              "generation_id",
              "created_at",
              "updated_at",
              "deleted_at"
            from "activities"
            where "activities"."deleted_at" is null
              and "activities"."generation_id" = ?
            order by "activities"."activity_date" DESC`,
				)
				.bind(generationId)
				.all<LegacyActivityRow>();
		}
	} else if (orderByDirection === "ASC") {
		executed = database
			.prepare(
				`
          select
            "id",
            "title",
            "description",
            "activity_date",
            "cover_image_url",
            "generation_id",
            "created_at",
            "updated_at",
            "deleted_at"
          from "activities"
          where "activities"."deleted_at" is null
          order by "activities"."activity_date" ASC`,
			)
			.bind()
			.all<LegacyActivityRow>();
	} else {
		executed = database
			.prepare(
				`
          select
            "id",
            "title",
            "description",
            "activity_date",
            "cover_image_url",
            "generation_id",
            "created_at",
            "updated_at",
            "deleted_at"
          from "activities"
          where "activities"."deleted_at" is null
          order by "activities"."activity_date" DESC`,
			)
			.bind()
			.all<LegacyActivityRow>();
	}

	const { results } = await executed;

	return (results ?? []).map(mapLegacyActivityRow);
};

/**
 * mapActivitiesWithImages의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
 * @param db 함수 로직에서 사용하는 입력값입니다.
 * @param rows 함수 로직에서 사용하는 입력값입니다.
 * @returns 비동기 처리 결과를 Promise로 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const mapActivitiesWithImages = async (
	db: ReturnType<typeof createDB>,
	rows: (typeof activities.$inferSelect)[],
): Promise<ActivityEntity[]> => {
	if (rows.length === 0) {
		return [];
	}

	const ids = rows.map(
		/** rows.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param row 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (
			row,
		) => row.id,
	);
	const imageRows = await db
		.select()
		.from(activityImages)
		.where(
			and(
				inArray(activityImages.activityId, ids),
				isNull(activityImages.deletedAt),
			),
		)
		.orderBy(asc(activityImages.sortOrder));

	const imageMap = new Map<string, ActivityImageEntity[]>();
	for (const imageRow of imageRows) {
		const current = imageMap.get(imageRow.activityId) ?? [];
		current.push(imageRow);
		imageMap.set(imageRow.activityId, current);
	}

	const updatedByMap = await listLatestAuditActorsByResourceId(
		db,
		"activity",
		ids,
	);

	return rows.map(
		/** rows.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param row 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (
			row,
		) => ({
			...row,
			updatedBy: updatedByMap[row.id] ?? null,
			detailImages: imageMap.get(row.id) ?? [],
		}),
	);
};

/**
 * mapExhibitionsWithImages의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
 * @param db 함수 로직에서 사용하는 입력값입니다.
 * @param rows 함수 로직에서 사용하는 입력값입니다.
 * @returns 비동기 처리 결과를 Promise로 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const mapExhibitionsWithImages = async (
	db: ReturnType<typeof createDB>,
	rows: (typeof exhibitions.$inferSelect)[],
): Promise<ExhibitionEntity[]> => {
	if (rows.length === 0) {
		return [];
	}

	const ids = rows.map(
		/** rows.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param row 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (
			row,
		) => row.id,
	);
	const imageRows = await db
		.select()
		.from(exhibitionImages)
		.where(
			and(
				inArray(exhibitionImages.exhibitionId, ids),
				isNull(exhibitionImages.deletedAt),
			),
		)
		.orderBy(asc(exhibitionImages.sortOrder));

	const imageMap = new Map<string, ExhibitionImageEntity[]>();
	for (const imageRow of imageRows) {
		const current = imageMap.get(imageRow.exhibitionId) ?? [];
		current.push(imageRow);
		imageMap.set(imageRow.exhibitionId, current);
	}

	const updatedByMap = await listLatestAuditActorsByResourceId(
		db,
		"exhibition",
		ids,
	);

	return rows.map(
		/** rows.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param row 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (
			row,
		) => ({
			...row,
			updatedBy: updatedByMap[row.id] ?? null,
			detailImages: imageMap.get(row.id) ?? [],
		}),
	);
};

/**
 * mapLinktreesWithItems의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
 * @param db 함수 로직에서 사용하는 입력값입니다.
 * @param rows 함수 로직에서 사용하는 입력값입니다.
 * @returns 비동기 처리 결과를 Promise로 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const mapLinktreesWithItems = async (
	db: ReturnType<typeof createDB>,
	rows: (typeof linktree.$inferSelect)[],
): Promise<LinktreeEntity[]> => {
	if (rows.length === 0) {
		return [];
	}

	const ids = rows.map(
		/** rows.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param row 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (
			row,
		) => row.id,
	);
	const itemRows = await db
		.select()
		.from(linktreeItems)
		.where(
			and(
				inArray(linktreeItems.linktreeId, ids),
				isNull(linktreeItems.deletedAt),
			),
		);

	const itemMap = new Map<string, (typeof linktreeItems.$inferSelect)[]>();
	for (const item of itemRows) {
		const current = itemMap.get(item.linktreeId) ?? [];
		current.push(item);
		itemMap.set(item.linktreeId, current);
	}

	const [linktreeUpdatedByMap, itemUpdatedByMap] = await Promise.all([
		listLatestAuditActorsByResourceId(db, "linktree", ids),
		listLatestAuditActorsByResourceId(
			db,
			"linktree_item",
			itemRows.map((item) => item.id),
		),
	]);

	return rows.map(
		/** rows.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param row 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (
			row,
		) => ({
			...row,
			updatedBy: linktreeUpdatedByMap[row.id] ?? null,
			items: (itemMap.get(row.id) ?? []).map((item) => ({
				...item,
				updatedBy: itemUpdatedByMap[item.id] ?? null,
			})),
		}),
	);
};

type NoticeListRow = {
	id: string;
	generationId?: string;
	title: string;
	content: string;
	imageUrls: string;
	createdAt: Date;
	updatedAt: Date;
	authorId: string;
	authorName: string;
	authorFamilyName: string | null;
	authorGivenName: string | null;
	authorImage: string | null;
	authorRole: string | null;
};

const parseNoticeImageUrls = (value: string | null | undefined): string[] => {
	if (!value) {
		return [];
	}

	try {
		const parsed = JSON.parse(value) as unknown;
		if (!Array.isArray(parsed)) {
			return [];
		}

		return parsed.filter((item): item is string => typeof item === "string");
	} catch {
		return [];
	}
};

const serializeNoticeImageUrls = (value: string[] | undefined): string =>
	JSON.stringify(value ?? []);

const parseShowcaseImageUrls = (value: string | null | undefined): string[] => {
	if (!value) {
		return [];
	}

	try {
		const parsed = JSON.parse(value) as unknown;
		if (!Array.isArray(parsed)) {
			return [];
		}

		return parsed.filter((item): item is string => typeof item === "string");
	} catch {
		return [];
	}
};

const serializeShowcaseImageUrls = (value: string[] | undefined): string =>
	JSON.stringify(value ?? []);

const toNoticeAuthor = (row: NoticeListRow): NoticeAuthorEntity => ({
	id: row.authorId,
	name: row.authorName,
	familyName: row.authorFamilyName,
	givenName: row.authorGivenName,
	image: row.authorImage,
	role: row.authorRole,
});

const toGenerationNoticeEntity = (
	row: NoticeListRow,
	updatedBy: AuditActorEntity | null,
): GenerationNoticeEntity => ({
	id: row.id,
	generationId: row.generationId!,
	title: row.title,
	content: row.content,
	imageUrls: parseNoticeImageUrls(row.imageUrls),
	author: toNoticeAuthor(row),
	createdAt: row.createdAt,
	updatedAt: row.updatedAt,
	updatedBy,
});

const toGlobalNoticeEntity = (
	row: NoticeListRow,
	updatedBy: AuditActorEntity | null,
): GlobalNoticeEntity => ({
	id: row.id,
	title: row.title,
	content: row.content,
	imageUrls: parseNoticeImageUrls(row.imageUrls),
	author: toNoticeAuthor(row),
	createdAt: row.createdAt,
	updatedAt: row.updatedAt,
	updatedBy,
});

type MarketItemRow = {
	id: string;
	sellerId: string;
	name: string;
	manufacturer: string | null;
	productCode: string | null;
	conditionGrade: string | null;
	description: string | null;
	price: number;
	status: string;
	createdAt: Date;
	updatedAt: Date;
	sellerName: string;
	sellerFamilyName: string | null;
	sellerGivenName: string | null;
	sellerImage: string | null;
	sellerRole: string | null;
};

type MarketCommentRow = {
	id: string;
	itemId: string;
	content: string;
	createdAt: Date;
	updatedAt: Date;
	authorId: string;
	authorName: string;
	authorFamilyName: string | null;
	authorGivenName: string | null;
	authorImage: string | null;
	authorRole: string | null;
};

const parseMarketItemStatus = (
	value: string | null | undefined,
): MarketItemStatus => {
	if (value === "reserved" || value === "sold") {
		return value;
	}
	return "selling";
};

const parseMarketConditionGrade = (
	value: string | null | undefined,
): MarketConditionGrade | null => {
	if (value === "A" || value === "B" || value === "C" || value === "D") {
		return value;
	}
	return null;
};

const mapMarketSeller = (input: {
	id: string;
	name: string;
	familyName: string | null;
	givenName: string | null;
	image: string | null;
	role: string | null;
}): MarketSellerEntity => ({
	id: input.id,
	name: input.name,
	familyName: input.familyName,
	givenName: input.givenName,
	image: input.image,
	role: input.role,
});

const mapMarketItemsWithImages = async (
	db: ReturnType<typeof createDB>,
	rows: MarketItemRow[],
): Promise<MarketItemEntity[]> => {
	if (rows.length === 0) {
		return [];
	}

	const itemIds = rows.map((row) => row.id);
	const imageRows = await db
		.select({
			itemId: marketItemImages.itemId,
			imageUrl: marketItemImages.imageUrl,
			sortOrder: marketItemImages.sortOrder,
		})
		.from(marketItemImages)
		.where(
			and(
				inArray(marketItemImages.itemId, itemIds),
				isNull(marketItemImages.deletedAt),
			),
		)
		.orderBy(asc(marketItemImages.sortOrder));

	const imagesByItemId = new Map<string, string[]>();
	for (const row of imageRows) {
		const current = imagesByItemId.get(row.itemId) ?? [];
		current.push(row.imageUrl);
		imagesByItemId.set(row.itemId, current);
	}

	const updatedByMap = await listLatestAuditActorsByResourceId(
		db,
		"market_item",
		itemIds,
	);

	return rows.map((row) => ({
		id: row.id,
		sellerId: row.sellerId,
		name: row.name,
		imageUrls: imagesByItemId.get(row.id) ?? [],
		manufacturer: row.manufacturer,
		productCode: row.productCode,
		conditionGrade: parseMarketConditionGrade(row.conditionGrade),
		description: row.description,
		price: row.price,
		status: parseMarketItemStatus(row.status),
		seller: mapMarketSeller({
			id: row.sellerId,
			name: row.sellerName,
			familyName: row.sellerFamilyName,
			givenName: row.sellerGivenName,
			image: row.sellerImage,
			role: row.sellerRole,
		}),
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		updatedBy: updatedByMap[row.id] ?? null,
	}));
};

const toMarketCommentEntity = (
	row: MarketCommentRow,
	updatedBy: AuditActorEntity | null,
): MarketCommentEntity => ({
	id: row.id,
	itemId: row.itemId,
	author: mapMarketSeller({
		id: row.authorId,
		name: row.authorName,
		familyName: row.authorFamilyName,
		givenName: row.authorGivenName,
		image: row.authorImage,
		role: row.authorRole,
	}),
	content: row.content,
	createdAt: row.createdAt,
	updatedAt: row.updatedAt,
	updatedBy,
});

const dedupeGenerationIds = (generationIds: string[]): string[] => {
	return Array.from(
		new Set(
			generationIds.filter((generationId) => generationId.trim().length > 0),
		),
	);
};

const mapUsersWithGenerations = async (
	db: ReturnType<typeof createDB>,
	rows: (typeof user.$inferSelect)[],
): Promise<UserEntity[]> => {
	if (rows.length === 0) {
		return [];
	}

	const userIds = rows.map((row) => row.id);
	const linkRows = await (async () => {
		try {
			return await db
				.select({
					userId: userGenerations.userId,
					generationId: userGenerations.generationId,
				})
				.from(userGenerations)
				.innerJoin(
					generations,
					eq(userGenerations.generationId, generations.id),
				)
				.where(
					and(
						inArray(userGenerations.userId, userIds),
						isNull(generations.deletedAt),
					),
				)
				.orderBy(asc(userGenerations.userId), desc(generations.sortOrder));
		} catch (error) {
			if (isMissingUserGenerationsTableError(error)) {
				return [] as Array<{ userId: string; generationId: string }>;
			}
			throw error;
		}
	})();

	const generationIdsByUserId = new Map<string, string[]>();
	for (const row of linkRows) {
		const current = generationIdsByUserId.get(row.userId) ?? [];
		current.push(row.generationId);
		generationIdsByUserId.set(row.userId, current);
	}

	const updatedByMap = await listLatestAuditActorsByResourceId(
		db,
		"user",
		userIds,
	);

	return rows.map((row) => {
		const generationIds = dedupeGenerationIds(
			generationIdsByUserId.get(row.id) ??
				(row.generationId ? [row.generationId] : []),
		);
		const primaryGenerationId =
			generationIds[0] ??
			(typeof row.generationId === "string" ? row.generationId : null);

		return {
			...row,
			showcaseImageUrls: parseShowcaseImageUrls(row.showcaseImageUrls),
			generationId: primaryGenerationId,
			generationIds,
			updatedBy: updatedByMap[row.id] ?? null,
		};
	});
};

const selectActiveGenerationIds = async (
	db: ReturnType<typeof createDB>,
	generationIds: string[],
): Promise<{ generationIds: string[]; latestSortOrder: number | null }> => {
	const normalizedGenerationIds = dedupeGenerationIds(generationIds);
	if (normalizedGenerationIds.length === 0) {
		return { generationIds: [], latestSortOrder: null };
	}

	const rows = await db
		.select({
			id: generations.id,
			sortOrder: generations.sortOrder,
		})
		.from(generations)
		.where(
			and(
				inArray(generations.id, normalizedGenerationIds),
				isNull(generations.deletedAt),
			),
		)
		.orderBy(desc(generations.sortOrder), asc(generations.id));

	return {
		generationIds: rows.map((row) => row.id),
		latestSortOrder: rows[0]?.sortOrder ?? null,
	};
};

const replaceUserGenerations = async (
	db: ReturnType<typeof createDB>,
	userId: string,
	generationIds: string[],
): Promise<{ generationIds: string[]; primaryGenerationId: string | null }> => {
	const { generationIds: activeGenerationIds, latestSortOrder } =
		await selectActiveGenerationIds(db, generationIds);

	let canUseUserGenerationsTable = true;
	try {
		await db.delete(userGenerations).where(eq(userGenerations.userId, userId));

		if (activeGenerationIds.length > 0) {
			await db.insert(userGenerations).values(
				activeGenerationIds.map((generationId) => ({
					userId,
					generationId,
				})),
			);
		}
	} catch (error) {
		if (isMissingUserGenerationsTableError(error)) {
			canUseUserGenerationsTable = false;
		} else {
			throw error;
		}
	}

	const primaryGenerationId = activeGenerationIds[0] ?? null;
	await db
		.update(user)
		.set({
			generationId: primaryGenerationId,
			latestGenerationSortOrder: latestSortOrder,
			updatedAt: new Date(),
		})
		.where(and(eq(user.id, userId), isNull(user.deletedAt)));

	return {
		generationIds: canUseUserGenerationsTable
			? activeGenerationIds
			: primaryGenerationId
				? [primaryGenerationId]
				: [],
		primaryGenerationId,
	};
};

const SITE_SETTINGS_SINGLETON_ID = "default";

const normalizeInstagramId = (value: string): string => {
	const trimmed = value.trim();
	return trimmed.replace(/^@+/, "");
};

const toSiteSettingsEntity = (
	row: typeof siteSettings.$inferSelect | null,
): SiteSettingsEntity => {
	if (!row) {
		return {
			...DEFAULT_SITE_SETTINGS,
		};
	}

	return {
		footerOpenChatUrl: row.footerOpenChatUrl,
		footerInstagramId: normalizeInstagramId(row.footerInstagramId),
		footerEmail: row.footerEmail,
		footerPhone: row.footerPhone,
		footerAddress: row.footerAddress,
		donateBankName: row.donateBankName,
		donateAccountNumber: row.donateAccountNumber,
		donateAccountHolder: row.donateAccountHolder,
	};
};

const KOREA_TIME_ZONE = "Asia/Seoul";
const koreanYearFormatter = new Intl.DateTimeFormat("en-CA", {
	year: "numeric",
	timeZone: KOREA_TIME_ZONE,
});

const readCurrentKoreanYear = (): number => {
	const formatted = koreanYearFormatter.format(Date.now());
	const parsed = Number.parseInt(formatted, 10);
	return Number.isFinite(parsed) ? parsed : new Date().getUTCFullYear();
};

const parseRecruitingPromotionImageUrls = (
	value: string | null | undefined,
): string[] => {
	if (!value) {
		return [];
	}

	try {
		const parsed = JSON.parse(value) as unknown;
		if (!Array.isArray(parsed)) {
			return [];
		}

		return parsed.filter((item): item is string => typeof item === "string");
	} catch {
		return [];
	}
};

const serializeRecruitingPromotionImageUrls = (
	value: string[] | undefined,
): string => JSON.stringify(value ?? []);

const toRecruitingPlanEntity = (
	row: typeof recruitingPlans.$inferSelect,
): RecruitingPlanEntity => ({
	year: row.year,
	title: row.title,
	content: row.content,
	promotionImageUrls: parseRecruitingPromotionImageUrls(row.promotionImageUrls),
	recruitmentStartAt: row.recruitmentStartAt,
	recruitmentEndAt: row.recruitmentEndAt,
	createdAt: row.createdAt,
	updatedAt: row.updatedAt,
});

/**
 * createDbDataService 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param database 처리 대상 데이터입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
 */
export const createDbDataService = (database: D1Database): DataService => {
	const db = createDB(database);
	const findGenerationsByName = async (name: string) => {
		return db.query.generations.findMany({
			where: eq(generations.name, name),
		});
	};

	const purgeGeneration = async (generationId: string) => {
		await db
			.delete(activities)
			.where(eq(activities.generationId, generationId));
		await db
			.delete(exhibitions)
			.where(eq(exhibitions.generationId, generationId));
		await db
			.delete(generationNotices)
			.where(eq(generationNotices.generationId, generationId));
		await db.delete(generations).where(eq(generations.id, generationId));
	};

	return {
		async createAuditLog(input) {
			await db.insert(auditLogs).values({
				id: crypto.randomUUID(),
				resourceType: input.resourceType,
				resourceId: input.resourceId,
				action: input.action,
				actorId: input.actorId,
				actorName: input.actorName,
				actorRole: input.actorRole,
				changedFields: JSON.stringify(input.changedFields),
			});
		},

		async listAuditLogs(resourceType, resourceId, limit) {
			const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
			const rows = await db
				.select({
					id: auditLogs.id,
					resourceType: auditLogs.resourceType,
					resourceId: auditLogs.resourceId,
					action: auditLogs.action,
					actorId: auditLogs.actorId,
					actorName: auditLogs.actorName,
					actorFamilyName: user.familyName,
					actorGivenName: user.givenName,
					actorRole: auditLogs.actorRole,
					changedFields: auditLogs.changedFields,
					createdAt: auditLogs.createdAt,
				})
				.from(auditLogs)
				.leftJoin(
					user,
					and(eq(auditLogs.actorId, user.id), isNull(user.deletedAt)),
				)
				.where(
					and(
						eq(auditLogs.resourceType, resourceType),
						eq(auditLogs.resourceId, resourceId),
					),
				)
				.orderBy(desc(auditLogs.createdAt))
				.limit(safeLimit);

			return rows.map(
				(row): AuditLogEntity => ({
					id: row.id,
					resourceType: row.resourceType as AuditResourceType,
					resourceId: row.resourceId,
					action: row.action as AuditLogEntity["action"],
					actor: toAuditActor({
						actorId: row.actorId,
						actorName: row.actorName,
						actorFamilyName: row.actorFamilyName,
						actorGivenName: row.actorGivenName,
						actorRole: row.actorRole,
					}),
					changedFields: parseChangedFields(row.changedFields),
					createdAt: row.createdAt,
				}),
			);
		},

		async getLatestAuditActor(resourceType, resourceId) {
			const actorMap = await listLatestAuditActorsByResourceId(
				db,
				resourceType,
				[resourceId],
			);
			return actorMap[resourceId] ?? null;
		},

		async listLatestAuditActors(resourceType, resourceIds) {
			return listLatestAuditActorsByResourceId(db, resourceType, resourceIds);
		},
		/**
		 * listGenerations의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
		 * @returns 비동기 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async listGenerations() {
			const rows = await db
				.select()
				.from(generations)
				.where(isNull(generations.deletedAt))
				.orderBy(asc(generations.sortOrder));

			const updatedByMap = await listLatestAuditActorsByResourceId(
				db,
				"generation",
				rows.map((row) => row.id),
			);

			return rows.map((row) => ({
				...row,
				updatedBy: updatedByMap[row.id] ?? null,
			}));
		},
		/**
		 * createGeneration 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
		 * @param input 함수 로직에서 사용하는 입력값입니다.
		 * @returns 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async createGeneration(input) {
			const id = crypto.randomUUID();
			const generationName = input.name.trim();
			const existingGenerationsWithSameName =
				await findGenerationsByName(generationName);
			for (const existingGeneration of existingGenerationsWithSameName) {
				await purgeGeneration(existingGeneration.id);
			}

			await db.insert(generations).values({
				id,
				name: generationName,
				sortOrder: input.sortOrder,
				startDate: new Date(input.startDate),
				endDate: new Date(input.endDate),
			});
			return (await this.getGenerationById(id))!;
		},
		/**
		 * getGenerationById 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
		 * @param id 대상을 식별하기 위한 ID 값입니다.
		 * @returns 조회/계산된 결과 값을 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async getGenerationById(id) {
			const row =
				(await db.query.generations.findFirst({
					where: and(eq(generations.id, id), isNull(generations.deletedAt)),
				})) ?? null;
			if (!row) {
				return null;
			}

			const updatedBy = await this.getLatestAuditActor("generation", row.id);
			return {
				...row,
				updatedBy,
			};
		},
		/**
		 * updateGeneration 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
		 * @param id 대상을 식별하기 위한 ID 값입니다.
		 * @param input 함수 로직에서 사용하는 입력값입니다.
		 * @returns 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async updateGeneration(id, input) {
			const exists = await db.query.generations.findFirst({
				where: and(eq(generations.id, id), isNull(generations.deletedAt)),
			});
			if (!exists) {
				return null;
			}

			const generationName = input.name?.trim();
			if (generationName !== undefined) {
				const existingGenerationWithSameName =
					await db.query.generations.findFirst({
						where: and(
							eq(generations.name, generationName),
							isNull(generations.deletedAt),
						),
					});
				if (
					existingGenerationWithSameName &&
					existingGenerationWithSameName.id !== id
				) {
					throw new Error("UNIQUE constraint failed: generations.name");
				}
			}

			await db
				.update(generations)
				.set({
					...(generationName !== undefined ? { name: generationName } : {}),
					...(input.sortOrder !== undefined
						? { sortOrder: input.sortOrder }
						: {}),
					...(input.startDate !== undefined
						? { startDate: new Date(input.startDate) }
						: {}),
					...(input.endDate !== undefined
						? { endDate: new Date(input.endDate) }
						: {}),
					updatedAt: new Date(),
				})
				.where(and(eq(generations.id, id), isNull(generations.deletedAt)));

			return this.getGenerationById(id);
		},
		/**
		 * deleteGeneration 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
		 * @param id 대상을 식별하기 위한 ID 값입니다.
		 * @returns 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async deleteGeneration(id) {
			const exists = await db.query.generations.findFirst({
				where: and(eq(generations.id, id), isNull(generations.deletedAt)),
			});
			if (!exists) {
				return false;
			}
			await db
				.update(generations)
				.set({
					deletedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(and(eq(generations.id, id), isNull(generations.deletedAt)));
			return true;
		},

		/**
		 * listActivities의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
		 * @returns 비동기 처리 결과를 Promise로 반환합니다.
		 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
		 */
		async listActivities(generationId) {
			const rows = await (async () => {
				try {
					const conditions = [isNull(activities.deletedAt)];
					if (generationId) {
						conditions.push(eq(activities.generationId, generationId));
					}
					return await db
						.select()
						.from(activities)
						.where(and(...conditions))
						.orderBy(asc(activities.startDate));
				} catch (error) {
					if (!isMissingActivityDateRangeColumnsError(error)) {
						throw error;
					}
					return listLegacyActivities(database, "ASC", generationId);
				}
			})();
			return mapActivitiesWithImages(db, rows);
		},
		/**
		 * listPublicActivities의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
		 * @returns 비동기 처리 결과를 Promise로 반환합니다.
		 * @remarks 공개 화면 렌더링 성능을 위해 정렬을 DB에서 수행합니다.
		 */
		async listPublicActivities() {
			const rows = await (async () => {
				try {
					return await db
						.select()
						.from(activities)
						.where(isNull(activities.deletedAt))
						.orderBy(desc(activities.startDate));
				} catch (error) {
					if (!isMissingActivityDateRangeColumnsError(error)) {
						throw error;
					}
					return listLegacyActivities(database, "DESC");
				}
			})();
			return mapActivitiesWithImages(db, rows);
		},
		/**
		 * createActivity 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
		 * @param input 함수 로직에서 사용하는 입력값입니다.
		 * @returns 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async createActivity(input) {
			const id = crypto.randomUUID();
			await db.insert(activities).values({
				id,
				title: input.title,
				description: input.description,
				startDate: new Date(input.startDate),
				endDate: new Date(input.endDate),
				coverImageUrl: input.coverImageUrl,
				generationId: input.generationId,
			});
			return (await this.getActivityById(id))!;
		},
		/**
		 * getActivityById 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
		 * @param id 대상을 식별하기 위한 ID 값입니다.
		 * @returns 조회/계산된 결과 값을 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async getActivityById(id) {
			const row = await db.query.activities.findFirst({
				where: and(eq(activities.id, id), isNull(activities.deletedAt)),
			});
			if (!row) {
				return null;
			}
			return (await mapActivitiesWithImages(db, [row]))[0] ?? null;
		},
		/**
		 * updateActivity 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
		 * @param id 대상을 식별하기 위한 ID 값입니다.
		 * @param input 함수 로직에서 사용하는 입력값입니다.
		 * @returns 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async updateActivity(id, input) {
			const exists = await db.query.activities.findFirst({
				where: and(eq(activities.id, id), isNull(activities.deletedAt)),
			});
			if (!exists) {
				return null;
			}

			await db
				.update(activities)
				.set({
					...(input.title !== undefined ? { title: input.title } : {}),
					...(input.description !== undefined
						? { description: input.description }
						: {}),
					...(input.startDate !== undefined
						? { startDate: new Date(input.startDate) }
						: {}),
					...(input.endDate !== undefined
						? { endDate: new Date(input.endDate) }
						: {}),
					...(input.coverImageUrl !== undefined
						? { coverImageUrl: input.coverImageUrl }
						: {}),
					...(input.generationId !== undefined
						? { generationId: input.generationId }
						: {}),
					updatedAt: new Date(),
				})
				.where(and(eq(activities.id, id), isNull(activities.deletedAt)));

			return this.getActivityById(id);
		},
		/**
		 * deleteActivity 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
		 * @param id 대상을 식별하기 위한 ID 값입니다.
		 * @returns 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async deleteActivity(id) {
			const exists = await db.query.activities.findFirst({
				where: and(eq(activities.id, id), isNull(activities.deletedAt)),
			});
			if (!exists) {
				return false;
			}
			await db
				.update(activities)
				.set({
					deletedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(and(eq(activities.id, id), isNull(activities.deletedAt)));
			await db
				.update(activityImages)
				.set({
					deletedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(activityImages.activityId, id),
						isNull(activityImages.deletedAt),
					),
				);
			return true;
		},
		/**
		 * addActivityImage의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
		 * @param activityId 대상을 식별하기 위한 ID 값입니다.
		 * @param input 함수 로직에서 사용하는 입력값입니다.
		 * @returns 비동기 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async addActivityImage(activityId, input) {
			const parent = await db.query.activities.findFirst({
				where: and(eq(activities.id, activityId), isNull(activities.deletedAt)),
			});
			if (!parent) {
				return null;
			}

			const id = crypto.randomUUID();
			await db.insert(activityImages).values({
				id,
				activityId,
				imageUrl: input.imageUrl,
				sortOrder: input.sortOrder,
			});
			await db
				.update(activities)
				.set({ updatedAt: new Date() })
				.where(
					and(eq(activities.id, activityId), isNull(activities.deletedAt)),
				);
			return (
				(await db.query.activityImages.findFirst({
					where: and(
						eq(activityImages.id, id),
						isNull(activityImages.deletedAt),
					),
				})) ?? null
			);
		},
		/**
		 * addActivityImages의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
		 * @param activityId 대상을 식별하기 위한 ID 값입니다.
		 * @param input 함수 로직에서 사용하는 입력값입니다.
		 * @returns 비동기 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async addActivityImages(activityId, input) {
			const parent = await db.query.activities.findFirst({
				where: and(eq(activities.id, activityId), isNull(activities.deletedAt)),
			});
			if (!parent) {
				return null;
			}

			const createdIds: string[] = [];
			const statements = input.map((item) => {
				const id = crypto.randomUUID();
				createdIds.push(id);
				return database
					.prepare(
						`insert into "activity_images" ("id", "activity_id", "image_url", "sort_order") values (?, ?, ?, ?)`,
					)
					.bind(id, activityId, item.imageUrl, item.sortOrder);
			});

			if (statements.length > 0) {
				await database.batch(statements);
				await db
					.update(activities)
					.set({ updatedAt: new Date() })
					.where(
						and(eq(activities.id, activityId), isNull(activities.deletedAt)),
					);
			}

			if (createdIds.length === 0) {
				return [];
			}

			return db
				.select()
				.from(activityImages)
				.where(
					and(
						inArray(activityImages.id, createdIds),
						isNull(activityImages.deletedAt),
					),
				)
				.orderBy(asc(activityImages.sortOrder));
		},
		/**
		 * updateActivityImage 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
		 * @param activityId 대상을 식별하기 위한 ID 값입니다.
		 * @param imageId 대상을 식별하기 위한 ID 값입니다.
		 * @param input 함수 로직에서 사용하는 입력값입니다.
		 * @returns 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async updateActivityImage(activityId, imageId, input) {
			const exists = await db.query.activityImages.findFirst({
				where: and(
					eq(activityImages.id, imageId),
					eq(activityImages.activityId, activityId),
					isNull(activityImages.deletedAt),
				),
			});
			if (!exists) {
				return null;
			}

			await db
				.update(activityImages)
				.set({
					...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
					...(input.sortOrder !== undefined
						? { sortOrder: input.sortOrder }
						: {}),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(activityImages.id, imageId),
						eq(activityImages.activityId, activityId),
						isNull(activityImages.deletedAt),
					),
				);
			await db
				.update(activities)
				.set({ updatedAt: new Date() })
				.where(
					and(eq(activities.id, activityId), isNull(activities.deletedAt)),
				);

			return (
				(await db.query.activityImages.findFirst({
					where: and(
						eq(activityImages.id, imageId),
						isNull(activityImages.deletedAt),
					),
				})) ?? null
			);
		},
		/**
		 * updateActivityImages 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
		 * @param activityId 대상을 식별하기 위한 ID 값입니다.
		 * @param input 함수 로직에서 사용하는 입력값입니다.
		 * @returns 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async updateActivityImages(activityId, input) {
			const parent = await db.query.activities.findFirst({
				where: and(eq(activities.id, activityId), isNull(activities.deletedAt)),
			});
			if (!parent) {
				return null;
			}

			const imageIds = input.map((item) => item.imageId);
			if (imageIds.length === 0) {
				return [];
			}
			const existing = await db
				.select({ id: activityImages.id })
				.from(activityImages)
				.where(
					and(
						eq(activityImages.activityId, activityId),
						inArray(activityImages.id, imageIds),
						isNull(activityImages.deletedAt),
					),
				);

			if (existing.length !== imageIds.length) {
				return null;
			}

			for (const item of input) {
				await db
					.update(activityImages)
					.set({
						...(item.imageUrl !== undefined ? { imageUrl: item.imageUrl } : {}),
						...(item.sortOrder !== undefined
							? { sortOrder: item.sortOrder }
							: {}),
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(activityImages.id, item.imageId),
							eq(activityImages.activityId, activityId),
							isNull(activityImages.deletedAt),
						),
					);
			}
			await db
				.update(activities)
				.set({ updatedAt: new Date() })
				.where(
					and(eq(activities.id, activityId), isNull(activities.deletedAt)),
				);

			return db
				.select()
				.from(activityImages)
				.where(
					and(
						inArray(activityImages.id, imageIds),
						isNull(activityImages.deletedAt),
					),
				)
				.orderBy(asc(activityImages.sortOrder));
		},
		/**
		 * deleteActivityImage 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
		 * @param activityId 대상을 식별하기 위한 ID 값입니다.
		 * @param imageId 대상을 식별하기 위한 ID 값입니다.
		 * @returns 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async deleteActivityImage(activityId, imageId) {
			const exists = await db.query.activityImages.findFirst({
				where: and(
					eq(activityImages.id, imageId),
					eq(activityImages.activityId, activityId),
					isNull(activityImages.deletedAt),
				),
			});
			if (!exists) {
				return false;
			}
			await db
				.update(activityImages)
				.set({
					deletedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(activityImages.id, imageId),
						eq(activityImages.activityId, activityId),
						isNull(activityImages.deletedAt),
					),
				);
			await db
				.update(activities)
				.set({ updatedAt: new Date() })
				.where(
					and(eq(activities.id, activityId), isNull(activities.deletedAt)),
				);
			return true;
		},

		/**
		 * listExhibitions의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
		 * @returns 비동기 처리 결과를 Promise로 반환합니다.
		 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
		 */
		async listExhibitions(generationId) {
			const conditions = [isNull(exhibitions.deletedAt)];
			if (generationId) {
				conditions.push(eq(exhibitions.generationId, generationId));
			}

			const rows = await db
				.select()
				.from(exhibitions)
				.where(and(...conditions))
				.orderBy(asc(exhibitions.startDate));
			return mapExhibitionsWithImages(db, rows);
		},
		/**
		 * listPublicExhibitions의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
		 * @returns 비동기 처리 결과를 Promise로 반환합니다.
		 * @remarks 공개 화면 렌더링 성능을 위해 정렬을 DB에서 수행합니다.
		 */
		async listPublicExhibitions() {
			const rows = await db
				.select()
				.from(exhibitions)
				.where(isNull(exhibitions.deletedAt))
				.orderBy(desc(exhibitions.startDate));
			return mapExhibitionsWithImages(db, rows);
		},
		/**
		 * createExhibition 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
		 * @param input 함수 로직에서 사용하는 입력값입니다.
		 * @returns 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async createExhibition(input) {
			const id = crypto.randomUUID();
			await db.insert(exhibitions).values({
				id,
				title: input.title,
				startDate: new Date(input.startDate),
				endDate: new Date(input.endDate),
				generationId: input.generationId,
				place: input.place,
				coverImageUrl: input.coverImageUrl,
				description: input.description,
			});
			return (await this.getExhibitionById(id))!;
		},
		/**
		 * getExhibitionById 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
		 * @param id 대상을 식별하기 위한 ID 값입니다.
		 * @returns 조회/계산된 결과 값을 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async getExhibitionById(id) {
			const row = await db.query.exhibitions.findFirst({
				where: and(eq(exhibitions.id, id), isNull(exhibitions.deletedAt)),
			});
			if (!row) {
				return null;
			}
			return (await mapExhibitionsWithImages(db, [row]))[0] ?? null;
		},
		/**
		 * updateExhibition 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
		 * @param id 대상을 식별하기 위한 ID 값입니다.
		 * @param input 함수 로직에서 사용하는 입력값입니다.
		 * @returns 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async updateExhibition(id, input) {
			const exists = await db.query.exhibitions.findFirst({
				where: and(eq(exhibitions.id, id), isNull(exhibitions.deletedAt)),
			});
			if (!exists) {
				return null;
			}

			await db
				.update(exhibitions)
				.set({
					...(input.title !== undefined ? { title: input.title } : {}),
					...(input.startDate !== undefined
						? { startDate: new Date(input.startDate) }
						: {}),
					...(input.endDate !== undefined
						? { endDate: new Date(input.endDate) }
						: {}),
					...(input.generationId !== undefined
						? { generationId: input.generationId }
						: {}),
					...(input.place !== undefined ? { place: input.place } : {}),
					...(input.coverImageUrl !== undefined
						? { coverImageUrl: input.coverImageUrl }
						: {}),
					...(input.description !== undefined
						? { description: input.description }
						: {}),
					updatedAt: new Date(),
				})
				.where(and(eq(exhibitions.id, id), isNull(exhibitions.deletedAt)));

			return this.getExhibitionById(id);
		},
		/**
		 * deleteExhibition 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
		 * @param id 대상을 식별하기 위한 ID 값입니다.
		 * @returns 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async deleteExhibition(id) {
			const exists = await db.query.exhibitions.findFirst({
				where: and(eq(exhibitions.id, id), isNull(exhibitions.deletedAt)),
			});
			if (!exists) {
				return false;
			}
			await db
				.update(exhibitions)
				.set({
					deletedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(and(eq(exhibitions.id, id), isNull(exhibitions.deletedAt)));
			await db
				.update(exhibitionImages)
				.set({
					deletedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(exhibitionImages.exhibitionId, id),
						isNull(exhibitionImages.deletedAt),
					),
				);
			return true;
		},
		/**
		 * addExhibitionImage의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
		 * @param exhibitionId 대상을 식별하기 위한 ID 값입니다.
		 * @param input 함수 로직에서 사용하는 입력값입니다.
		 * @returns 비동기 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async addExhibitionImage(exhibitionId, input) {
			const parent = await db.query.exhibitions.findFirst({
				where: and(
					eq(exhibitions.id, exhibitionId),
					isNull(exhibitions.deletedAt),
				),
			});
			if (!parent) {
				return null;
			}

			const id = crypto.randomUUID();
			await db.insert(exhibitionImages).values({
				id,
				exhibitionId,
				imageUrl: input.imageUrl,
				sortOrder: input.sortOrder,
			});
			await db
				.update(exhibitions)
				.set({ updatedAt: new Date() })
				.where(
					and(eq(exhibitions.id, exhibitionId), isNull(exhibitions.deletedAt)),
				);
			return (
				(await db.query.exhibitionImages.findFirst({
					where: and(
						eq(exhibitionImages.id, id),
						isNull(exhibitionImages.deletedAt),
					),
				})) ?? null
			);
		},
		/**
		 * addExhibitionImages의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
		 * @param exhibitionId 대상을 식별하기 위한 ID 값입니다.
		 * @param input 함수 로직에서 사용하는 입력값입니다.
		 * @returns 비동기 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async addExhibitionImages(exhibitionId, input) {
			const parent = await db.query.exhibitions.findFirst({
				where: and(
					eq(exhibitions.id, exhibitionId),
					isNull(exhibitions.deletedAt),
				),
			});
			if (!parent) {
				return null;
			}

			const createdIds: string[] = [];
			const statements = input.map((item) => {
				const id = crypto.randomUUID();
				createdIds.push(id);
				return database
					.prepare(
						`insert into "exhibition_images" ("id", "exhibition_id", "image_url", "sort_order") values (?, ?, ?, ?)`,
					)
					.bind(id, exhibitionId, item.imageUrl, item.sortOrder);
			});

			if (statements.length > 0) {
				await database.batch(statements);
				await db
					.update(exhibitions)
					.set({ updatedAt: new Date() })
					.where(
						and(
							eq(exhibitions.id, exhibitionId),
							isNull(exhibitions.deletedAt),
						),
					);
			}

			if (createdIds.length === 0) {
				return [];
			}

			return db
				.select()
				.from(exhibitionImages)
				.where(
					and(
						inArray(exhibitionImages.id, createdIds),
						isNull(exhibitionImages.deletedAt),
					),
				)
				.orderBy(asc(exhibitionImages.sortOrder));
		},
		/**
		 * updateExhibitionImage 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
		 * @param exhibitionId 대상을 식별하기 위한 ID 값입니다.
		 * @param imageId 대상을 식별하기 위한 ID 값입니다.
		 * @param input 함수 로직에서 사용하는 입력값입니다.
		 * @returns 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async updateExhibitionImage(exhibitionId, imageId, input) {
			const exists = await db.query.exhibitionImages.findFirst({
				where: and(
					eq(exhibitionImages.id, imageId),
					eq(exhibitionImages.exhibitionId, exhibitionId),
					isNull(exhibitionImages.deletedAt),
				),
			});
			if (!exists) {
				return null;
			}

			await db
				.update(exhibitionImages)
				.set({
					...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
					...(input.sortOrder !== undefined
						? { sortOrder: input.sortOrder }
						: {}),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(exhibitionImages.id, imageId),
						eq(exhibitionImages.exhibitionId, exhibitionId),
						isNull(exhibitionImages.deletedAt),
					),
				);
			await db
				.update(exhibitions)
				.set({ updatedAt: new Date() })
				.where(
					and(eq(exhibitions.id, exhibitionId), isNull(exhibitions.deletedAt)),
				);

			return (
				(await db.query.exhibitionImages.findFirst({
					where: and(
						eq(exhibitionImages.id, imageId),
						isNull(exhibitionImages.deletedAt),
					),
				})) ?? null
			);
		},
		/**
		 * updateExhibitionImages 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
		 * @param exhibitionId 대상을 식별하기 위한 ID 값입니다.
		 * @param input 함수 로직에서 사용하는 입력값입니다.
		 * @returns 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async updateExhibitionImages(exhibitionId, input) {
			const parent = await db.query.exhibitions.findFirst({
				where: and(
					eq(exhibitions.id, exhibitionId),
					isNull(exhibitions.deletedAt),
				),
			});
			if (!parent) {
				return null;
			}

			const imageIds = input.map((item) => item.imageId);
			if (imageIds.length === 0) {
				return [];
			}
			const existing = await db
				.select({ id: exhibitionImages.id })
				.from(exhibitionImages)
				.where(
					and(
						eq(exhibitionImages.exhibitionId, exhibitionId),
						inArray(exhibitionImages.id, imageIds),
						isNull(exhibitionImages.deletedAt),
					),
				);

			if (existing.length !== imageIds.length) {
				return null;
			}

			for (const item of input) {
				await db
					.update(exhibitionImages)
					.set({
						...(item.imageUrl !== undefined ? { imageUrl: item.imageUrl } : {}),
						...(item.sortOrder !== undefined
							? { sortOrder: item.sortOrder }
							: {}),
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(exhibitionImages.id, item.imageId),
							eq(exhibitionImages.exhibitionId, exhibitionId),
							isNull(exhibitionImages.deletedAt),
						),
					);
			}
			await db
				.update(exhibitions)
				.set({ updatedAt: new Date() })
				.where(
					and(eq(exhibitions.id, exhibitionId), isNull(exhibitions.deletedAt)),
				);

			return db
				.select()
				.from(exhibitionImages)
				.where(
					and(
						inArray(exhibitionImages.id, imageIds),
						isNull(exhibitionImages.deletedAt),
					),
				)
				.orderBy(asc(exhibitionImages.sortOrder));
		},
		/**
		 * deleteExhibitionImage 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
		 * @param exhibitionId 대상을 식별하기 위한 ID 값입니다.
		 * @param imageId 대상을 식별하기 위한 ID 값입니다.
		 * @returns 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async deleteExhibitionImage(exhibitionId, imageId) {
			const exists = await db.query.exhibitionImages.findFirst({
				where: and(
					eq(exhibitionImages.id, imageId),
					eq(exhibitionImages.exhibitionId, exhibitionId),
					isNull(exhibitionImages.deletedAt),
				),
			});
			if (!exists) {
				return false;
			}
			await db
				.update(exhibitionImages)
				.set({
					deletedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(exhibitionImages.id, imageId),
						eq(exhibitionImages.exhibitionId, exhibitionId),
						isNull(exhibitionImages.deletedAt),
					),
				);
			await db
				.update(exhibitions)
				.set({ updatedAt: new Date() })
				.where(
					and(eq(exhibitions.id, exhibitionId), isNull(exhibitions.deletedAt)),
				);
			return true;
		},

		/**
		 * listLinktrees의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
		 * @returns 비동기 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async listLinktrees() {
			const rows = await db
				.select()
				.from(linktree)
				.where(isNull(linktree.deletedAt));
			return mapLinktreesWithItems(db, rows);
		},
		/**
		 * createLinktree 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
		 * @param input 함수 로직에서 사용하는 입력값입니다.
		 * @returns 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async createLinktree(input) {
			const id = crypto.randomUUID();
			const now = new Date();
			await db.insert(linktree).values({
				id,
				name: input.name,
				createdAt: now,
				updatedAt: now,
			});
			return (await this.getLinktreeById(id))!;
		},
		/**
		 * getLinktreeById 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
		 * @param id 대상을 식별하기 위한 ID 값입니다.
		 * @returns 조회/계산된 결과 값을 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async getLinktreeById(id) {
			const row = await db.query.linktree.findFirst({
				where: and(eq(linktree.id, id), isNull(linktree.deletedAt)),
			});
			if (!row) {
				return null;
			}
			return (await mapLinktreesWithItems(db, [row]))[0] ?? null;
		},
		/**
		 * updateLinktree 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
		 * @param id 대상을 식별하기 위한 ID 값입니다.
		 * @param input 함수 로직에서 사용하는 입력값입니다.
		 * @returns 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async updateLinktree(id, input) {
			const exists = await db.query.linktree.findFirst({
				where: and(eq(linktree.id, id), isNull(linktree.deletedAt)),
			});
			if (!exists) {
				return null;
			}
			await db
				.update(linktree)
				.set({
					...(input.name !== undefined ? { name: input.name } : {}),
					updatedAt: new Date(),
				})
				.where(and(eq(linktree.id, id), isNull(linktree.deletedAt)));
			return this.getLinktreeById(id);
		},
		/**
		 * deleteLinktree 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
		 * @param id 대상을 식별하기 위한 ID 값입니다.
		 * @returns 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async deleteLinktree(id) {
			const exists = await db.query.linktree.findFirst({
				where: and(eq(linktree.id, id), isNull(linktree.deletedAt)),
			});
			if (!exists) {
				return false;
			}
			await db
				.update(linktree)
				.set({
					deletedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(and(eq(linktree.id, id), isNull(linktree.deletedAt)));
			await db
				.update(linktreeItems)
				.set({
					deletedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(linktreeItems.linktreeId, id),
						isNull(linktreeItems.deletedAt),
					),
				);
			return true;
		},
		/**
		 * addLinktreeItem의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
		 * @param linktreeId 대상을 식별하기 위한 ID 값입니다.
		 * @param input 함수 로직에서 사용하는 입력값입니다.
		 * @returns 비동기 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async addLinktreeItem(linktreeId, input) {
			const parent = await db.query.linktree.findFirst({
				where: and(eq(linktree.id, linktreeId), isNull(linktree.deletedAt)),
			});
			if (!parent) {
				return null;
			}
			const id = crypto.randomUUID();
			const now = new Date();
			await db.insert(linktreeItems).values({
				id,
				linktreeId,
				name: input.name,
				link: input.link,
				createdAt: now,
				updatedAt: now,
			});
			await db
				.update(linktree)
				.set({ updatedAt: new Date() })
				.where(and(eq(linktree.id, linktreeId), isNull(linktree.deletedAt)));
			const row =
				(await db.query.linktreeItems.findFirst({
					where: and(eq(linktreeItems.id, id), isNull(linktreeItems.deletedAt)),
				})) ?? null;
			if (!row) {
				return null;
			}

			const updatedBy = await this.getLatestAuditActor("linktree_item", row.id);
			return {
				...row,
				updatedBy,
			};
		},
		/**
		 * updateLinktreeItem 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
		 * @param linktreeId 대상을 식별하기 위한 ID 값입니다.
		 * @param itemId 대상을 식별하기 위한 ID 값입니다.
		 * @param input 함수 로직에서 사용하는 입력값입니다.
		 * @returns 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async updateLinktreeItem(linktreeId, itemId, input) {
			const exists = await db.query.linktreeItems.findFirst({
				where: and(
					eq(linktreeItems.id, itemId),
					eq(linktreeItems.linktreeId, linktreeId),
					isNull(linktreeItems.deletedAt),
				),
			});
			if (!exists) {
				return null;
			}
			await db
				.update(linktreeItems)
				.set({
					...(input.name !== undefined ? { name: input.name } : {}),
					...(input.link !== undefined ? { link: input.link } : {}),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(linktreeItems.id, itemId),
						eq(linktreeItems.linktreeId, linktreeId),
						isNull(linktreeItems.deletedAt),
					),
				);
			await db
				.update(linktree)
				.set({ updatedAt: new Date() })
				.where(and(eq(linktree.id, linktreeId), isNull(linktree.deletedAt)));
			const row =
				(await db.query.linktreeItems.findFirst({
					where: and(
						eq(linktreeItems.id, itemId),
						isNull(linktreeItems.deletedAt),
					),
				})) ?? null;
			if (!row) {
				return null;
			}

			const updatedBy = await this.getLatestAuditActor("linktree_item", row.id);
			return {
				...row,
				updatedBy,
			};
		},
		/**
		 * deleteLinktreeItem 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
		 * @param linktreeId 대상을 식별하기 위한 ID 값입니다.
		 * @param itemId 대상을 식별하기 위한 ID 값입니다.
		 * @returns 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async deleteLinktreeItem(linktreeId, itemId) {
			const exists = await db.query.linktreeItems.findFirst({
				where: and(
					eq(linktreeItems.id, itemId),
					eq(linktreeItems.linktreeId, linktreeId),
					isNull(linktreeItems.deletedAt),
				),
			});
			if (!exists) {
				return false;
			}
			await db
				.update(linktreeItems)
				.set({
					deletedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(linktreeItems.id, itemId),
						eq(linktreeItems.linktreeId, linktreeId),
						isNull(linktreeItems.deletedAt),
					),
				);
			await db
				.update(linktree)
				.set({ updatedAt: new Date() })
				.where(and(eq(linktree.id, linktreeId), isNull(linktree.deletedAt)));
			return true;
		},

		async listGenerationNotices(generationId) {
			const rows = await (async () => {
				try {
					return await db
						.select({
							id: generationNotices.id,
							generationId: generationNotices.generationId,
							title: generationNotices.title,
							content: generationNotices.content,
							imageUrls: generationNotices.imageUrls,
							createdAt: generationNotices.createdAt,
							updatedAt: generationNotices.updatedAt,
							authorId: user.id,
							authorName: user.name,
							authorFamilyName: user.familyName,
							authorGivenName: user.givenName,
							authorImage: user.image,
							authorRole: user.role,
						})
						.from(generationNotices)
						.innerJoin(user, eq(generationNotices.authorId, user.id))
						.where(
							and(
								eq(generationNotices.generationId, generationId),
								isNull(generationNotices.deletedAt),
								isNull(user.deletedAt),
							),
						)
						.orderBy(desc(generationNotices.createdAt));
				} catch (error) {
					if (!isMissingNoticeImageUrlsColumnsError(error)) {
						throw error;
					}

					return db
						.select({
							id: generationNotices.id,
							generationId: generationNotices.generationId,
							title: generationNotices.title,
							content: generationNotices.content,
							imageUrls: sql<string>`'[]'`,
							createdAt: generationNotices.createdAt,
							updatedAt: generationNotices.updatedAt,
							authorId: user.id,
							authorName: user.name,
							authorFamilyName: user.familyName,
							authorGivenName: user.givenName,
							authorImage: user.image,
							authorRole: user.role,
						})
						.from(generationNotices)
						.innerJoin(user, eq(generationNotices.authorId, user.id))
						.where(
							and(
								eq(generationNotices.generationId, generationId),
								isNull(generationNotices.deletedAt),
								isNull(user.deletedAt),
							),
						)
						.orderBy(desc(generationNotices.createdAt));
				}
			})();

			const updatedByMap = await listLatestAuditActorsByResourceId(
				db,
				"generation_notice",
				rows.map((row) => row.id),
			);
			return rows.map((row) =>
				toGenerationNoticeEntity(row, updatedByMap[row.id] ?? null),
			);
		},

		async createGenerationNotice(generationId, input) {
			const [generationExists, authorExists] = await Promise.all([
				db.query.generations.findFirst({
					where: and(
						eq(generations.id, generationId),
						isNull(generations.deletedAt),
					),
					columns: { id: true },
				}),
				db.query.user.findFirst({
					where: and(eq(user.id, input.authorId), isNull(user.deletedAt)),
					columns: { id: true },
				}),
			]);

			if (!generationExists || !authorExists) {
				return null;
			}

			const id = crypto.randomUUID();
			await db.insert(generationNotices).values({
				id,
				generationId,
				title: input.title,
				content: input.content,
				imageUrls: serializeNoticeImageUrls(input.imageUrls),
				authorId: input.authorId,
			});

			return this.getGenerationNoticeById(generationId, id);
		},

		async getGenerationNoticeById(generationId, noticeId) {
			const row = await (async () => {
				try {
					return await db
						.select({
							id: generationNotices.id,
							generationId: generationNotices.generationId,
							title: generationNotices.title,
							content: generationNotices.content,
							imageUrls: generationNotices.imageUrls,
							createdAt: generationNotices.createdAt,
							updatedAt: generationNotices.updatedAt,
							authorId: user.id,
							authorName: user.name,
							authorFamilyName: user.familyName,
							authorGivenName: user.givenName,
							authorImage: user.image,
							authorRole: user.role,
						})
						.from(generationNotices)
						.innerJoin(user, eq(generationNotices.authorId, user.id))
						.where(
							and(
								eq(generationNotices.id, noticeId),
								eq(generationNotices.generationId, generationId),
								isNull(generationNotices.deletedAt),
								isNull(user.deletedAt),
							),
						)
						.limit(1);
				} catch (error) {
					if (!isMissingNoticeImageUrlsColumnsError(error)) {
						throw error;
					}

					return db
						.select({
							id: generationNotices.id,
							generationId: generationNotices.generationId,
							title: generationNotices.title,
							content: generationNotices.content,
							imageUrls: sql<string>`'[]'`,
							createdAt: generationNotices.createdAt,
							updatedAt: generationNotices.updatedAt,
							authorId: user.id,
							authorName: user.name,
							authorFamilyName: user.familyName,
							authorGivenName: user.givenName,
							authorImage: user.image,
							authorRole: user.role,
						})
						.from(generationNotices)
						.innerJoin(user, eq(generationNotices.authorId, user.id))
						.where(
							and(
								eq(generationNotices.id, noticeId),
								eq(generationNotices.generationId, generationId),
								isNull(generationNotices.deletedAt),
								isNull(user.deletedAt),
							),
						)
						.limit(1);
				}
			})();

			if (!row[0]) {
				return null;
			}

			const updatedBy = await this.getLatestAuditActor(
				"generation_notice",
				noticeId,
			);
			return toGenerationNoticeEntity(row[0], updatedBy);
		},

		async updateGenerationNotice(generationId, noticeId, input) {
			const exists = await db.query.generationNotices.findFirst({
				where: and(
					eq(generationNotices.id, noticeId),
					eq(generationNotices.generationId, generationId),
					isNull(generationNotices.deletedAt),
				),
				columns: { id: true },
			});

			if (!exists) {
				return null;
			}

			await db
				.update(generationNotices)
				.set({
					...(input.title !== undefined ? { title: input.title } : {}),
					...(input.content !== undefined ? { content: input.content } : {}),
					...(input.imageUrls !== undefined
						? { imageUrls: serializeNoticeImageUrls(input.imageUrls) }
						: {}),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(generationNotices.id, noticeId),
						eq(generationNotices.generationId, generationId),
						isNull(generationNotices.deletedAt),
					),
				);

			return this.getGenerationNoticeById(generationId, noticeId);
		},

		async deleteGenerationNotice(generationId, noticeId) {
			const exists = await db.query.generationNotices.findFirst({
				where: and(
					eq(generationNotices.id, noticeId),
					eq(generationNotices.generationId, generationId),
					isNull(generationNotices.deletedAt),
				),
				columns: { id: true },
			});

			if (!exists) {
				return false;
			}

			await db
				.update(generationNotices)
				.set({
					deletedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(generationNotices.id, noticeId),
						eq(generationNotices.generationId, generationId),
						isNull(generationNotices.deletedAt),
					),
				);

			return true;
		},

		async listGlobalNotices() {
			const rows = await (async () => {
				try {
					return await db
						.select({
							id: globalNotices.id,
							title: globalNotices.title,
							content: globalNotices.content,
							imageUrls: globalNotices.imageUrls,
							createdAt: globalNotices.createdAt,
							updatedAt: globalNotices.updatedAt,
							authorId: user.id,
							authorName: user.name,
							authorFamilyName: user.familyName,
							authorGivenName: user.givenName,
							authorImage: user.image,
							authorRole: user.role,
						})
						.from(globalNotices)
						.innerJoin(user, eq(globalNotices.authorId, user.id))
						.where(and(isNull(globalNotices.deletedAt), isNull(user.deletedAt)))
						.orderBy(desc(globalNotices.createdAt));
				} catch (error) {
					if (!isMissingNoticeImageUrlsColumnsError(error)) {
						throw error;
					}

					return db
						.select({
							id: globalNotices.id,
							title: globalNotices.title,
							content: globalNotices.content,
							imageUrls: sql<string>`'[]'`,
							createdAt: globalNotices.createdAt,
							updatedAt: globalNotices.updatedAt,
							authorId: user.id,
							authorName: user.name,
							authorFamilyName: user.familyName,
							authorGivenName: user.givenName,
							authorImage: user.image,
							authorRole: user.role,
						})
						.from(globalNotices)
						.innerJoin(user, eq(globalNotices.authorId, user.id))
						.where(and(isNull(globalNotices.deletedAt), isNull(user.deletedAt)))
						.orderBy(desc(globalNotices.createdAt));
				}
			})();

			const updatedByMap = await listLatestAuditActorsByResourceId(
				db,
				"global_notice",
				rows.map((row) => row.id),
			);
			return rows.map((row) =>
				toGlobalNoticeEntity(row, updatedByMap[row.id] ?? null),
			);
		},

		async createGlobalNotice(input) {
			const authorExists = await db.query.user.findFirst({
				where: and(eq(user.id, input.authorId), isNull(user.deletedAt)),
				columns: { id: true },
			});

			if (!authorExists) {
				return null;
			}

			const id = crypto.randomUUID();
			await db.insert(globalNotices).values({
				id,
				title: input.title,
				content: input.content,
				imageUrls: serializeNoticeImageUrls(input.imageUrls),
				authorId: input.authorId,
			});

			return this.getGlobalNoticeById(id);
		},

		async getGlobalNoticeById(noticeId) {
			const row = await (async () => {
				try {
					return await db
						.select({
							id: globalNotices.id,
							title: globalNotices.title,
							content: globalNotices.content,
							imageUrls: globalNotices.imageUrls,
							createdAt: globalNotices.createdAt,
							updatedAt: globalNotices.updatedAt,
							authorId: user.id,
							authorName: user.name,
							authorFamilyName: user.familyName,
							authorGivenName: user.givenName,
							authorImage: user.image,
							authorRole: user.role,
						})
						.from(globalNotices)
						.innerJoin(user, eq(globalNotices.authorId, user.id))
						.where(
							and(
								eq(globalNotices.id, noticeId),
								isNull(globalNotices.deletedAt),
								isNull(user.deletedAt),
							),
						)
						.limit(1);
				} catch (error) {
					if (!isMissingNoticeImageUrlsColumnsError(error)) {
						throw error;
					}

					return db
						.select({
							id: globalNotices.id,
							title: globalNotices.title,
							content: globalNotices.content,
							imageUrls: sql<string>`'[]'`,
							createdAt: globalNotices.createdAt,
							updatedAt: globalNotices.updatedAt,
							authorId: user.id,
							authorName: user.name,
							authorFamilyName: user.familyName,
							authorGivenName: user.givenName,
							authorImage: user.image,
							authorRole: user.role,
						})
						.from(globalNotices)
						.innerJoin(user, eq(globalNotices.authorId, user.id))
						.where(
							and(
								eq(globalNotices.id, noticeId),
								isNull(globalNotices.deletedAt),
								isNull(user.deletedAt),
							),
						)
						.limit(1);
				}
			})();

			if (!row[0]) {
				return null;
			}

			const updatedBy = await this.getLatestAuditActor(
				"global_notice",
				noticeId,
			);
			return toGlobalNoticeEntity(row[0], updatedBy);
		},

		async updateGlobalNotice(noticeId, input) {
			const exists = await db.query.globalNotices.findFirst({
				where: and(
					eq(globalNotices.id, noticeId),
					isNull(globalNotices.deletedAt),
				),
				columns: { id: true },
			});

			if (!exists) {
				return null;
			}

			await db
				.update(globalNotices)
				.set({
					...(input.title !== undefined ? { title: input.title } : {}),
					...(input.content !== undefined ? { content: input.content } : {}),
					...(input.imageUrls !== undefined
						? { imageUrls: serializeNoticeImageUrls(input.imageUrls) }
						: {}),
					updatedAt: new Date(),
				})
				.where(
					and(eq(globalNotices.id, noticeId), isNull(globalNotices.deletedAt)),
				);

			return this.getGlobalNoticeById(noticeId);
		},

		async deleteGlobalNotice(noticeId) {
			const exists = await db.query.globalNotices.findFirst({
				where: and(
					eq(globalNotices.id, noticeId),
					isNull(globalNotices.deletedAt),
				),
				columns: { id: true },
			});

			if (!exists) {
				return false;
			}

			await db
				.update(globalNotices)
				.set({
					deletedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(
					and(eq(globalNotices.id, noticeId), isNull(globalNotices.deletedAt)),
				);

			return true;
		},

		async listMarketItems(input) {
			const safePage =
				typeof input.page === "number" &&
				Number.isFinite(input.page) &&
				input.page > 0
					? Math.floor(input.page)
					: 1;
			const safePageSize =
				typeof input.pageSize === "number" &&
				Number.isFinite(input.pageSize) &&
				input.pageSize > 0
					? Math.min(100, Math.floor(input.pageSize))
					: 20;

			const conditions = [
				isNull(marketItems.deletedAt),
				isNull(user.deletedAt),
			];
			if (input.status) {
				conditions.push(eq(marketItems.status, input.status));
			}
			if (input.sellerId) {
				conditions.push(eq(marketItems.sellerId, input.sellerId));
			}

			const rows = await db
				.select({
					id: marketItems.id,
					sellerId: marketItems.sellerId,
					name: marketItems.name,
					manufacturer: marketItems.manufacturer,
					productCode: marketItems.productCode,
					conditionGrade: marketItems.conditionGrade,
					description: marketItems.description,
					price: marketItems.price,
					status: marketItems.status,
					createdAt: marketItems.createdAt,
					updatedAt: marketItems.updatedAt,
					sellerName: user.name,
					sellerFamilyName: user.familyName,
					sellerGivenName: user.givenName,
					sellerImage: user.image,
					sellerRole: user.role,
				})
				.from(marketItems)
				.innerJoin(user, eq(marketItems.sellerId, user.id))
				.where(and(...conditions))
				.orderBy(desc(marketItems.createdAt))
				.limit(safePageSize)
				.offset((safePage - 1) * safePageSize);

			return mapMarketItemsWithImages(db, rows);
		},

		async createMarketItem(input) {
			const seller = await db.query.user.findFirst({
				where: and(eq(user.id, input.sellerId), isNull(user.deletedAt)),
				columns: { id: true },
			});
			if (!seller) {
				return null;
			}

			const itemId = crypto.randomUUID();
			const now = new Date();
			await db.insert(marketItems).values({
				id: itemId,
				sellerId: input.sellerId,
				name: input.name,
				manufacturer: input.manufacturer,
				productCode: input.productCode,
				conditionGrade: input.conditionGrade,
				description: input.description,
				price: input.price,
				status: "selling",
				createdAt: now,
				updatedAt: now,
			});

			if (input.imageUrls.length > 0) {
				await db.insert(marketItemImages).values(
					input.imageUrls.map((imageUrl, index) => ({
						id: crypto.randomUUID(),
						itemId,
						imageUrl,
						sortOrder: index,
						createdAt: now,
						updatedAt: now,
					})),
				);
			}

			return this.getMarketItemById(itemId);
		},

		async getMarketItemById(id) {
			const rows = await db
				.select({
					id: marketItems.id,
					sellerId: marketItems.sellerId,
					name: marketItems.name,
					manufacturer: marketItems.manufacturer,
					productCode: marketItems.productCode,
					conditionGrade: marketItems.conditionGrade,
					description: marketItems.description,
					price: marketItems.price,
					status: marketItems.status,
					createdAt: marketItems.createdAt,
					updatedAt: marketItems.updatedAt,
					sellerName: user.name,
					sellerFamilyName: user.familyName,
					sellerGivenName: user.givenName,
					sellerImage: user.image,
					sellerRole: user.role,
				})
				.from(marketItems)
				.innerJoin(user, eq(marketItems.sellerId, user.id))
				.where(
					and(
						eq(marketItems.id, id),
						isNull(marketItems.deletedAt),
						isNull(user.deletedAt),
					),
				)
				.limit(1);

			if (!rows[0]) {
				return null;
			}

			const mapped = await mapMarketItemsWithImages(db, [rows[0]]);
			return mapped[0] ?? null;
		},

		async updateMarketItem(id, input) {
			const exists = await db.query.marketItems.findFirst({
				where: and(eq(marketItems.id, id), isNull(marketItems.deletedAt)),
				columns: { id: true },
			});
			if (!exists) {
				return null;
			}

			await db
				.update(marketItems)
				.set({
					...(input.name !== undefined ? { name: input.name } : {}),
					...(input.manufacturer !== undefined
						? { manufacturer: input.manufacturer }
						: {}),
					...(input.productCode !== undefined
						? { productCode: input.productCode }
						: {}),
					...(input.conditionGrade !== undefined
						? { conditionGrade: input.conditionGrade }
						: {}),
					...(input.description !== undefined
						? { description: input.description }
						: {}),
					...(input.price !== undefined ? { price: input.price } : {}),
					updatedAt: new Date(),
				})
				.where(and(eq(marketItems.id, id), isNull(marketItems.deletedAt)));

			if (input.imageUrls !== undefined) {
				const now = new Date();
				await db
					.update(marketItemImages)
					.set({
						deletedAt: now,
						updatedAt: now,
					})
					.where(
						and(
							eq(marketItemImages.itemId, id),
							isNull(marketItemImages.deletedAt),
						),
					);

				if (input.imageUrls.length > 0) {
					await db.insert(marketItemImages).values(
						input.imageUrls.map((imageUrl, index) => ({
							id: crypto.randomUUID(),
							itemId: id,
							imageUrl,
							sortOrder: index,
							createdAt: now,
							updatedAt: now,
						})),
					);
				}
			}

			return this.getMarketItemById(id);
		},

		async updateMarketItemStatus(id, status) {
			const exists = await db.query.marketItems.findFirst({
				where: and(eq(marketItems.id, id), isNull(marketItems.deletedAt)),
				columns: { id: true },
			});
			if (!exists) {
				return null;
			}

			await db
				.update(marketItems)
				.set({
					status,
					updatedAt: new Date(),
				})
				.where(and(eq(marketItems.id, id), isNull(marketItems.deletedAt)));

			return this.getMarketItemById(id);
		},

		async deleteMarketItem(id) {
			const exists = await db.query.marketItems.findFirst({
				where: and(eq(marketItems.id, id), isNull(marketItems.deletedAt)),
				columns: { id: true },
			});
			if (!exists) {
				return false;
			}

			const now = new Date();
			await db
				.update(marketItems)
				.set({
					deletedAt: now,
					updatedAt: now,
				})
				.where(and(eq(marketItems.id, id), isNull(marketItems.deletedAt)));
			await db
				.update(marketItemImages)
				.set({
					deletedAt: now,
					updatedAt: now,
				})
				.where(
					and(
						eq(marketItemImages.itemId, id),
						isNull(marketItemImages.deletedAt),
					),
				);
			await db
				.update(marketComments)
				.set({
					deletedAt: now,
					updatedAt: now,
				})
				.where(
					and(eq(marketComments.itemId, id), isNull(marketComments.deletedAt)),
				);

			return true;
		},

		async listMarketCommentsByItemId(itemId) {
			const rows = await db
				.select({
					id: marketComments.id,
					itemId: marketComments.itemId,
					content: marketComments.content,
					createdAt: marketComments.createdAt,
					updatedAt: marketComments.updatedAt,
					authorId: user.id,
					authorName: user.name,
					authorFamilyName: user.familyName,
					authorGivenName: user.givenName,
					authorImage: user.image,
					authorRole: user.role,
				})
				.from(marketComments)
				.innerJoin(user, eq(marketComments.authorId, user.id))
				.where(
					and(
						eq(marketComments.itemId, itemId),
						isNull(marketComments.deletedAt),
						isNull(user.deletedAt),
					),
				)
				.orderBy(asc(marketComments.createdAt));

			const updatedByMap = await listLatestAuditActorsByResourceId(
				db,
				"market_comment",
				rows.map((row) => row.id),
			);

			return rows.map((row) =>
				toMarketCommentEntity(row, updatedByMap[row.id] ?? null),
			);
		},

		async createMarketComment(input) {
			const [itemExists, authorExists] = await Promise.all([
				db.query.marketItems.findFirst({
					where: and(
						eq(marketItems.id, input.itemId),
						isNull(marketItems.deletedAt),
					),
					columns: { id: true },
				}),
				db.query.user.findFirst({
					where: and(eq(user.id, input.authorId), isNull(user.deletedAt)),
					columns: { id: true },
				}),
			]);

			if (!itemExists || !authorExists) {
				return null;
			}

			const id = crypto.randomUUID();
			await db.insert(marketComments).values({
				id,
				itemId: input.itemId,
				authorId: input.authorId,
				content: input.content,
			});

			await db
				.update(marketItems)
				.set({ updatedAt: new Date() })
				.where(
					and(eq(marketItems.id, input.itemId), isNull(marketItems.deletedAt)),
				);

			return this.getMarketCommentById(id);
		},

		async getMarketCommentById(id) {
			const rows = await db
				.select({
					id: marketComments.id,
					itemId: marketComments.itemId,
					content: marketComments.content,
					createdAt: marketComments.createdAt,
					updatedAt: marketComments.updatedAt,
					authorId: user.id,
					authorName: user.name,
					authorFamilyName: user.familyName,
					authorGivenName: user.givenName,
					authorImage: user.image,
					authorRole: user.role,
				})
				.from(marketComments)
				.innerJoin(user, eq(marketComments.authorId, user.id))
				.where(
					and(
						eq(marketComments.id, id),
						isNull(marketComments.deletedAt),
						isNull(user.deletedAt),
					),
				)
				.limit(1);

			if (!rows[0]) {
				return null;
			}

			const updatedBy = await this.getLatestAuditActor("market_comment", id);
			return toMarketCommentEntity(rows[0], updatedBy);
		},

		async updateMarketComment(id, input) {
			const exists = await db.query.marketComments.findFirst({
				where: and(eq(marketComments.id, id), isNull(marketComments.deletedAt)),
				columns: { id: true, itemId: true },
			});
			if (!exists) {
				return null;
			}

			await db
				.update(marketComments)
				.set({
					...(input.content !== undefined ? { content: input.content } : {}),
					updatedAt: new Date(),
				})
				.where(
					and(eq(marketComments.id, id), isNull(marketComments.deletedAt)),
				);

			await db
				.update(marketItems)
				.set({ updatedAt: new Date() })
				.where(
					and(eq(marketItems.id, exists.itemId), isNull(marketItems.deletedAt)),
				);

			return this.getMarketCommentById(id);
		},

		async deleteMarketComment(id) {
			const exists = await db.query.marketComments.findFirst({
				where: and(eq(marketComments.id, id), isNull(marketComments.deletedAt)),
				columns: { id: true, itemId: true },
			});
			if (!exists) {
				return false;
			}

			const now = new Date();
			await db
				.update(marketComments)
				.set({
					deletedAt: now,
					updatedAt: now,
				})
				.where(
					and(eq(marketComments.id, id), isNull(marketComments.deletedAt)),
				);

			await db
				.update(marketItems)
				.set({ updatedAt: now })
				.where(
					and(eq(marketItems.id, exists.itemId), isNull(marketItems.deletedAt)),
				);

			return true;
		},

		async upsertMarketPushSubscription(input) {
			const userExists = await db.query.user.findFirst({
				where: and(eq(user.id, input.userId), isNull(user.deletedAt)),
				columns: { id: true },
			});
			if (!userExists) {
				return null;
			}

			const existing = await db.query.marketPushSubscriptions.findFirst({
				where: eq(marketPushSubscriptions.endpoint, input.endpoint),
			});

			if (existing) {
				await db
					.update(marketPushSubscriptions)
					.set({
						userId: input.userId,
						p256dh: input.p256dh,
						auth: input.auth,
						updatedAt: new Date(),
					})
					.where(eq(marketPushSubscriptions.id, existing.id));

				return (
					(await db.query.marketPushSubscriptions.findFirst({
						where: eq(marketPushSubscriptions.id, existing.id),
					})) ?? null
				);
			}

			const id = crypto.randomUUID();
			await db.insert(marketPushSubscriptions).values({
				id,
				userId: input.userId,
				endpoint: input.endpoint,
				p256dh: input.p256dh,
				auth: input.auth,
			});

			return (
				(await db.query.marketPushSubscriptions.findFirst({
					where: eq(marketPushSubscriptions.id, id),
				})) ?? null
			);
		},

		async deleteMarketPushSubscription(input) {
			const existing = await db.query.marketPushSubscriptions.findFirst({
				where: and(
					eq(marketPushSubscriptions.userId, input.userId),
					eq(marketPushSubscriptions.endpoint, input.endpoint),
				),
				columns: { id: true },
			});
			if (!existing) {
				return false;
			}

			await db
				.delete(marketPushSubscriptions)
				.where(eq(marketPushSubscriptions.id, existing.id));
			return true;
		},

		async listMarketPushSubscriptionsByUserId(userId) {
			return db
				.select()
				.from(marketPushSubscriptions)
				.where(eq(marketPushSubscriptions.userId, userId))
				.orderBy(desc(marketPushSubscriptions.updatedAt));
		},

		async getSiteSettings() {
			const row =
				(await db.query.siteSettings.findFirst({
					where: eq(siteSettings.id, SITE_SETTINGS_SINGLETON_ID),
				})) ?? null;
			return toSiteSettingsEntity(row);
		},

		async updateSiteSettings(input) {
			const current = await this.getSiteSettings();
			const next: SiteSettingsEntity = {
				...current,
				...input,
			};

			next.footerInstagramId = normalizeInstagramId(next.footerInstagramId);

			await db
				.insert(siteSettings)
				.values({
					id: SITE_SETTINGS_SINGLETON_ID,
					footerOpenChatUrl: next.footerOpenChatUrl,
					footerInstagramId: next.footerInstagramId,
					footerEmail: next.footerEmail,
					footerPhone: next.footerPhone,
					footerAddress: next.footerAddress,
					donateBankName: next.donateBankName,
					donateAccountNumber: next.donateAccountNumber,
					donateAccountHolder: next.donateAccountHolder,
				})
				.onConflictDoUpdate({
					target: siteSettings.id,
					set: {
						footerOpenChatUrl: next.footerOpenChatUrl,
						footerInstagramId: next.footerInstagramId,
						footerEmail: next.footerEmail,
						footerPhone: next.footerPhone,
						footerAddress: next.footerAddress,
						donateBankName: next.donateBankName,
						donateAccountNumber: next.donateAccountNumber,
						donateAccountHolder: next.donateAccountHolder,
						updatedAt: new Date(),
					},
				});

			return next;
		},

		async getCurrentRecruitingPlan() {
			const currentYear = readCurrentKoreanYear();
			const row =
				(await db.query.recruitingPlans.findFirst({
					where: eq(recruitingPlans.year, currentYear),
				})) ?? null;

			if (!row) {
				return null;
			}

			return toRecruitingPlanEntity(row);
		},

		async upsertCurrentRecruitingPlan(input) {
			const currentYear = readCurrentKoreanYear();

			await db
				.insert(recruitingPlans)
				.values({
					year: currentYear,
					title: input.title,
					content: input.content,
					promotionImageUrls: serializeRecruitingPromotionImageUrls(
						input.promotionImageUrls,
					),
					recruitmentStartAt: input.recruitmentStartAt,
					recruitmentEndAt: input.recruitmentEndAt,
				})
				.onConflictDoUpdate({
					target: recruitingPlans.year,
					set: {
						title: input.title,
						content: input.content,
						promotionImageUrls: serializeRecruitingPromotionImageUrls(
							input.promotionImageUrls,
						),
						recruitmentStartAt: input.recruitmentStartAt,
						recruitmentEndAt: input.recruitmentEndAt,
						updatedAt: new Date(),
					},
				});

			const saved = await db.query.recruitingPlans.findFirst({
				where: eq(recruitingPlans.year, currentYear),
			});
			if (!saved) {
				throw new Error("현재 연도 모집 계획 저장 결과를 찾을 수 없습니다.");
			}

			return toRecruitingPlanEntity(saved);
		},

		/**
		 * listUsers의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
		 * @returns 비동기 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async listUsers() {
			const rows = await db
				.select()
				.from(user)
				.where(isNull(user.deletedAt))
				.orderBy(desc(user.createdAt));
			return mapUsersWithGenerations(db, rows);
		},
		async listUsersByIds(userIds) {
			const normalizedUserIds = Array.from(
				new Set(userIds.map((userId) => userId.trim()).filter(Boolean)),
			);
			if (normalizedUserIds.length === 0) {
				return [];
			}

			const rows = await db
				.select()
				.from(user)
				.where(
					and(inArray(user.id, normalizedUserIds), isNull(user.deletedAt)),
				)
				.orderBy(desc(user.createdAt));
			return mapUsersWithGenerations(db, rows);
		},
		async listUsersByGenerationIds(generationIds) {
			const normalizedGenerationIds = Array.from(
				new Set(
					generationIds
						.map((generationId) => generationId.trim())
						.filter(Boolean),
				),
			);
			if (normalizedGenerationIds.length === 0) {
				return [];
			}

			const readLegacyUserIds = async (): Promise<string[]> => {
				const legacyRows = await db
					.select({
						id: user.id,
					})
					.from(user)
					.where(
						and(
							inArray(user.generationId, normalizedGenerationIds),
							isNull(user.deletedAt),
						),
					)
					.orderBy(desc(user.createdAt));
				return legacyRows.map((row) => row.id);
			};

			try {
				const [linkedRows, legacyUserIds] = await Promise.all([
					db
						.select({
							id: user.id,
						})
						.from(user)
						.innerJoin(userGenerations, eq(user.id, userGenerations.userId))
						.innerJoin(
							generations,
							eq(userGenerations.generationId, generations.id),
						)
						.where(
							and(
								inArray(userGenerations.generationId, normalizedGenerationIds),
								isNull(user.deletedAt),
								isNull(generations.deletedAt),
							),
						)
						.orderBy(desc(user.createdAt)),
					readLegacyUserIds(),
				]);

				const targetUserIds = Array.from(
					new Set([...linkedRows.map((row) => row.id), ...legacyUserIds]),
				);
				return this.listUsersByIds(targetUserIds);
			} catch (error) {
				if (!isMissingUserGenerationsTableError(error)) {
					throw error;
				}

				return this.listUsersByIds(await readLegacyUserIds());
			}
		},
		async countUsersByRole(role) {
			const rows = await db
				.select({
					value: sql<number>`count(*)`,
				})
				.from(user)
				.where(and(isNull(user.deletedAt), eq(user.role, role)));
			return rows[0]?.value ?? 0;
		},
		/**
		 * getUserById 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
		 * @param id 대상을 식별하기 위한 ID 값입니다.
		 * @returns 조회/계산된 결과 값을 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async getUserById(id) {
			const row = await db.query.user.findFirst({
				where: and(eq(user.id, id), isNull(user.deletedAt)),
			});
			if (!row) {
				return null;
			}
			return (await mapUsersWithGenerations(db, [row]))[0] ?? null;
		},
		/**
		 * listUserResourceHistory의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
		 * @param input 함수 로직에서 사용하는 입력값입니다.
		 * @returns 비동기 처리 결과를 Promise로 반환합니다.
		 * @remarks 감사 로그(actorId) 기반으로 사용자의 리소스 생성/수정/삭제 이력을 반환합니다.
		 */
		async listUserResourceHistory(input) {
			const safePage =
				typeof input.page === "number" &&
				Number.isFinite(input.page) &&
				input.page > 0
					? Math.floor(input.page)
					: 1;
			const safePageSize =
				typeof input.pageSize === "number" &&
				Number.isFinite(input.pageSize) &&
				input.pageSize > 0
					? Math.min(100, Math.floor(input.pageSize))
					: 10;
			const conditions = [
				eq(auditLogs.actorId, input.userId),
				inArray(auditLogs.resourceType, [
					...USER_RESOURCE_HISTORY_RESOURCE_TYPES,
				]),
			];

			if (input.action) {
				conditions.push(eq(auditLogs.action, input.action));
			}

			const totalRows = await db
				.select({
					value: sql<number>`count(*)`,
				})
				.from(auditLogs)
				.where(and(...conditions));
			const total = totalRows[0]?.value ?? 0;
			const totalPages =
				total === 0 ? 0 : Math.ceil(total / safePageSize);
			const historyRows = await db
				.select({
					id: auditLogs.id,
					resourceType: auditLogs.resourceType,
					resourceId: auditLogs.resourceId,
					action: auditLogs.action,
					changedFields: auditLogs.changedFields,
					createdAt: auditLogs.createdAt,
				})
				.from(auditLogs)
				.where(and(...conditions))
				.orderBy(desc(auditLogs.createdAt))
				.limit(safePageSize)
				.offset((safePage - 1) * safePageSize);

			if (historyRows.length === 0) {
				return {
					items: [],
					page: safePage,
					pageSize: safePageSize,
					total,
					totalPages,
				};
			}

			const resourceIdsByType: Record<
				UserResourceHistoryResourceType,
				string[]
			> = {
				activity: [],
				exhibition: [],
				generation_notice: [],
				global_notice: [],
				linktree: [],
				linktree_item: [],
			};

			for (const row of historyRows) {
				if (!isUserResourceHistoryResourceType(row.resourceType)) {
					continue;
				}
				resourceIdsByType[row.resourceType].push(row.resourceId);
			}

			for (const resourceType of USER_RESOURCE_HISTORY_RESOURCE_TYPES) {
				resourceIdsByType[resourceType] = Array.from(
					new Set(resourceIdsByType[resourceType]),
				);
			}

			const [
				activityRows,
				exhibitionRows,
				generationNoticeRows,
				globalNoticeRows,
				linktreeRows,
				linktreeItemRows,
			] = await Promise.all([
				resourceIdsByType.activity.length > 0
					? db
							.select({
								id: activities.id,
								resourceTitle: activities.title,
								generationId: activities.generationId,
								deletedAt: activities.deletedAt,
							})
							.from(activities)
							.where(inArray(activities.id, resourceIdsByType.activity))
					: Promise.resolve([]),
				resourceIdsByType.exhibition.length > 0
					? db
							.select({
								id: exhibitions.id,
								resourceTitle: exhibitions.title,
								generationId: exhibitions.generationId,
								deletedAt: exhibitions.deletedAt,
							})
							.from(exhibitions)
							.where(inArray(exhibitions.id, resourceIdsByType.exhibition))
					: Promise.resolve([]),
				resourceIdsByType.generation_notice.length > 0
					? db
							.select({
								id: generationNotices.id,
								resourceTitle: generationNotices.title,
								generationId: generationNotices.generationId,
								deletedAt: generationNotices.deletedAt,
							})
							.from(generationNotices)
							.where(
								inArray(
									generationNotices.id,
									resourceIdsByType.generation_notice,
								),
							)
					: Promise.resolve([]),
				resourceIdsByType.global_notice.length > 0
					? db
							.select({
								id: globalNotices.id,
								resourceTitle: globalNotices.title,
								deletedAt: globalNotices.deletedAt,
							})
							.from(globalNotices)
							.where(inArray(globalNotices.id, resourceIdsByType.global_notice))
					: Promise.resolve([]),
				resourceIdsByType.linktree.length > 0
					? db
							.select({
								id: linktree.id,
								resourceTitle: linktree.name,
								deletedAt: linktree.deletedAt,
							})
							.from(linktree)
							.where(inArray(linktree.id, resourceIdsByType.linktree))
					: Promise.resolve([]),
				resourceIdsByType.linktree_item.length > 0
					? db
							.select({
								id: linktreeItems.id,
								resourceTitle: linktreeItems.name,
								linktreeId: linktreeItems.linktreeId,
								deletedAt: linktreeItems.deletedAt,
							})
							.from(linktreeItems)
							.where(inArray(linktreeItems.id, resourceIdsByType.linktree_item))
					: Promise.resolve([]),
			]);

			const activityMetaById = new Map<string, UserResourceMeta>();
			for (const row of activityRows) {
				activityMetaById.set(row.id, {
					resourceTitle: row.resourceTitle,
					generationId: row.generationId,
					linktreeId: null,
					deletedAt: row.deletedAt,
				});
			}

			const exhibitionMetaById = new Map<string, UserResourceMeta>();
			for (const row of exhibitionRows) {
				exhibitionMetaById.set(row.id, {
					resourceTitle: row.resourceTitle,
					generationId: row.generationId,
					linktreeId: null,
					deletedAt: row.deletedAt,
				});
			}

			const generationNoticeMetaById = new Map<string, UserResourceMeta>();
			for (const row of generationNoticeRows) {
				generationNoticeMetaById.set(row.id, {
					resourceTitle: row.resourceTitle,
					generationId: row.generationId,
					linktreeId: null,
					deletedAt: row.deletedAt,
				});
			}

			const globalNoticeMetaById = new Map<string, UserResourceMeta>();
			for (const row of globalNoticeRows) {
				globalNoticeMetaById.set(row.id, {
					resourceTitle: row.resourceTitle,
					generationId: null,
					linktreeId: null,
					deletedAt: row.deletedAt,
				});
			}

			const linktreeMetaById = new Map<string, UserResourceMeta>();
			for (const row of linktreeRows) {
				linktreeMetaById.set(row.id, {
					resourceTitle: row.resourceTitle,
					generationId: null,
					linktreeId: null,
					deletedAt: row.deletedAt,
				});
			}

			const linktreeItemMetaById = new Map<string, UserResourceMeta>();
			for (const row of linktreeItemRows) {
				linktreeItemMetaById.set(row.id, {
					resourceTitle: row.resourceTitle,
					generationId: null,
					linktreeId: row.linktreeId,
					deletedAt: row.deletedAt,
				});
			}

			const metaByResourceType: Record<
				UserResourceHistoryResourceType,
				Map<string, UserResourceMeta>
			> = {
				activity: activityMetaById,
				exhibition: exhibitionMetaById,
				generation_notice: generationNoticeMetaById,
				global_notice: globalNoticeMetaById,
				linktree: linktreeMetaById,
				linktree_item: linktreeItemMetaById,
			};

			const items: UserResourceHistoryItemEntity[] = [];
			for (const row of historyRows) {
				if (!isUserResourceHistoryResourceType(row.resourceType)) {
					continue;
				}

				const action = row.action as AuditAction;
				const meta =
					metaByResourceType[row.resourceType].get(row.resourceId) ?? null;
				const isDeleted = meta ? meta.deletedAt !== null : action === "delete";

				items.push({
					id: row.id,
					resourceType: row.resourceType,
					resourceId: row.resourceId,
					resourceTitle: meta?.resourceTitle ?? null,
					action,
					changedFields: parseChangedFields(row.changedFields),
					isDeleted,
					generationId: meta?.generationId ?? null,
					linktreeId: meta?.linktreeId ?? null,
					createdAt: row.createdAt,
				});
			}

			return {
				items,
				page: safePage,
				pageSize: safePageSize,
				total,
				totalPages,
			};
		},
		/**
		 * updateUser 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
		 * @param id 대상을 식별하기 위한 ID 값입니다.
		 * @param input 함수 로직에서 사용하는 입력값입니다.
		 * @returns 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async updateUser(id, input) {
			const exists = await db.query.user.findFirst({
				where: and(eq(user.id, id), isNull(user.deletedAt)),
			});
			if (!exists) {
				return null;
			}

			const nextGenerationIds =
				input.generationIds !== undefined
					? input.generationIds
					: input.generationId !== undefined
						? input.generationId
							? [input.generationId]
							: []
						: undefined;

			await db
				.update(user)
				.set({
					...(input.name !== undefined ? { name: input.name } : {}),
					...(input.image !== undefined ? { image: input.image } : {}),
					...(input.showcaseImageUrls !== undefined
						? {
								showcaseImageUrls: serializeShowcaseImageUrls(
									input.showcaseImageUrls,
								),
							}
						: {}),
					...(input.familyName !== undefined
						? { familyName: input.familyName }
						: {}),
					...(input.givenName !== undefined
						? { givenName: input.givenName }
						: {}),
					...(input.college !== undefined ? { college: input.college } : {}),
					...(input.department !== undefined
						? { department: input.department }
						: {}),
					...(input.studentNumber !== undefined
						? { studentNumber: input.studentNumber }
						: {}),
					...(input.phoneNumber !== undefined
						? { phoneNumber: input.phoneNumber }
						: {}),
					...(input.collaborationAvailable !== undefined
						? { collaborationAvailable: input.collaborationAvailable }
						: {}),
					...(input.personalLink !== undefined
						? { personalLink: input.personalLink }
						: {}),
					...(input.role !== undefined ? { role: input.role } : {}),
					updatedAt: new Date(),
				})
				.where(and(eq(user.id, id), isNull(user.deletedAt)));

			if (nextGenerationIds !== undefined) {
				await replaceUserGenerations(db, id, nextGenerationIds);
			}

			return this.getUserById(id);
		},
		/**
		 * bulkUpdateUsersRole의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
		 * @param input 함수 로직에서 사용하는 입력값입니다.
		 * @returns 비동기 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async bulkUpdateUsersRole(input) {
			const targetUserIds = Array.from(
				new Set(input.userIds.filter((userId) => userId.trim().length > 0)),
			);
			if (targetUserIds.length === 0) {
				return [];
			}

			for (const targetUserId of targetUserIds) {
				await db
					.update(user)
					.set({
						role: input.role,
						updatedAt: new Date(),
					})
					.where(and(eq(user.id, targetUserId), isNull(user.deletedAt)));
			}

			const rows = await db
				.select()
				.from(user)
				.where(and(inArray(user.id, targetUserIds), isNull(user.deletedAt)));

			return mapUsersWithGenerations(db, rows);
		},
		/**
		 * getAdminDashboardStats 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
		 * @param generationSortOrder 함수 로직에서 사용하는 입력값입니다.
		 * @returns 조회/계산된 결과 값을 Promise로 반환합니다.
		 * @remarks 대시보드 KPI 집계를 위해 단순 count 쿼리를 결합해 사용합니다.
		 */
		async getAdminDashboardStats(generationSortOrder) {
			const [
				usersCountRows,
				unverifiedUsersCountRows,
				generationsCountRows,
				linktreeLinksCountRows,
			] = await Promise.all([
				db
					.select({ value: sql<number>`count(*)` })
					.from(user)
					.where(isNull(user.deletedAt)),
				db
					.select({ value: sql<number>`count(*)` })
					.from(user)
					.where(and(isNull(user.deletedAt), eq(user.role, "unverified"))),
				db
					.select({ value: sql<number>`count(*)` })
					.from(generations)
					.where(isNull(generations.deletedAt)),
				db
					.select({ value: sql<number>`count(*)` })
					.from(linktreeItems)
					.innerJoin(linktree, eq(linktreeItems.linktreeId, linktree.id))
					.where(
						and(isNull(linktreeItems.deletedAt), isNull(linktree.deletedAt)),
					),
			]);

			let selectedGenerationId: string | null = null;
			if (
				typeof generationSortOrder === "number" &&
				Number.isFinite(generationSortOrder)
			) {
				const generationRow = await db.query.generations.findFirst({
					where: and(
						eq(generations.sortOrder, generationSortOrder),
						isNull(generations.deletedAt),
					),
					columns: {
						id: true,
					},
				});
				selectedGenerationId = generationRow?.id ?? null;
			}

			let selectedGenerationMembersTotal = 0;
			let selectedGenerationActivitiesTotal = 0;
			let selectedGenerationExhibitionsTotal = 0;

			if (selectedGenerationId) {
				const [activitiesCountRows, exhibitionsCountRows] = await Promise.all([
					db
						.select({ value: sql<number>`count(*)` })
						.from(activities)
						.where(
							and(
								eq(activities.generationId, selectedGenerationId),
								isNull(activities.deletedAt),
							),
						),
					db
						.select({ value: sql<number>`count(*)` })
						.from(exhibitions)
						.where(
							and(
								eq(exhibitions.generationId, selectedGenerationId),
								isNull(exhibitions.deletedAt),
							),
						),
				]);

				selectedGenerationActivitiesTotal = activitiesCountRows[0]?.value ?? 0;
				selectedGenerationExhibitionsTotal =
					exhibitionsCountRows[0]?.value ?? 0;

				try {
					const memberRows = await db
						.select({
							userId: userGenerations.userId,
						})
						.from(userGenerations)
						.innerJoin(user, eq(userGenerations.userId, user.id))
						.where(
							and(
								eq(userGenerations.generationId, selectedGenerationId),
								isNull(user.deletedAt),
							),
						);
					selectedGenerationMembersTotal = new Set(
						memberRows.map((row) => row.userId),
					).size;
				} catch (error) {
					if (!isMissingUserGenerationsTableError(error)) {
						throw error;
					}
					const fallbackRows = await db
						.select({ value: sql<number>`count(*)` })
						.from(user)
						.where(
							and(
								eq(user.generationId, selectedGenerationId),
								isNull(user.deletedAt),
							),
						);
					selectedGenerationMembersTotal = fallbackRows[0]?.value ?? 0;
				}
			}

			return {
				usersTotal: usersCountRows[0]?.value ?? 0,
				unverifiedUsersTotal: unverifiedUsersCountRows[0]?.value ?? 0,
				generationsTotal: generationsCountRows[0]?.value ?? 0,
				selectedGenerationMembersTotal,
				selectedGenerationActivitiesTotal,
				selectedGenerationExhibitionsTotal,
				linktreeLinksTotal: linktreeLinksCountRows[0]?.value ?? 0,
			};
		},
		/**
		 * deleteUser 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
		 * @param id 대상을 식별하기 위한 ID 값입니다.
		 * @returns 처리 결과를 Promise로 반환합니다.
		 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
		 */
		async deleteUser(id) {
			const exists = await db.query.user.findFirst({
				where: and(eq(user.id, id), isNull(user.deletedAt)),
			});
			if (!exists) {
				return false;
			}
			await db
				.update(user)
				.set({
					deletedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(and(eq(user.id, id), isNull(user.deletedAt)));
			return true;
		},
	};
};
