import webpush from "web-push";
import type { AppBindings } from "../../types/honoAppType";
import type { MarketPushSubscriptionEntity } from "../services/types";

type MarketPushPayload = {
  title: string;
  body: string;
  url: string;
};

const resolveVapidConfig = (env: AppBindings): {
  publicKey: string;
  privateKey: string;
  subject: string;
} | null => {
  const publicKey = env.VAPID_PUBLIC_KEY?.trim() ?? "";
  const privateKey = env.VAPID_PRIVATE_KEY?.trim() ?? "";
  const subject = env.VAPID_SUBJECT?.trim() ?? "";

  if (!publicKey || !privateKey || !subject) {
    return null;
  }

  return {
    publicKey,
    privateKey,
    subject,
  };
};

const toExpiredEndpoint = (error: unknown): { endpoint: string } | null => {
  if (!(error instanceof Error)) {
    return null;
  }

  const statusCodeRaw = (error as { statusCode?: unknown }).statusCode;
  const endpointRaw = (error as { endpoint?: unknown }).endpoint;
  const statusCode = typeof statusCodeRaw === "number" ? statusCodeRaw : null;
  const endpoint = typeof endpointRaw === "string" ? endpointRaw : "";

  if ((statusCode === 404 || statusCode === 410) && endpoint) {
    return { endpoint };
  }

  return null;
};

export const sendMarketPushNotifications = async (input: {
  env: AppBindings;
  subscriptions: MarketPushSubscriptionEntity[];
  payload: MarketPushPayload;
}): Promise<{ expiredEndpoints: string[] }> => {
  if (input.subscriptions.length === 0) {
    return { expiredEndpoints: [] };
  }

  const vapid = resolveVapidConfig(input.env);
  if (!vapid) {
    return { expiredEndpoints: [] };
  }

  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  const expiredEndpoints = new Set<string>();
  const body = JSON.stringify(input.payload);

  await Promise.all(
    input.subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          body,
          {
            TTL: 60,
            urgency: "normal",
          },
        );
      } catch (error) {
        const expired = toExpiredEndpoint(error);
        if (expired) {
          expiredEndpoints.add(expired.endpoint);
        }
      }
    }),
  );

  return { expiredEndpoints: Array.from(expiredEndpoints) };
};
