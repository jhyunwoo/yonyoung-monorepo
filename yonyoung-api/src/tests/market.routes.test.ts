import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  IDs,
  createActor,
  createDataServiceMock,
  createTestApp,
  expectErrorCode,
  fn,
  readJson,
} from "./test-helpers";
import type { MarketCommentEntity, MarketItemEntity } from "../lib/services/types";

const { sendMarketPushNotificationsMock } = vi.hoisted(() => ({
  sendMarketPushNotificationsMock: vi.fn(),
}));

vi.mock("../lib/notifications/market-push", () => ({
  sendMarketPushNotifications: (...args: unknown[]) =>
    sendMarketPushNotificationsMock(...args),
}));

const MARKET_ITEM_ID = "88000000-0000-4000-8000-000000000001";
const MARKET_COMMENT_ID = "99000000-0000-4000-8000-000000000001";

const createMarketItem = (
  overrides: Partial<MarketItemEntity> = {},
): MarketItemEntity => ({
  id: MARKET_ITEM_ID,
  sellerId: IDs.member,
  name: "Sony FE 24-70mm F2.8 GM II",
  imageUrls: ["https://cdn.example.com/market/item-1.jpg"],
  manufacturer: "Sony",
  productCode: "SEL2470GM2",
  conditionGrade: "A",
  description: "실사용 3개월",
  price: 2200000,
  status: "selling",
  seller: {
    id: IDs.member,
    name: "member-name",
    familyName: null,
    givenName: null,
    image: null,
    role: "regular_member",
  },
  createdAt: new Date("2030-01-01T00:00:00.000Z"),
  updatedAt: new Date("2030-01-01T00:00:00.000Z"),
  updatedBy: null,
  ...overrides,
});

const createMarketComment = (
  overrides: Partial<MarketCommentEntity> = {},
): MarketCommentEntity => ({
  id: MARKET_COMMENT_ID,
  itemId: MARKET_ITEM_ID,
  author: {
    id: IDs.otherUser,
    name: "commenter-name",
    familyName: null,
    givenName: null,
    image: null,
    role: "regular_member",
  },
  content: "거래 가능할까요?",
  createdAt: new Date("2030-01-01T00:00:00.000Z"),
  updatedAt: new Date("2030-01-01T00:00:00.000Z"),
  updatedBy: null,
  ...overrides,
});

