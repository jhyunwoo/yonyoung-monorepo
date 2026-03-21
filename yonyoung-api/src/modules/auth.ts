import { OpenAPIHono } from "@hono/zod-openapi";
import { createAuth } from "../lib/auth";
import { resolveD1Database } from "../infra/db/client";
import HonoAppType from "../types/honoAppType";

type App = OpenAPIHono<HonoAppType>;

/**
 * registerAuthRoutes 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param app 함수 로직에서 사용하는 입력값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export function registerAuthRoutes(app: App) {
  app.on(["GET", "POST"], "/api/auth/*", async (c): Promise<any> => {
    const auth = createAuth(resolveD1Database(c.env), c.env);
    return auth.handler(c.req.raw);
  });
}
