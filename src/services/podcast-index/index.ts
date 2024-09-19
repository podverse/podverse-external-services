import sha1 from 'crypto-js/sha1'
import encHex from 'crypto-js/enc-hex'
import createError from 'http-errors'
import { logger, request } from 'podverse-helpers';
import { Phase6ValueTimeSplit } from 'podcast-partytime/dist/parser/phase/phase-6'

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
  custom_key?: string
  custom_value?: string
  fee?: boolean
}

type PIValueTag = {
  model: PIValueModel
  destinations: PIValueDestination[]
  value_time_splits: Phase6ValueTimeSplit[]
}

type Constructor = {
  authKey: string
  baseUrl: string
  secretKey: string
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

  constructor ({ authKey, baseUrl, secretKey }: Constructor) {
    this.authKey = authKey
    this.baseUrl = baseUrl
    this.secretKey = secretKey
  }

  podcastIndexAPIRequest = async (url: string) => {
    const apiHeaderTime = new Date().getTime() / 1000
    const hash = sha1(this.authKey + this.secretKey + apiHeaderTime).toString(
      encHex
    )

    return request<any>(url, {
      headers: {
        'X-Auth-Key': this.authKey,
        'X-Auth-Date': apiHeaderTime,
        Authorization: hash
      }
    });
  }

  getRecentlyUpdatedData = async () => {
    logger.info('getRecentlyUpdatedData beginning...')
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    const sinceRange = 1800; // 30 minutes
    const sinceTimeInSeconds = currentTimeInSeconds - sinceRange;
  
    const fetchData = async (since: number, allData: any[] = []): Promise<any[]> => {
      logger.info(`fetchData since: ${since}, allData.length: ${allData.length}`);
      const url = `${this.baseUrl}/recent/data?max=5000&since=${since}`;
      const response = await this.podcastIndexAPIRequest(url);
      const updatedFeeds = response.data.feeds;
      const nextSince = response.nextSince;
  
      allData = allData.concat(updatedFeeds);

      if (nextSince && nextSince <= currentTimeInSeconds) {
        const timeLeft = currentTimeInSeconds - nextSince;
        logger.info(`Time remaining: ${timeLeft} seconds`);
        return fetchData(nextSince, allData);
      }
  
      return allData;
    };
  
    return fetchData(sinceTimeInSeconds);
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
    return this.podcastIndexAPIRequest(url)
  }

  getPodcastFromPodcastIndexById = async (id: string) => {
    const url = `${this.baseUrl}/podcasts/byfeedid?id=${id}`
    return this.podcastIndexAPIRequest(url)
  }

  getPodcastValueTagForPodcastIndexId = async (id: string) => {
    const podcast = await this.getPodcastFromPodcastIndexById(id)
    const pvValueTagArray = this.convertPIValueTagToPVValueTagArray(podcast.feed.value)
    return pvValueTagArray
  }

  getValueTagEnabledPodcastIdsFromPIRecursively = async (
    accumulatedPodcastIndexIds: number[], startAt = 1): Promise<number[]> => {
    const url = `${this.baseUrl}/podcasts/bytag?podcast-value=true&max=5000&start_at=${startAt}`
    const data = await this.podcastIndexAPIRequest(url)
  
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
            customKey: destination.custom_key || '',
            customValue: destination.custom_value || '',
            fee: destination.fee || false,
            name: destination.name || '',
            split: destination.split || 0,
            type: destination.type || ''
          }
        }),
        valueTimeSplits: piValueTag.value_time_splits
      }
    ] as any[]
  }

  getPodcastFromPodcastIndexByGuid = async (podcastGuid: string) => {
    const url = `${this.baseUrl}/podcasts/byguid?guid=${podcastGuid}`
    let podcastIndexPodcast: any = null
    try {
      const data = await this.podcastIndexAPIRequest(url)
      podcastIndexPodcast = data
    } catch (error) {
      // assume a 404
    }
  
    if (!podcastIndexPodcast) {
      throw new createError.NotFound('Podcast not found in Podcast Index')
    }
  
    return podcastIndexPodcast
  }
}

