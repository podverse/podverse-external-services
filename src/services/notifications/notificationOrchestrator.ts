import { firebaseNotificationBatchOrchestrator } from '../google/firebase/firebaseNotificationOrchestrator';
import { i18nNotifications, NotificationMessageType } from './i18nNotifications';

export type NotificationPlatform = 'web' | 'android' | 'ios' | 'generic';
export type NotificationService = 'firebase';

/**
 * Gets the URL path prefix for a given notification message type
 */
function getLinkPathFromMessageType(messageType: NotificationMessageType): string {
  switch (messageType) {
  case 'new-episode':
    return '/episode';
  case 'new-podcast':
    return '/podcast';
  case 'new-video':
    return '/video';
  case 'new-video-channel':
    return '/channel';
  case 'new-track':
    return '/track';
  case 'new-album':
    return '/album';
  case 'livestream-started':
  case 'livestream-scheduled':
    return '/livestream';
  case 'new':
  default:
    return '';
  }
}

type NotificationOrchestratorParams = {
  service: NotificationService;
  tokens: string[];
  messageText: string;
  messageType: NotificationMessageType;
  locale: string;
  platform: NotificationPlatform;
  // platform-specific options
  icon?: string;
  linkIdText?: string;
  channelId?: string;
  badge?: number;
  sound?: string;
  data?: Record<string, any>;
};

function getFinalText(messageText: string, messageType: NotificationMessageType, locale: string) {
  const baseLocale = locale.includes('-') ? locale.split('-')[0] : locale;
  const localeMap = i18nNotifications[locale] || i18nNotifications[baseLocale] || i18nNotifications.en;
  const prefix = localeMap[messageType] || i18nNotifications.en[messageType];
  return `${prefix}${messageText}`;
}

export async function notificationOrchestrator(params: NotificationOrchestratorParams) {
  const { service, messageText, messageType, locale, linkIdText, ...serviceParams } = params;
  const finalText = getFinalText(messageText, messageType, locale);

  // Construct the link from messageType and linkIdText
  let link: string | undefined;
  if (linkIdText) {
    const pathPrefix = getLinkPathFromMessageType(messageType);
    link = pathPrefix ? `${pathPrefix}/${linkIdText}` : undefined;
  }

  console.log('[notificationOrchestrator] params:', {
    service,
    tokens: params.tokens,
    messageText,
    messageType,
    locale,
    platform: params.platform,
    icon: params.icon,
    linkIdText,
    channelId: params.channelId,
    badge: params.badge,
    sound: params.sound,
    data: params.data,
    finalText,
    link
  });

  switch (service) {
    case 'firebase':
      return await firebaseNotificationBatchOrchestrator({
        ...serviceParams,
        finalText,
        link,
      });

    // Future services can be added here:
    // case 'onesignal':
    //   return await onesignalNotificationOrchestrator(serviceParams);
    // case 'pusher':
    //   return await pusherNotificationOrchestrator(serviceParams);

    default:
      throw new Error(`Unsupported notification service: ${service}`);
  }
}
