import type { ApiExhibition } from "@/shared/contracts/api-contracts";

/**
 * 홈 히어로에 노출할 전시를 선택한다.
 * 1) 진행중/예정 전시가 있으면 시작일이 가장 이른 전시
 * 2) 없으면 가장 최근에 종료된 전시
 */
export const pickFeaturedPublicExhibition = (
  exhibitions: ApiExhibition[],
  now: number = Date.now(),
): ApiExhibition | null => {
  let upcomingOrOngoing: ApiExhibition | null = null;

  for (const exhibition of exhibitions) {
    if (exhibition.endDate < now) {
      continue;
    }

    if (
      upcomingOrOngoing === null ||
      exhibition.startDate < upcomingOrOngoing.startDate ||
      (exhibition.startDate === upcomingOrOngoing.startDate &&
        exhibition.endDate < upcomingOrOngoing.endDate)
    ) {
      upcomingOrOngoing = exhibition;
    }
  }

  if (upcomingOrOngoing) {
    return upcomingOrOngoing;
  }

  let mostRecentPast: ApiExhibition | null = null;

  for (const exhibition of exhibitions) {
    if (exhibition.endDate >= now) {
      continue;
    }

    if (
      mostRecentPast === null ||
      exhibition.endDate > mostRecentPast.endDate ||
      (exhibition.endDate === mostRecentPast.endDate &&
        exhibition.startDate > mostRecentPast.startDate)
    ) {
      mostRecentPast = exhibition;
    }
  }

  return mostRecentPast;
};
