import { resolveApiBaseUrl } from "@/shared/http/http";
import { cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/server/cache/tags";
import type { ApiGeneration, DataEnvelope } from "@/shared/contracts/api-contracts";

const PUBLIC_GENERATIONS_PATH = "/api/public/generations";

const isGeneration = (value: unknown): value is ApiGeneration => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.sortOrder === "number"
  );
};

const parseGenerationList = (payload: unknown): ApiGeneration[] => {
  if (Array.isArray(payload)) {
    return payload.filter(isGeneration);
  }

  if (
    typeof payload === "object" &&
    payload !== null &&
    "data" in payload &&
    Array.isArray((payload as DataEnvelope<unknown>).data)
  ) {
    return ((payload as DataEnvelope<unknown[]>).data ?? []).filter(isGeneration);
  }

  return [];
};

export const fetchGenerationsFromServer = async (): Promise<ApiGeneration[]> => {
  "use cache";

  cacheTag(CACHE_TAGS.admin.generations);

  try {
    const response = await fetch(`${resolveApiBaseUrl()}${PUBLIC_GENERATIONS_PATH}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json().catch(() => null)) as unknown;
    const result = parseGenerationList(payload);
    return result;
  } catch {
    return [];
  }
};
