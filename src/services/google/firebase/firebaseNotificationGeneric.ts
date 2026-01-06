import { firebaseAdmin } from "./firebaseAdmin";
import { getWebBaseUrl, getWebBaseUrlWithPath, getWebIconImageUrl } from "@external-services/config/web";
import { stringifyData, chunkArray } from "./firebaseHelpers";

type GenericPayload = {
  fcmToken: string;
  title: string;
  body?: string;
  icon?: string;
  image?: string;
  link?: string;
  badge?: number;
  channelId?: string;
  sound?: string;
  data?: Record<string, any>;
};

export async function sendFirebaseNotificationBatchGeneric(tokens: string[], payload: Omit<GenericPayload, 'fcmToken'>) {
  if (!firebaseAdmin) throw new Error("Firebase Admin is not initialized");

  const chunks = chunkArray(tokens, 500);
  const results: any[] = [];

  for (const chunk of chunks) {
    const multicastMessage: any = {
      tokens: chunk,
      webpush: {
        headers: { Urgency: "normal" },
        data: {
          title: payload.title,
          body: payload.body || "",
          icon: payload.icon || getWebIconImageUrl(),
          image: (payload as any).image || undefined,
          link: payload.link ? getWebBaseUrlWithPath(payload.link) : getWebBaseUrl(),
          ...stringifyData(payload.data),
        },
      },
      android: {
        priority: "high",
        notification: {
          title: payload.title,
          body: payload.body,
          channelId: payload.channelId || "default",
          image: payload.image || getWebIconImageUrl(),
        },
      },
      apns: {
        headers: { "apns-priority": "10" },
        payload: {
          aps: {
            alert: { title: payload.title, body: payload.body },
            badge: payload.badge,
            sound: payload.sound || "default",
            "mutable-content": 1,
          },
          ...(payload.data || {}),
          image: payload.image || getWebIconImageUrl(),
        },
      },
      data: stringifyData(payload.data),
    };

    try {
      const resp = await firebaseAdmin.messaging().sendEachForMulticast(multicastMessage);
      results.push(resp);
    } catch (err) {
      console.error("sendFirebaseNotificationBatchGeneric chunk error:", err);
      throw err;
    }
  }

  return results;
}
