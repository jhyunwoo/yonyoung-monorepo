import { expect, type APIRequestContext } from "@playwright/test";
import type { MockState } from "../mock-api/contracts";

const MOCK_API_BASE_URL = "http://127.0.0.1:4010";

export const resetMockState = async (
  request: APIRequestContext,
  namespace: string,
): Promise<void> => {
  const response = await request.post(`${MOCK_API_BASE_URL}/__test/reset`, {
    params: { namespace },
    headers: {
      "x-mock-worker": namespace,
    },
  });
  expect(response.ok()).toBe(true);
};

export const getMockState = async (
  request: APIRequestContext,
  namespace: string,
): Promise<MockState> => {
  const response = await request.get(`${MOCK_API_BASE_URL}/__test/state`, {
    params: { namespace },
    headers: {
      "x-mock-worker": namespace,
    },
  });

  expect(response.ok()).toBe(true);
  const json = (await response.json()) as { data: MockState };
  return json.data;
};

export const expectCollectionDelta = <T>(input: {
  before: T[];
  after: T[];
  delta: number;
}): void => {
  expect(input.after.length - input.before.length).toBe(input.delta);
};
