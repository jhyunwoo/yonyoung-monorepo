import type { Actor } from "./authorization/types";
import type { AuditAction, AuditResourceType, DataService } from "./services/types";

const toAuditActor = (actor: Actor) => ({
  id: actor.id,
  name: actor.name,
  familyName: actor.familyName,
  givenName: actor.givenName,
  role: actor.rawRole ?? actor.role ?? null,
});

export const withUpdatedByActor = <T extends { updatedBy: unknown }>(
  entity: T,
  actor: Actor,
): T => {
  return {
    ...entity,
    updatedBy: toAuditActor(actor),
  };
};

export const readChangedFields = (
  input: Record<string, unknown>,
  fallback: string[],
): string[] => {
  const fields = Object.keys(input).filter((field) => field.trim().length > 0);
  if (fields.length > 0) {
    return fields.sort();
  }

  return fallback;
};

export const recordAuditLog = async (input: {
  dataService: DataService;
  actor: Actor;
  resourceType: AuditResourceType;
  resourceId: string;
  action: AuditAction;
  changedFields: string[];
}): Promise<void> => {
  await input.dataService.createAuditLog({
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    action: input.action,
    actorId: input.actor.id,
    actorName: input.actor.name,
    actorRole: input.actor.rawRole ?? input.actor.role ?? null,
    changedFields: input.changedFields,
  });
};
