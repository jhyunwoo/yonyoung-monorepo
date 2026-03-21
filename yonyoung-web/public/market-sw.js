const DEFAULT_TITLE = "연영장터 새 댓글";
const DEFAULT_BODY = "내 판매글에 새 댓글이 등록되었습니다.";
const DEFAULT_URL = "/dashboard/market";

const readPushPayload = (event) => {
  if (!event.data) {
    return {};
  }

  try {
    const payload = event.data.json();
    return typeof payload === "object" && payload !== null ? payload : {};
  } catch {
    return {};
  }
};

const resolveNavigationUrl = (rawUrl) => {
  const nextUrl =
    typeof rawUrl === "string" && rawUrl.trim().length > 0 ? rawUrl : DEFAULT_URL;

  try {
    return new URL(nextUrl, self.location?.origin ?? "https://example.com").toString();
  } catch {
    return new URL(
      DEFAULT_URL,
      self.location?.origin ?? "https://example.com",
    ).toString();
  }
};

self.addEventListener("push", (event) => {
  const payload = readPushPayload(event);
  const title =
    typeof payload.title === "string" && payload.title.trim()
      ? payload.title
      : DEFAULT_TITLE;
  const body =
    typeof payload.body === "string" && payload.body.trim() ? payload.body : DEFAULT_BODY;
  const url = resolveNavigationUrl(payload.url);

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/android-chrome-192x192.png",
      badge: "/favicon-32x32.png",
      tag: "market-comment",
      data: {
        url,
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = resolveNavigationUrl(event.notification?.data?.url);

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clients) {
        const clientUrl = typeof client.url === "string" ? client.url : "";
        const isMarketClient = clientUrl.includes("/dashboard/market");
        if (!isMarketClient) {
          continue;
        }

        if (typeof client.navigate === "function" && clientUrl !== targetUrl) {
          await client.navigate(targetUrl);
        }

        if (typeof client.focus === "function") {
          await client.focus();
        }
        return;
      }

      await self.clients.openWindow(targetUrl);
    })(),
  );
});
