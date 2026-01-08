import { stringifyData, chunkArray } from "podverse-helpers";
import { getWebIconImageUrl } from "@external-services/config/web";
import { firebaseAdmin } from "./firebaseAdmin";

type IOSPayload = {
  fcmToken: string;
  title: string;
  body?: string;
  badge?: number;
  sound?: string;
  image?: string;
  data?: Record<string, any>;
};

export async function sendFirebaseNotificationBatchIOS(tokens: string[], payload: Omit<IOSPayload, 'fcmToken'>) {
  if (!firebaseAdmin) throw new Error("Firebase Admin is not initialized");

  const chunks = chunkArray(tokens, 500);
  const results: any[] = [];

  for (const chunk of chunks) {
    const multicastMessage: any = {
      tokens: chunk,
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
      const resp = await firebaseAdmin.messaging().sendEachForMulticast(multicastMessage as any);
      results.push(resp);
    } catch (err) {
      console.error("sendFirebaseNotificationBatchIOS chunk error:", err);
      throw err;
    }
  }

  return results;
}
