import { sendFirebaseNotificationBatchWeb } from './firebaseNotificationWeb';
import { sendFirebaseNotificationBatchAndroid } from './firebaseNotificationAndroid';
import { sendFirebaseNotificationBatchIOS } from './firebaseNotificationIOS';
import { sendFirebaseNotificationBatchGeneric } from './firebaseNotificationGeneric';

type NotificationPlatform = 'web' | 'android' | 'ios';

type OrchestratorParams = {
  tokens: string[];
  finalText: string;
  platform: NotificationPlatform;
  // spread of any platform-specific options
  icon?: string;
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
        body: '',
        icon: params.icon,
        link: params.link,
        data: params.data,
      };
      console.log(`Sending web notification with payload: ${JSON.stringify(payload)}`);
      return await sendFirebaseNotificationBatchWeb(tokens, payload);
    }

    case 'android': {
      const payload = {
        title: finalText,
        body: '',
        channelId: params.channelId,
        data: params.data,
      };
      return await sendFirebaseNotificationBatchAndroid(tokens, payload);
    }

    case 'ios': {
      const payload = {
        title: finalText,
        body: '',
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
