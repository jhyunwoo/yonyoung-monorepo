import { Context } from "hono";
import { can } from "../authorization/policy";
import { Action, Actor, Resource } from "../authorization/types";
import { unauthorized, forbidden } from "./response";
import HonoAppType from "../../types/honoAppType";
import { AppDependencies } from "../services/dependencies";

/**
 * requireActor의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
 * @param c 요청/실행 컨텍스트 객체입니다.
 * @param dependencies 함수 로직에서 사용하는 입력값입니다.
 * @returns 비동기 처리 결과를 Promise로 반환합니다.
 * @remarks 권한/인증 분기에서 잘못된 흐름이 발생하지 않도록 호출 순서를 유지해야 합니다.
 */
export const requireActor = async (
  c: Context<HonoAppType>,
  dependencies: AppDependencies,
): Promise<{ actor: Actor } | { response: Response }> => {
  const existingActor = c.get("actor");
  const actorResolved = c.get("actorResolved");
  let actor = existingActor;

  if (!actor && !actorResolved) {
    try {
      actor = await dependencies.resolveActor(c);
    } catch {
      actor = null;
    }
    c.set("actorResolved", true);
  }

  if (!actor) {
    return { response: unauthorized(c) };
  }
  c.set("actor", actor);
  return { actor };
};

/**
 * requirePermission의 핵심 비즈니스 로직을 수행합니다.
 * @param c 요청/실행 컨텍스트 객체입니다.
 * @param actor 함수 로직에서 사용하는 입력값입니다.
 * @param resource 응답 데이터 또는 응답 객체입니다.
 * @param action 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 권한/인증 분기에서 잘못된 흐름이 발생하지 않도록 호출 순서를 유지해야 합니다.
 */
export const requirePermission = (
  c: Context<HonoAppType>,
  actor: Actor,
  resource: Resource,
  action: Action,
): Response | null => {
  if (!can(actor.role, resource, action)) {
    return forbidden(c);
  }
  return null;
};
