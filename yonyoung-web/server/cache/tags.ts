import "server-only";

export const CACHE_TAGS = {
  public: {
    activities: "public:activities",
    exhibitions: "public:exhibitions",
    linktree: "public:linktree",
    generations: "public:generations",
    photographers: "public:photographers",
    recruitingPlan: "public:recruiting-plan",
    siteSettings: "public:site-settings",
  },
  admin: {
    generations: "admin:generations",
    activities: "admin:activities",
    exhibitions: "admin:exhibitions",
    linktree: "admin:linktree",
    market: "admin:market",
    notices: "admin:notices",
    recruitingPlan: "admin:recruiting-plan",
    siteSettings: "admin:site-settings",
    users: "admin:users",
  },
} as const;

export type PublicCacheTag = (typeof CACHE_TAGS.public)[keyof typeof CACHE_TAGS.public];

export type AdminCacheTag = (typeof CACHE_TAGS.admin)[keyof typeof CACHE_TAGS.admin];

export const PUBLIC_CACHE_TAG_VALUES = Object.values(
  CACHE_TAGS.public,
) as PublicCacheTag[];
export const ADMIN_CACHE_TAG_VALUES = Object.values(CACHE_TAGS.admin) as AdminCacheTag[];
