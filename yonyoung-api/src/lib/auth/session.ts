import { and, desc, eq, isNull } from "drizzle-orm";
import { Context } from "hono";
import { normalizeRole } from "../authorization/policy";
import { Actor } from "../authorization/types";
import { generations, user, userGenerations } from "../db/schema";
import { createAuth } from "../auth";
import HonoAppType from "../../types/honoAppType";
import { getDbClient } from "../db/factory";
import { resolveD1Database } from "../../infra/db/client";

const isMissingUserGenerationsTableError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes("no such table: user_generations");
};

/**
 * Better Auth 세션 기반으로 현재 사용자 정보를 로드한다.
 * 권한 판정 정확도를 위해 role/generation 정보는 DB에서 다시 읽는다.
 */
export const getActorFromSession = async (
  c: Context<HonoAppType>,
): Promise<Actor | null> => {
  const database = resolveD1Database(c.env);
  const auth = createAuth(database, c.env);
  const sessionResult = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!sessionResult?.user?.id) {
    return null;
  }

  const db = getDbClient(database);
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, sessionResult.user.id),
    columns: {
      id: true,
      name: true,
      familyName: true,
      givenName: true,
      email: true,
      role: true,
      generationId: true,
    },
  });

  if (!dbUser) {
    return null;
  }

  const generationRows = await (async () => {
    try {
      return await db
        .select({
          generationId: userGenerations.generationId,
        })
        .from(userGenerations)
        .innerJoin(generations, eq(userGenerations.generationId, generations.id))
        .where(
          and(
            eq(userGenerations.userId, dbUser.id),
            isNull(generations.deletedAt),
          ),
        )
        .orderBy(desc(generations.sortOrder));
    } catch (error) {
      if (isMissingUserGenerationsTableError(error)) {
        return [] as Array<{ generationId: string }>;
      }
      throw error;
    }
  })();

  const generationIds = generationRows.map((row) => row.generationId);
  const legacyGenerationId =
    generationIds[0] ??
    (typeof dbUser.generationId === "string" ? dbUser.generationId : null);

  return {
    id: dbUser.id,
    role: normalizeRole(dbUser.role),
    rawRole: dbUser.role ?? "unverified",
    name: dbUser.name,
    familyName: dbUser.familyName,
    givenName: dbUser.givenName,
    email: dbUser.email,
    generationId: legacyGenerationId,
    generationIds,
  };
};
