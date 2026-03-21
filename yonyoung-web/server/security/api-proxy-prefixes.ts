export const API_PROXY_ALLOWED_PREFIXES = [
  "activities",
  "admin",
  "audit",
  "exhibitions",
  "generations",
  "global-notices",
  "health",
  "linktree",
  "market",
  "notices",
  "public",
  "recruiting",
  "recruiting-plan",
  "site-settings",
  "users",
] as const;

export const API_PROXY_BLOCKED_PREFIXES = ["internal", "auth"] as const;
