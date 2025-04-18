import sha1 from 'crypto-js/sha1'
import encHex from 'crypto-js/enc-hex'
import csv from 'csv-parser';
import fs from 'fs';
import createError from 'http-errors'
import path from 'path';
import { logger, request } from 'podverse-helpers';
import { config } from '@external-services/config'
import { PodcastByGuidResponse } from './types/podcastByGuid';
import { PodcastsByTagResponse } from './types/podcastsByTag';

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

  podcastIndexAPIRequest = async (url: string, config?: any) => {
    const apiHeaderTime = new Date().getTime() / 1000
    const hash = sha1(this.authKey + this.secretKey + apiHeaderTime).toString(
      encHex
    )

    return request<any>(url, {
      headers: {
        'X-Auth-Key': this.authKey,
        'X-Auth-Date': apiHeaderTime,
        Authorization: hash
      },
      ...config
    });
  }

  getRecentlyUpdatedData = async () => {
    logger.info('getRecentlyUpdatedData beginning...')
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    const sinceRange = config.podcastIndex.recentlyUpdatedDataInterval;
    const sinceTimeInSeconds = currentTimeInSeconds - sinceRange;

    const fetchData = async (since: number, allData: any[] = []): Promise<any[]> => {
      logger.info(`fetchData since: ${since}, allData.length: ${allData.length}`);
      const url = `${this.baseUrl}/recent/data?max=5000&since=${since}`;
      const response = await this.podcastIndexAPIRequest(url);
      const updatedFeeds = response.data.feeds;
      const nextSince = response.nextSince;
  
      allData = allData.concat(updatedFeeds);

      if (nextSince && nextSince <= currentTimeInSeconds) {
        if (nextSince <= since) {
          logger.info(`nextSince (${nextSince}) is not greater than since (${since}). Exiting to avoid infinite loop.`);
          return allData;
        }
        const timeLeft = currentTimeInSeconds - nextSince;
        logger.info(`Time remaining: ${timeLeft} seconds`);
        return fetchData(nextSince, allData);
      }
  
      return allData;
    };
  
    return fetchData(sinceTimeInSeconds);
  }
  
  getPodcastByGuid = async (podcastGuid: string): Promise<PodcastByGuidResponse | null> => {
    const url = `${this.baseUrl}/podcasts/byguid?guid=${podcastGuid}`
    let podcastIndexPodcast: PodcastByGuidResponse | null = null

    try {
      const data = await this.podcastIndexAPIRequest(url)
      podcastIndexPodcast = data
    } catch (error) {
      // assume a 404
    }
  
    return podcastIndexPodcast || null;
  }

  getValueTagEnabledPodcastIdsRecursively = async (
    accumulatedPodcastIndexIds: number[], startAt = 1): Promise<number[]> => {
    const url = `${this.baseUrl}/podcasts/bytag?podcast-valueTimeSplit=true&max=5000&start_at=${startAt}`
    const data = await this.podcastIndexAPIRequest(url) as PodcastsByTagResponse
  
    for (const feed of data.feeds) {
      accumulatedPodcastIndexIds.push(feed.id)
    }
  
    if (data.nextStartAt) {
      return await this.getValueTagEnabledPodcastIdsRecursively(accumulatedPodcastIndexIds, data.nextStartAt)
    }
  
    return accumulatedPodcastIndexIds
  }
  
  getValueTagEnabledPodcastIds = async (): Promise<number[]> => {
    const accumulatedPodcastIndexIds: number[] = []
    const nextStartAt = 1
    const podcastIndexIds = await this.getValueTagEnabledPodcastIdsRecursively(accumulatedPodcastIndexIds, nextStartAt)
  
    return podcastIndexIds
  }

  downloadAndExtractCSV = async (): Promise<any[]> => {
    const url = 'https://public.podcastindex.org/podcastindex_dead_feeds.csv';
    const tmpDir = path.join(__dirname, 'tmp');
    const filePath = path.join(tmpDir, 'podcastindex_dead_feeds.csv');

    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir);
    }
    
    const data = await this.podcastIndexAPIRequest(url, { responseType: 'stream' });

    const writer = fs.createWriteStream(filePath);
    data.pipe(writer);

    
    await new Promise<void>((resolve, reject) => {
      writer.on('finish', () => resolve());
      writer.on('error', reject);
    });

    const results: any[] = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    fs.unlinkSync(filePath);

    const parsedResults = results.map((row: Record<string, string>) => {
      const [id, duplicateOf] = Object.values(row).map((value) => value.trim());
      return {
        podcast_index_id: parseInt(id, 10),
        duplicateOf: duplicateOf ? parseInt(duplicateOf, 10) : null
      };
    });

    return parsedResults;
  }
}
