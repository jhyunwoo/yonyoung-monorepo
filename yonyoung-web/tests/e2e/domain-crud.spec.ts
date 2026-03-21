import { expect, test } from "@playwright/test";

import { setMockSession } from "./support/session";
import { expectCollectionDelta, getMockState, resetMockState } from "./support/state-assert";

const MOCK_API_BASE_URL = "http://127.0.0.1:4010";

const makeNamespace = (
  projectName: string,
  parallelIndex: number,
  key: string,
): string => `${projectName}-w${parallelIndex}-${key}`;

test.describe("domain CRUD journeys", () => {
  test("market detail actions and edit update mock state", async ({
    page,
    context,
    request,
  }, testInfo) => {
    const namespace = makeNamespace(testInfo.project.name, testInfo.parallelIndex, "market");
    await resetMockState(request, namespace);
    await setMockSession(context, { role: "member", namespace });

    const before = await getMockState(request, namespace);

    const createResponse = await request.post(`${MOCK_API_BASE_URL}/api/market/items`, {
      headers: {
        "x-mock-worker": namespace,
        "x-mock-role": "member",
      },
      data: {
        name: "E2E 판매글 카메라",
        imageUrls: ["https://images.mock.local/market/e2e-market.jpg"],
        manufacturer: "Nikon",
        productCode: "FM2",
        description: "테스트 설명",
        price: 222000,
      },
    });
    expect(createResponse.ok()).toBe(true);

    const createdState = await getMockState(request, namespace);
    expectCollectionDelta({
      before: before.marketItems,
      after: createdState.marketItems,
      delta: 1,
    });

    const createdItem = createdState.marketItems.find((item) => item.name === "E2E 판매글 카메라");
    expect(createdItem).toBeDefined();

    await page.goto(`/dashboard/market/${createdItem!.id}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "E2E 판매글 카메라" })).toBeVisible();

    await page.getByPlaceholder("댓글 작성").fill("E2E 댓글");
    await page.getByTestId("market-comment-submit").click();

    const afterCommentLength = createdState.comments.length + 1;
    await expect
      .poll(
        async () => {
          const state = await getMockState(request, namespace);
          return state.comments.length;
        },
        {
          timeout: 10_000,
        },
      )
      .toBe(afterCommentLength);

    const afterComment = await getMockState(request, namespace);
    expectCollectionDelta({
      before: createdState.comments,
      after: afterComment.comments,
      delta: 1,
    });

    await page.getByTestId("market-status-reserved").click();
    await expect(page.getByText("예약중").first()).toBeVisible();

    await page.getByTestId("market-edit-link").click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/market/${createdItem!.id}/edit`));

    await page.getByPlaceholder("판매물건 이름").fill("E2E 판매글 수정됨");
    await page.getByTestId("market-edit-submit").click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/market/${createdItem!.id}$`));

    const finalState = await getMockState(request, namespace);
    const finalItem = finalState.marketItems.find((item) => item.id === createdItem!.id);
    expect(finalItem?.name).toBe("E2E 판매글 수정됨");
    expect(finalItem?.status).toBe("reserved");
  });

  test("linktree create and delete mutate state", async ({ page, context, request }, testInfo) => {
    const namespace = makeNamespace(testInfo.project.name, testInfo.parallelIndex, "linktree");
    await resetMockState(request, namespace);
    await setMockSession(context, { role: "president", namespace });

    const before = await getMockState(request, namespace);

    const createGroupResponse = await request.post(`${MOCK_API_BASE_URL}/api/linktree`, {
      headers: {
        "x-mock-worker": namespace,
        "x-mock-role": "president",
      },
      data: {
        name: "E2E 링크모음",
      },
    });
    expect(createGroupResponse.ok()).toBe(true);
    const createGroupJson = (await createGroupResponse.json()) as { data: { id: string } };
    const createdLinktreeId = createGroupJson.data.id;

    const createItemResponse = await request.post(
      `${MOCK_API_BASE_URL}/api/linktree/${encodeURIComponent(createdLinktreeId)}/items`,
      {
        headers: {
          "x-mock-worker": namespace,
          "x-mock-role": "president",
        },
        data: {
          name: "E2E 링크",
          link: "https://example.com/e2e",
        },
      },
    );
    expect(createItemResponse.ok()).toBe(true);

    const createdLength = before.linktrees.length + 1;
    await expect
      .poll(
        async () => {
          const state = await getMockState(request, namespace);
          return state.linktrees.length;
        },
        {
          timeout: 10_000,
        },
      )
      .toBe(createdLength);

    const created = await getMockState(request, namespace);
    expectCollectionDelta({ before: before.linktrees, after: created.linktrees, delta: 1 });

    const newLinktree = created.linktrees.find((item) => item.name === "E2E 링크모음");
    expect(newLinktree).toBeDefined();
    await page.goto(`/dashboard/settings/linktree/${newLinktree!.id}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(new RegExp(`/dashboard/settings/linktree/${newLinktree!.id}$`));

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("linktree-group-delete").click();
    await expect(page).toHaveURL(/\/dashboard\/settings\/linktree$/);

    const deletedLength = created.linktrees.length - 1;
    await expect
      .poll(
        async () => {
          const state = await getMockState(request, namespace);
          return state.linktrees.length;
        },
        {
          timeout: 10_000,
        },
      )
      .toBe(deletedLength);

    const afterDelete = await getMockState(request, namespace);
    expectCollectionDelta({ before: created.linktrees, after: afterDelete.linktrees, delta: -1 });
  });

  test("global notice create and detail view mutate state", async ({
    page,
    context,
    request,
  }, testInfo) => {
    const namespace = makeNamespace(testInfo.project.name, testInfo.parallelIndex, "notice");
    await resetMockState(request, namespace);
    await setMockSession(context, { role: "president", namespace });

    const before = await getMockState(request, namespace);

    await page.goto("/dashboard/settings/notices/new", { waitUntil: "domcontentloaded" });
    const titleInput = page.getByPlaceholder("공지 제목").first();
    await titleInput.fill("E2E 전체 공지");
    await expect(titleInput).toHaveValue("E2E 전체 공지");

    const editor = page.locator("[contenteditable='true']").first();
    await editor.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("E2E 본문");
    await expect(editor).toContainText("E2E 본문");
    await page.waitForTimeout(150);

    await page.getByTestId("notice-create-submit").click();
    const validationError = page.getByText("제목과 본문을 모두 입력해 주세요.");
    if (await validationError.isVisible().catch(() => false)) {
      await titleInput.fill("E2E 전체 공지");
      await expect(titleInput).toHaveValue("E2E 전체 공지");
      await editor.click();
      await page.keyboard.press("Control+A");
      await page.keyboard.type("E2E 본문");
      await page.keyboard.type(" 보강");
      await expect(editor).toContainText("보강");
      await page.waitForTimeout(150);
      await page.getByTestId("notice-create-submit").click();
    }
    await expect(page).toHaveURL(/\/dashboard\/settings\/notices\/notice-/, { timeout: 10_000 });

    const createdLength = before.notices.global.length + 1;
    await expect
      .poll(
        async () => {
          const state = await getMockState(request, namespace);
          return state.notices.global.length;
        },
        {
          timeout: 10_000,
        },
      )
      .toBe(createdLength);

    const created = await getMockState(request, namespace);
    expectCollectionDelta({
      before: before.notices.global,
      after: created.notices.global,
      delta: 1,
    });

    const newNotice = created.notices.global.find((item) => item.title === "E2E 전체 공지");
    expect(newNotice).toBeDefined();

    await page.goto(`/dashboard/settings/notices/${newNotice!.id}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByText("E2E 전체 공지")).toBeVisible();
  });

  test("site settings save updates mock state", async ({ page, context, request }, testInfo) => {
    const namespace = makeNamespace(testInfo.project.name, testInfo.parallelIndex, "site");
    await resetMockState(request, namespace);
    await setMockSession(context, { role: "president", namespace });

    await page.goto("/dashboard/settings/site", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("site-settings-submit")).toBeVisible();

    const phoneInput = page.getByPlaceholder("010-0000-0000");
    await phoneInput.fill("010-9999-9999");

    await page.getByTestId("site-settings-submit").click();
    await expect(page.getByText("기본 설정을 저장했습니다.")).toBeVisible();

    const state = await getMockState(request, namespace);
    expect(state.siteSettings.footerPhone).toBe("010-9999-9999");
  });
});
