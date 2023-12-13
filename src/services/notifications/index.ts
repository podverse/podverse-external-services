import { UnifiedPushService } from '..'
import { GoogleFCMService } from '../google/fcm'

export interface SendNotificationOptions {
  episodeFullImageUrl?: string | null
  episodeGuid?: string
  episodeId?: string
  episodeTitle?: string | null
  podcastId: string
  podcastFullImageUrl?: string | null
  podcastShrunkImageUrl?: string | null
  podcastTitle?: string | null
}

type Constructor = {
  googleAuthToken: string
  userAgent: string
}

export class NotificationsService  {
  declare fcmAuthToken: string
  declare userAgent: string
  declare GoogleFCMService: GoogleFCMService
  declare UnifiedPushService: UnifiedPushService

  constructor ({ googleAuthToken, userAgent }: Constructor) {
    this.GoogleFCMService = new GoogleFCMService({
      authToken: googleAuthToken,
      userAgent
    })

    this.UnifiedPushService = new UnifiedPushService()
  }

  sendNewEpisodeDetectedNotification = async (options: SendNotificationOptions) => {
    return Promise.all([
      this.GoogleFCMService.sendFcmNewEpisodeDetectedNotification(options),
      this.UnifiedPushService.sendUpNewEpisodeDetectedNotification(options)
    ])
  }

  sendLiveItemLiveDetectedNotification = async (options: SendNotificationOptions) => {
    return Promise.all([
      this.GoogleFCMService.sendFcmLiveItemLiveDetectedNotification(options),
      this.UnifiedPushService.sendUpLiveItemLiveDetectedNotification(options)
    ])
  }
}
