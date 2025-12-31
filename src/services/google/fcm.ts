import { request } from 'podverse-helpers';
import { ILoggerLike } from 'podverse-helpers/dist/lib/backend/logger';
import { SendNotificationOptions } from '@external-services/services/notifications';

type GoogleFCMServiceParams = {
  userAgent: string;
  authToken: string;
  firebaseProjectId: string;
  loggerService: ILoggerLike;
};

export class GoogleFCMService {
  private userAgent: string;
  private authToken: string;
  private firebaseProjectId: string;
  private loggerService: ILoggerLike;

  constructor({ userAgent, authToken, firebaseProjectId, loggerService }: GoogleFCMServiceParams) {
    this.userAgent = userAgent;
    this.authToken = authToken;
    this.firebaseProjectId = firebaseProjectId;
    this.loggerService = loggerService;
  }

  private getFcmGoogleApiPath() {
    return `https://fcm.googleapis.com/v1/projects/${this.firebaseProjectId}/messages:send`;
  }

  sendFcmNewItemDetectedNotification = async (account_fcm_tokens: string[], options: SendNotificationOptions) => {
    const { channelIdText, channelFullImageUrl, itemFullImageUrl, itemIdText } = options;
    const channelTitle = options.channelTitle || 'Untitled';
    const itemTitle = options.itemTitle || 'Untitled';
    const title = channelTitle;
    const body = itemTitle;

    const finalPodcastImageUrl = channelFullImageUrl;
    const finalEpisodeImageUrl = itemFullImageUrl;

    return this.sendFCMGoogleApiNotification(
      account_fcm_tokens,
      title,
      body,
      channelIdText,
      'new-item',
      channelTitle,
      itemTitle,
      finalPodcastImageUrl,
      finalEpisodeImageUrl,
      itemIdText
    );
  };

  sendFcmLiveItemLiveDetectedNotification = async (account_fcm_tokens: string[], options: SendNotificationOptions) => {
    const { channelIdText, channelFullImageUrl, itemFullImageUrl, itemIdText } = options;
    const channelTitle = options.channelTitle || 'Untitled';
    const itemTitle = options.itemTitle || 'Livestream starting';
    const title = `LIVE: ${channelTitle}`;
    const body = itemTitle;

    const finalPodcastImageUrl = channelFullImageUrl;
    const finalEpisodeImageUrl = itemFullImageUrl;

    return this.sendFCMGoogleApiNotification(
      account_fcm_tokens,
      title,
      body,
      channelIdText,
      'live',
      channelTitle,
      itemTitle,
      finalPodcastImageUrl,
      finalEpisodeImageUrl,
      itemIdText
    );
  };

  sendFCMGoogleApiNotification = async (
    fcmTokens: string[],
    title: string,
    body: string,
    channelIdText: string,
    notificationType: 'live' | 'new-item',
    channelTitle: string,
    itemTitle: string,
    channelImage?: string | null,
    itemImage?: string | null,
    itemIdText?: string
  ) => {
    if (!fcmTokens || fcmTokens.length === 0) return;

    const fcmTokenBatches: any[] = [];
    const size = 1000;
    for (let i = 0; i < fcmTokens.length; i += size) {
      fcmTokenBatches.push(fcmTokens.slice(i, i + size));
    }

    const fcmGoogleApiPath = this.getFcmGoogleApiPath();

    for (const fcmTokenBatch of fcmTokenBatches) {
      if (fcmTokenBatch?.length > 0) {
        const imageUrl = itemImage || channelImage;

        try {
          for (const token of fcmTokenBatch) {
            await request(fcmGoogleApiPath, {
              method: 'POST',
              headers: {
                'User-Agent': this.userAgent,
                Authorization: `Bearer ${this.authToken}`,
                'Content-Type': 'application/json'
              },
              data: {
                message: {
                  token,
                  notification: {
                    title,
                    body,
                    image: imageUrl
                  },
                  data: {
                    podcastId: channelIdText,
                    episodeId: itemIdText,
                    podcastTitle: channelTitle,
                    episodeTitle: itemTitle,
                    notificationType,
                    timeSent: new Date().toISOString()
                  },
                  android: {
                    notification: {
                      image: imageUrl
                    }
                  },
                  apns: {
                    payload: {
                      aps: {
                        'mutable-content': 1
                      }
                    },
                    fcm_options: {
                      image: imageUrl
                    }
                  },
                  webpush: {
                    notification: {
                      image: imageUrl
                    }
                  }
                }
              },
              responseType: 'json'
            });
          }
        } catch (error) {
          this.loggerService.logError('sendFCMGoogleApiNotification error', error as Error);
        }
      }
    }
  };
}