import axios from 'axios'
import sha1 from 'crypto-js/sha1'
import encHex from 'crypto-js/enc-hex'
import createError from 'http-errors'
import { Phase6ValueTimeSplit } from 'podcast-partytime/dist/parser/phase/phase-6'
import { config } from '../../config'

type PIValueModel = {
  type: string
  method: string
  suggested: string
}

type PIValueDestination = {
  name: string
  type: string
  address: string
  split: number
  customKey?: string
  customValue?: string
  fee?: boolean
}

type PIValueTag = {
  model: PIValueModel
  destinations: PIValueDestination[]
  valueTimeSplits: Phase6ValueTimeSplit[]
}

type Constructor = {
  authKey: string
  baseUrl: string
  secretKey: string
  userAgent: string
}

/*
  NOTE!!!
  The episodeGuid needs to be encoded both on the client-side and server side if it is an http url guid.
  Koa will automatically decode the encoded url param, and then Podcast Index API needs it
  encoded once again before sending the request to PI API.
*/

export class PodcastIndexService  {
  declare authKey: string
  declare baseUrl: string
  declare secretKey: string
  declare userAgent: string

  constructor ({ authKey, baseUrl, secretKey, userAgent }: Constructor) {
    this.authKey = authKey
    this.baseUrl = baseUrl
    this.secretKey = secretKey
    this.userAgent = userAgent
  }

  podcastIndexAPIRequest = async (url: string) => {
    const apiHeaderTime = new Date().getTime() / 1000
    const hash = sha1(this.authKey + this.secretKey + apiHeaderTime).toString(
      encHex
    )

    return axios({
      url,
      method: 'GET',
      headers: {
        'User-Agent': this.userAgent,
        'X-Auth-Key': this.authKey,
        'X-Auth-Date': apiHeaderTime,
        Authorization: hash
      }
    })
  }
    
  getAllEpisodesFromPodcastIndexById = async (podcastIndexId: string) => {  
    const response = await this.getEpisodesFromPodcastIndexById(podcastIndexId)
    const allEpisodes = response?.items
    return allEpisodes
  }
  
  getAllEpisodeValueTagsFromPodcastIndexById = async (podcastIndexId: string) => {
    const episodes = await this.getAllEpisodesFromPodcastIndexById(podcastIndexId)
    const pvEpisodesValueTagsByGuid: any = {}
    for (const episode of episodes) {
      if (episode?.value && episode?.guid) {
        const pvValueTagArray = this.convertPIValueTagToPVValueTagArray(episode.value)
        if (pvValueTagArray?.length > 0) {
          pvEpisodesValueTagsByGuid[episode.guid] = pvValueTagArray
        }
      }
    }
    return pvEpisodesValueTagsByGuid
  }
  
  getEpisodesFromPodcastIndexById = async (podcastIndexId: string) => {
    const url = `${this.baseUrl}/episodes/byfeedid?id=${podcastIndexId}&max=1000`
    const response = await this.podcastIndexAPIRequest(url)
    return response && response.data
  }

  getPodcastFromPodcastIndexById = async (id: string) => {
    const url = `${this.baseUrl}/podcasts/byfeedid?id=${id}`
    const response = await this.podcastIndexAPIRequest(url)
    return response && response.data
  }

  getPodcastValueTagForPodcastIndexId = async (id: string) => {
    const podcast = await this.getPodcastFromPodcastIndexById(id)
    const pvValueTagArray = this.convertPIValueTagToPVValueTagArray(podcast.feed.value)
    return pvValueTagArray
  }

  getValueTagEnabledPodcastIdsFromPIRecursively = async (
    accumulatedPodcastIndexIds: number[], startAt = 1): Promise<number[]> => {
    const url = `${config.podcastIndex.baseUrl}/podcasts/bytag?podcast-value=true&max=5000&start_at=${startAt}`
    const response = await this.podcastIndexAPIRequest(url)
    const { data } = response
  
    for (const feed of data.feeds) {
      accumulatedPodcastIndexIds.push(feed.id)
    }
  
    if (data.nextStartAt) {
      return await this.getValueTagEnabledPodcastIdsFromPIRecursively(accumulatedPodcastIndexIds, data.nextStartAt)
    }
  
    return accumulatedPodcastIndexIds
  }
  
  getValueTagEnabledPodcastIdsFromPI = async () => {
    const accumulatedPodcastIndexIds: number[] = []
    const nextStartAt = 1
    const podcastIndexIds = await this.getValueTagEnabledPodcastIdsFromPIRecursively(accumulatedPodcastIndexIds, nextStartAt)
  
    return podcastIndexIds
  }

  convertPIValueTagToPVValueTagArray = (piValueTag: PIValueTag) => {
    return [
      {
        method: piValueTag.model.method,
        suggested: piValueTag.model.suggested,
        type: piValueTag.model.type,
        recipients: piValueTag.destinations.map((destination: PIValueDestination) => {
          return {
            address: destination.address,
            customKey: destination.customKey || '',
            customValue: destination.customValue || '',
            fee: destination.fee || false,
            name: destination.name || '',
            split: destination.split || 0,
            type: destination.type || ''
          }
        }),
        valueTimeSplits: piValueTag.valueTimeSplits
      }
    ] as any[]
  }

  getPodcastFromPodcastIndexByGuid = async (podcastGuid: string) => {
    const url = `${this.baseUrl}/podcasts/byguid?guid=${podcastGuid}`
    let podcastIndexPodcast: any = null
    try {
      const response = await this.podcastIndexAPIRequest(url)
      podcastIndexPodcast = response.data
    } catch (error) {
      // assume a 404
    }
  
    if (!podcastIndexPodcast) {
      throw new createError.NotFound('Podcast not found in Podcast Index')
    }
  
    return podcastIndexPodcast
  }
}
