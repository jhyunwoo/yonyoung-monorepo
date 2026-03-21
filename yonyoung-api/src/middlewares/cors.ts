import { cors } from "hono/cors";
import { getAuthCorsOrigins } from "../lib/auth";

export const apiCorsMiddleware = cors({
  origin: (origin, c) => {
    const allowedOrigins = getAuthCorsOrigins(c.env);

    if (!origin) {
      return allowedOrigins[0] ?? "";
    }

    return allowedOrigins.includes(origin) ? origin : "";
  },
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: [
    "Content-Type",
    "Authorization",
    "X-Request-Id",
    "X-Revalidate-Secret",
  ],
  credentials: true,
  maxAge: 600,
});
