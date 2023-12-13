import axios, { AxiosRequestConfig } from 'axios'
import { getFCMTokensForPodcastId } from 'podverse-orm'
import { SendNotificationOptions } from '../notifications'
import { GoogleService } from '.'

const fcmGoogleApiPath = 'https://fcm.googleapis.com/fcm/send'

type Constructor = {
  authToken: string
  userAgent: string
}

export class GoogleFCMService extends GoogleService  {
  declare authToken: string
  declare userAgent: string

  constructor ({ authToken, userAgent }: Constructor) {
    super({ authToken, userAgent })
    this.authToken = authToken
    this.userAgent = userAgent
  }

  request = (options: AxiosRequestConfig) => {
    return axios({
      ...options,
      headers: {
        ...options.headers,
        "User-Agent": this.userAgent
      }
    })
  }

  sendFcmNewEpisodeDetectedNotification = async (options: SendNotificationOptions) => {
    const { podcastId, podcastShrunkImageUrl, podcastFullImageUrl, episodeFullImageUrl, episodeId } = options
    const fcmTokens = await getFCMTokensForPodcastId(podcastId)
    const podcastTitle = options.podcastTitle || 'Untitled Podcast'
    const episodeTitle = options.episodeTitle || 'Untitled Episode'
    const title = podcastTitle
    const body = episodeTitle
  
    const finalPodcastImageUrl = podcastShrunkImageUrl || podcastFullImageUrl
    const finalEpisodeImageUrl = episodeFullImageUrl
  
    return this.sendFCMGoogleApiNotification(
      fcmTokens,
      title,
      body,
      podcastId,
      'new-episode',
      podcastTitle,
      episodeTitle,
      finalPodcastImageUrl,
      finalEpisodeImageUrl,
      episodeId
    )
  }
  
  sendFcmLiveItemLiveDetectedNotification = async (options: SendNotificationOptions) => {
    const { podcastId, podcastShrunkImageUrl, podcastFullImageUrl, episodeFullImageUrl, episodeId } = options
    const fcmTokens = await getFCMTokensForPodcastId(podcastId)
    const podcastTitle = options.podcastTitle || 'Untitled Podcast'
    const episodeTitle = options.episodeTitle || 'Livestream starting'
    const title = `LIVE: ${podcastTitle}`
    const body = episodeTitle
  
    const finalPodcastImageUrl = podcastShrunkImageUrl || podcastFullImageUrl
    const finalEpisodeImageUrl = episodeFullImageUrl
  
    return this.sendFCMGoogleApiNotification(
      fcmTokens,
      title,
      body,
      podcastId,
      'live',
      podcastTitle,
      episodeTitle,
      finalPodcastImageUrl,
      finalEpisodeImageUrl,
      episodeId
    )
  }
  
  sendFCMGoogleApiNotification = async (
    fcmTokens: string[],
    title: string,
    body: string,
    podcastId: string,
    notificationType: 'live' | 'new-episode',
    podcastTitle: string,
    episodeTitle: string,
    podcastImage?: string | null,
    episodeImage?: string | null,
    episodeId?: string
  ) => {
    if (!fcmTokens || fcmTokens.length === 0) return
  
    const fcmTokenBatches: any[] = []
    const size = 1000
    for (let i = 0; i < fcmTokens.length; i += size) {
      fcmTokenBatches.push(fcmTokens.slice(i, i + size))
    }
  
    for (const fcmTokenBatch of fcmTokenBatches) {
      if (fcmTokenBatch?.length > 0) {
        const imageUrl = episodeImage || podcastImage
  
        try {
          await this.request({
            url: fcmGoogleApiPath,
            method: 'POST',
            headers: {
              Authorization: `key=${this.authToken}`,
              'Content-Type': 'application/json'
            },
            data: {
              // eslint-disable-next-line @typescript-eslint/camelcase
              registration_ids: fcmTokenBatch || [],
              notification: {
                body,
                title,
                podcastId,
                episodeId,
                podcastTitle: podcastTitle,
                episodeTitle: episodeTitle,
                notificationType,
                timeSent: new Date(),
                image: imageUrl
              },
              data: {
                body,
                title,
                podcastId,
                episodeId,
                podcastTitle: podcastTitle,
                episodeTitle: episodeTitle,
                notificationType,
                timeSent: new Date()
              },
              android: {
                notification: {
                  imageUrl
                }
              },
              apns: {
                payload: {
                  aps: {
                    'mutable-content': 1
                  }
                },
                // eslint-disable-next-line @typescript-eslint/camelcase
                fcm_options: {
                  image: imageUrl
                }
              },
              webpush: {
                headers: {
                  image: imageUrl
                }
              }
            },
            responseType: 'json'
          })
        } catch (error) {
          console.log('sendFCMGoogleApiNotification error', error)
        }
      }
    }
  }
}
