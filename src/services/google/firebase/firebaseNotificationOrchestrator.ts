import { sendFirebaseNotificationBatchWeb } from './firebaseNotificationWeb';
import { sendFirebaseNotificationBatchAndroid } from './firebaseNotificationAndroid';
import { sendFirebaseNotificationBatchIOS } from './firebaseNotificationIOS';

type NotificationPlatform = 'web' | 'android' | 'ios';

type OrchestratorParams = {
  tokens: string[];
  finalText: string;
  platform: NotificationPlatform;
  // spread of any platform-specific options
  body?: string;  // Secondary text (e.g., channel title)
  image?: string;  // Item/channel artwork for large preview
  link?: string;
  channelId?: string;
  badge?: number;
  sound?: string;
  data?: Record<string, any>;
};

export async function firebaseNotificationBatchOrchestrator(params: OrchestratorParams) {
  const { tokens, finalText, platform } = params;
  
  switch (platform) {
    case 'web': {
      const payload = {
        title: finalText,
        body: params.body,
        image: params.image,
        link: params.link,
        data: params.data,
      };
      return await sendFirebaseNotificationBatchWeb(tokens, payload);
    }

    case 'android': {
      const payload = {
        title: finalText,
        body: params.body,
        image: params.image,
        channelId: params.channelId,
        data: params.data,
      };
      return await sendFirebaseNotificationBatchAndroid(tokens, payload);
    }

    case 'ios': {
      const payload = {
        title: finalText,
        body: params.body,
        image: params.image,
        badge: params.badge,
        sound: params.sound,
        data: params.data,
      };
      return await sendFirebaseNotificationBatchIOS(tokens, payload);
    }

    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
