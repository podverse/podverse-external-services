// import { UnifiedPushService } from '..'
import { GoogleFCMService } from '@external-services/services/google/fcm'

export interface SendNotificationOptions {
  itemFullImageUrl?: string | null
  itemGuid?: string | null
  itemIdText?: string
  itemTitle?: string | null
  channelIdText: string
  channelFullImageUrl?: string | null
  // podcastShrunkImageUrl?: string | null
  channelTitle?: string | null
}

type Constructor = {
  googleAuthToken: string
}

export class NotificationsService  {
  declare GoogleFCMService: GoogleFCMService
  // declare UnifiedPushService: UnifiedPushService

  constructor ({ googleAuthToken }: Constructor) {
    this.GoogleFCMService = new GoogleFCMService({
      authToken: googleAuthToken
    })

    // this.UnifiedPushService = new UnifiedPushService()
  }

  sendNewItemDetectedNotifications = async (account_fcm_tokens: string[], options: SendNotificationOptions): Promise<void> => {
    await Promise.all([
      this.GoogleFCMService.sendFcmNewItemDetectedNotification(account_fcm_tokens, options),
      // this.UnifiedPushService.sendUpNewEpisodeDetectedNotification(options)
    ])
  }

  sendLiveItemLiveDetectedNotifications = async (account_fcm_tokens: string[], options: SendNotificationOptions): Promise<void> => {
    await Promise.all([
      this.GoogleFCMService.sendFcmLiveItemLiveDetectedNotification(account_fcm_tokens, options),
      // this.UnifiedPushService.sendUpLiveItemLiveDetectedNotification(options)
    ])
  }
}
