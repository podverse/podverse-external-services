import { chunkArray } from "podverse-helpers";
import { getWebBaseUrl, getWebBaseUrlWithPath, getWebIconImageUrl } from "@external-services/config/web";
import { firebaseAdmin } from "./firebaseAdmin";

type NotificationPayload = {
  fcmToken: string;
  title: string;
  body?: string;
  image?: string;  // Item/channel artwork for large preview
  link?: string;
  data?: Record<string, string>;
};

export async function sendFirebaseNotificationBatchWeb(tokens: string[], payload: Omit<NotificationPayload, 'fcmToken'>) {
  if (!firebaseAdmin) throw new Error("Firebase Admin is not initialized");

  const chunks = chunkArray(tokens, 500);
  const results: any[] = [];

  for (const chunk of chunks) {
    const data: Record<string, string> = {
      title: payload.title,
      body: payload.body || "",
      icon: getWebIconImageUrl(),  // Always use app icon for branding
      link: payload.link ? getWebBaseUrlWithPath(payload.link) : getWebBaseUrl(),
    };

    // Only add image if it has a value (FCM data values must be strings, not undefined)
    if (payload.image) {
      data.image = payload.image;
    }

    // Spread additional data, filtering out undefined values
    if (payload.data) {
      for (const [key, value] of Object.entries(payload.data)) {
        if (value !== undefined && value !== null) {
          data[key] = String(value);
        }
      }
    }

    const multicastMessage: any = {
      tokens: chunk,
      webpush: {
        headers: { Urgency: "normal" },
        data,
      },
    };

    try {
      const resp = await firebaseAdmin.messaging().sendEachForMulticast(multicastMessage);
      results.push(resp);
    } catch (err) {
      console.error("sendFirebaseNotificationBatchWeb chunk error:", err);
      throw err;
    }
  }

  return results;
}
