import type { CoreRole } from "../../shared/auth/roles";

export type Role = CoreRole;

export type Resource =
  | "generation"
  | "activity"
  | "notice"
  | "market"
  | "exhibition"
  | "linktree"
  | "user";

export type Action = "create" | "read" | "update" | "delete";

export type Actor = {
  id: string;
  role: Role;
  rawRole: string;
  name: string;
  familyName: string | null;
  givenName: string | null;
  email: string;
  generationId: string | null;
  generationIds?: string[];
};
