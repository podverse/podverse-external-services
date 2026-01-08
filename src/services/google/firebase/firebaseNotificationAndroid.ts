import { stringifyData, chunkArray } from "podverse-helpers";
import { getWebIconImageUrl } from "@external-services/config/web";
import { firebaseAdmin } from "./firebaseAdmin";

type AndroidPayload = {
  fcmToken: string;
  title: string;
  body?: string;
  channelId?: string;
  image?: string;
  data?: Record<string, any>;
};

export async function sendFirebaseNotificationBatchAndroid(tokens: string[], payload: Omit<AndroidPayload, 'fcmToken'>) {
  if (!firebaseAdmin) throw new Error("Firebase Admin is not initialized");

  const chunks = chunkArray(tokens, 500);
  const results: any[] = [];

  for (const chunk of chunks) {
    const multicastMessage: any = {
      tokens: chunk,
      android: {
        priority: "high",
        notification: {
          title: payload.title,
          body: payload.body,
          channelId: payload.channelId || "default",
          image: payload.image || getWebIconImageUrl(),
        },
      },
      data: stringifyData(payload.data),
    };

    try {
      const resp = await firebaseAdmin.messaging().sendEachForMulticast(multicastMessage);
      results.push(resp);
    } catch (err) {
      console.error("sendFirebaseNotificationBatchAndroid chunk error:", err);
      throw err;
    }
  }

  return results;
}
