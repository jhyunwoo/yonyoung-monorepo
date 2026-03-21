import { CACHE_TAGS, ADMIN_CACHE_TAG_VALUES } from "@/server/cache/tags";

export const ADMIN_CACHE_TAGS = CACHE_TAGS.admin;

export type AdminCacheTag = (typeof ADMIN_CACHE_TAGS)[keyof typeof ADMIN_CACHE_TAGS];

export { ADMIN_CACHE_TAG_VALUES };