describe("market routes", () => {
  beforeEach(() => {
    sendMarketPushNotificationsMock.mockReset();
    sendMarketPushNotificationsMock.mockResolvedValue({ expiredEndpoints: [] });
  });

  it("unverified는 장터 목록 조회가 불가하다", async () => {
    const app = createTestApp({
      actor: createActor("unverified", IDs.member),
    });

    const response = await app.request("/api/market/items");
    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
  });

  it("판매글 생성은 이미지/가격 유효성 검사를 적용한다", async () => {
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
    });

    const invalidBodies = [
      {
        name: "렌즈",
        imageUrls: [],
        price: 1000,
      },
      {
        name: "렌즈",
        imageUrls: Array.from(
          { length: 11 },
          (_, index) => `https://cdn.example.com/market/image-${index}.jpg`,
        ),
        price: 1000,
      },
      {
        name: "렌즈",
        imageUrls: ["https://cdn.example.com/market/one.jpg"],
        price: -1,
      },
      {
        name: "렌즈",
        imageUrls: ["https://cdn.example.com/market/one.jpg"],
        price: 1234.5,
      },
    ];

    for (const payload of invalidBodies) {
      const response = await app.request("/api/market/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      expect(response.status).toBe(400);
      await expectErrorCode(response, "BAD_REQUEST");
    }
  });

  it("regular_member는 판매글을 생성할 수 있다", async () => {
    const createMarketItemMock = fn(async () => createMarketItem());
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({
        createMarketItem: createMarketItemMock,
      }),
    });

    const response = await app.request("/api/market/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Sony FE 24-70mm F2.8 GM II",
        imageUrls: ["https://cdn.example.com/market/item-1.jpg"],
        manufacturer: "Sony",
        productCode: "SEL2470GM2",
        conditionGrade: "A",
        description: "실사용 3개월",
        price: 2200000,
      }),
    });

    expect(response.status).toBe(201);
    const body = await readJson<{
      data: {
        id: string;
        sellerId: string;
        seller: { familyName: string | null; givenName: string | null };
      };
    }>(response);
    expect(body.data.id).toBe(MARKET_ITEM_ID);
    expect(body.data.sellerId).toBe(IDs.member);
    expect(body.data.seller.familyName).toBeNull();
    expect(body.data.seller.givenName).toBeNull();
    expect(createMarketItemMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sellerId: IDs.member,
        price: 2200000,
      }),
    );
  });

  it("판매글 생성 시 설명 리치텍스트를 sanitize해서 저장한다", async () => {
    const createMarketItemMock = fn(async () => createMarketItem());
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({
        createMarketItem: createMarketItemMock,
      }),
    });

    const response = await app.request("/api/market/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Nikon FM2",
        imageUrls: ["https://cdn.example.com/market/item-2.jpg"],
        description: '<script>alert("xss")</script><p>상태 <strong>양호</strong></p>',
        price: 450000,
      }),
    });

    expect(response.status).toBe(201);
    expect(createMarketItemMock).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "<p>상태 <strong>양호</strong></p>",
      }),
    );
  });

  it("판매글 수정 시 비어 있는 리치텍스트 설명을 null로 정규화한다", async () => {
    const updateMarketItemMock = fn(async () => createMarketItem({ description: null }));
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({
        getMarketItemById: fn(async () => createMarketItem({ sellerId: IDs.member })),
        updateMarketItem: updateMarketItemMock,
      }),
    });

    const response = await app.request(`/api/market/items/${MARKET_ITEM_ID}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        description: "<p><br></p>",
      }),
    });

    expect(response.status).toBe(200);
    expect(updateMarketItemMock).toHaveBeenCalledWith(MARKET_ITEM_ID, {
      description: null,
    });
  });

  it("작성자가 아닌 regular_member는 판매 상태를 변경할 수 없다", async () => {
    const updateMarketItemStatus = fn(async () => createMarketItem({ status: "reserved" }));
    const app = createTestApp({
      actor: createActor("regular_member", IDs.otherUser),
      dataService: createDataServiceMock({
        getMarketItemById: fn(async () => createMarketItem({ sellerId: IDs.member })),
        updateMarketItemStatus,
      }),
    });

    const response = await app.request(`/api/market/items/${MARKET_ITEM_ID}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "reserved" }),
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(updateMarketItemStatus).not.toHaveBeenCalled();
  });

  it("manager는 타인 판매글의 판매 상태를 변경할 수 있다", async () => {
    const updateMarketItemStatus = fn(async () =>
      createMarketItem({ sellerId: IDs.member, status: "reserved" }),
    );
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({
        getMarketItemById: fn(async () => createMarketItem({ sellerId: IDs.member })),
        updateMarketItemStatus,
      }),
    });

    const response = await app.request(`/api/market/items/${MARKET_ITEM_ID}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "reserved" }),
    });

    expect(response.status).toBe(200);
    const body = await readJson<{ data: { status: string } }>(response);
    expect(body.data.status).toBe("reserved");
    expect(updateMarketItemStatus).toHaveBeenCalledWith(MARKET_ITEM_ID, "reserved");
  });

  it("댓글 생성 시 판매자에게만 웹푸시를 전송하고 만료 구독을 정리한다", async () => {
    sendMarketPushNotificationsMock.mockResolvedValue({
      expiredEndpoints: ["https://push.example.com/expired"],
    });
    const listMarketPushSubscriptionsByUserId = fn(async () => [
      {
        id: "subscription-1",
        userId: IDs.member,
        endpoint: "https://push.example.com/expired",
        p256dh: "key",
        auth: "auth",
        createdAt: new Date("2030-01-01T00:00:00.000Z"),
        updatedAt: new Date("2030-01-01T00:00:00.000Z"),
      },
    ]);
    const deleteMarketPushSubscription = fn(async () => true);

    const app = createTestApp({
      actor: createActor("regular_member", IDs.otherUser),
      dataService: createDataServiceMock({
        getMarketItemById: fn(async () => createMarketItem({ sellerId: IDs.member })),
        createMarketComment: fn(async () =>
          createMarketComment({
            author: {
              id: IDs.otherUser,
              name: "other-user",
              familyName: null,
              givenName: null,
              image: null,
              role: "regular_member",
            },
          }),
        ),
        listMarketPushSubscriptionsByUserId,
        deleteMarketPushSubscription,
      }),
    });

    const response = await app.request(`/api/market/items/${MARKET_ITEM_ID}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "채팅 확인 부탁드립니다." }),
    });

    expect(response.status).toBe(201);
    expect(listMarketPushSubscriptionsByUserId).toHaveBeenCalledWith(IDs.member);
    expect(sendMarketPushNotificationsMock).toHaveBeenCalledTimes(1);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(deleteMarketPushSubscription).toHaveBeenCalledWith({
      userId: IDs.member,
      endpoint: "https://push.example.com/expired",
    });
  });

  it("내 판매글에 내가 댓글을 달면 푸시를 보내지 않는다", async () => {
    const listMarketPushSubscriptionsByUserId = fn(async () => []);
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({
        getMarketItemById: fn(async () => createMarketItem({ sellerId: IDs.member })),
        createMarketComment: fn(async () =>
          createMarketComment({
            author: {
              id: IDs.member,
              name: "seller-user",
              familyName: null,
              givenName: null,
              image: null,
              role: "regular_member",
            },
          }),
        ),
        listMarketPushSubscriptionsByUserId,
      }),
    });

    const response = await app.request(`/api/market/items/${MARKET_ITEM_ID}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "셀프 댓글" }),
    });

    expect(response.status).toBe(201);
    expect(listMarketPushSubscriptionsByUserId).not.toHaveBeenCalled();
    expect(sendMarketPushNotificationsMock).not.toHaveBeenCalled();
  });

  it("웹푸시 구독 등록/해제는 actor id 기준으로 처리된다", async () => {
    const upsertMarketPushSubscription = fn(async () => ({
      id: "subscription-1",
      userId: IDs.otherUser,
      endpoint: "https://push.example.com/subscription",
      p256dh: "key",
      auth: "auth",
      createdAt: new Date("2030-01-01T00:00:00.000Z"),
      updatedAt: new Date("2030-01-01T00:00:00.000Z"),
    }));
    const deleteMarketPushSubscription = fn(async () => true);
    const app = createTestApp({
      actor: createActor("regular_member", IDs.otherUser),
      dataService: createDataServiceMock({
        upsertMarketPushSubscription,
        deleteMarketPushSubscription,
      }),
    });

    const registerResponse = await app.request("/api/market/push-subscriptions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        endpoint: "https://push.example.com/subscription",
        p256dh: "key",
        auth: "auth",
      }),
    });
    expect(registerResponse.status).toBe(204);
    expect(upsertMarketPushSubscription).toHaveBeenCalledWith({
      userId: IDs.otherUser,
      endpoint: "https://push.example.com/subscription",
      p256dh: "key",
      auth: "auth",
    });

    const unregisterResponse = await app.request("/api/market/push-subscriptions", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        endpoint: "https://push.example.com/subscription",
        p256dh: "key",
        auth: "auth",
      }),
    });
    expect(unregisterResponse.status).toBe(204);
    expect(deleteMarketPushSubscription).toHaveBeenCalledWith({
      userId: IDs.otherUser,
      endpoint: "https://push.example.com/subscription",
    });
  });

  it("감사로그 저장이 실패해도 판매글 생성 응답은 성공한다", async () => {
    const createAuditLog = fn(async () => {
      throw new Error("audit storage unavailable");
    });
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({
        createMarketItem: fn(async () => createMarketItem()),
        createAuditLog,
      }),
    });

    const response = await app.request("/api/market/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Canon RF 50mm F1.8",
        imageUrls: ["https://cdn.example.com/market/item-2.jpg"],
        price: 180000,
      }),
    });

    expect(response.status).toBe(201);
    expect(createAuditLog).toHaveBeenCalledTimes(1);
  });

  it("푸시 전송이 실패해도 댓글 생성 응답은 성공한다", async () => {
    sendMarketPushNotificationsMock.mockRejectedValueOnce(new Error("push gateway down"));

    const listMarketPushSubscriptionsByUserId = fn(async () => [
      {
        id: "subscription-1",
        userId: IDs.member,
        endpoint: "https://push.example.com/subscription-1",
        p256dh: "key-1",
        auth: "auth-1",
        createdAt: new Date("2030-01-01T00:00:00.000Z"),
        updatedAt: new Date("2030-01-01T00:00:00.000Z"),
      },
    ]);
    const deleteMarketPushSubscription = fn(async () => true);

    const app = createTestApp({
      actor: createActor("regular_member", IDs.otherUser),
      dataService: createDataServiceMock({
        getMarketItemById: fn(async () => createMarketItem({ sellerId: IDs.member })),
        createMarketComment: fn(async () => createMarketComment()),
        listMarketPushSubscriptionsByUserId,
        deleteMarketPushSubscription,
      }),
    });

    const response = await app.request(`/api/market/items/${MARKET_ITEM_ID}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "푸시 실패 격리 테스트" }),
    });

    expect(response.status).toBe(201);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(sendMarketPushNotificationsMock).toHaveBeenCalledTimes(1);
    expect(deleteMarketPushSubscription).not.toHaveBeenCalled();
  });

  it("만료 구독 정리 실패가 발생해도 댓글 생성 응답은 성공한다", async () => {
    sendMarketPushNotificationsMock.mockResolvedValueOnce({
      expiredEndpoints: ["https://push.example.com/expired-1"],
    });
    const deleteMarketPushSubscription = fn(async () => {
      throw new Error("cleanup failed");
    });

    const app = createTestApp({
      actor: createActor("regular_member", IDs.otherUser),
      dataService: createDataServiceMock({
        getMarketItemById: fn(async () => createMarketItem({ sellerId: IDs.member })),
        createMarketComment: fn(async () => createMarketComment()),
        listMarketPushSubscriptionsByUserId: fn(async () => [
          {
            id: "subscription-1",
            userId: IDs.member,
            endpoint: "https://push.example.com/expired-1",
            p256dh: "key-1",
            auth: "auth-1",
            createdAt: new Date("2030-01-01T00:00:00.000Z"),
            updatedAt: new Date("2030-01-01T00:00:00.000Z"),
          },
        ]),
        deleteMarketPushSubscription,
      }),
    });

    const response = await app.request(`/api/market/items/${MARKET_ITEM_ID}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "cleanup failure isolation" }),
    });

    expect(response.status).toBe(201);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(deleteMarketPushSubscription).toHaveBeenCalledWith({
      userId: IDs.member,
      endpoint: "https://push.example.com/expired-1",
    });
  });
});
