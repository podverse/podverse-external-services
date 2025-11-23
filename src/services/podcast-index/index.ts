import sha1 from 'crypto-js/sha1'
import encHex from 'crypto-js/enc-hex'
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { request } from 'podverse-helpers';
import type { PodcastByGuidResponse, PodcastIndexSearchPodcastsResponse,
  PodcastsByTagResponse } from 'podverse-helpers';
import { LoggerService } from 'podverse-helpers/dist/lib/backend/logger';

type Constructor = {
  userAgent: string
  authKey: string
  baseUrl: string
  secretKey: string
  loggerService: LoggerService
}

/*
  NOTE!!!
  The episodeGuid needs to be encoded both on the client-side and server side if it is an http url guid.
  Koa will automatically decode the encoded url param, and then Podcast Index API needs it
  encoded once again before sending the request to PI API.
*/

export class PodcastIndexService  {
  declare userAgent: string
  declare authKey: string
  declare baseUrl: string
  declare secretKey: string
  declare loggerService: LoggerService;

  constructor ({ userAgent, authKey, baseUrl, secretKey, loggerService }: Constructor) {
    this.userAgent = userAgent
    this.authKey = authKey
    this.baseUrl = baseUrl
    this.secretKey = secretKey
    this.loggerService = loggerService
  }

  // Request handler

  podcastIndexAPIRequest = async (url: string, config?: any) => {
    const apiHeaderTime = Math.floor(Date.now() / 1000);
    const hash = sha1(this.authKey + this.secretKey + apiHeaderTime).toString(encHex);

    try {
      const response = await request<any>(url, {
        headers: {
          'User-Agent': this.userAgent,
          'X-Auth-Key': this.authKey,
          'X-Auth-Date': apiHeaderTime,
          Authorization: hash
        },
        ...config
      });

      return response?.data;
    } catch (error: any) {
      this.loggerService.logError('[PodcastIndex] Request failed', {
        url,
        errorMessage: error?.message,
        errorStack: error?.stack,
        errorResponse: error?.response?.data,
        errorStatus: error?.response?.status,
        errorHeaders: error?.response?.headers
      });
      throw error;
    }
  }

  // Dead Feeds

  deadFeedsDownloadAndExtractCSV = async (resolveHandler: (row: string[]) => void): Promise<void> => {
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

    await new Promise<void>((resolve, reject) => {
      const stream = fs.createReadStream(filePath)
        .pipe(csv({ headers: false, skipLines: 0 }));

      stream.on('data', async (row: string[]) => {
        stream.pause();
        try {
          await resolveHandler(row);
          stream.resume();
        } catch (err) {
          stream.destroy(err instanceof Error ? err : new Error(String(err)));
        }
      });
      stream.on('end', () => resolve());
      stream.on('error', reject);
      stream.on('close', () => resolve());
    });

    fs.unlinkSync(filePath);
  }

  deadFeedsExtractRow = (row: string[]) => {
    const id_to_archive = row[0];
    const duplicate_id_to_keep = row[1] || null;
    return {
      id_to_archive: parseInt(id_to_archive, 10),
      duplicate_id_to_keep: duplicate_id_to_keep ? parseInt(duplicate_id_to_keep, 10) : null
    };
  }

  // Podcast

  podcastGetById = async (podcast_index_id: number): Promise<any | null> => {
    const url = `${this.baseUrl}/podcasts/byfeedid?id=${podcast_index_id}`;
    try {
      const response = await this.podcastIndexAPIRequest(url);
      return response || null;
    } catch (error) {
      return null;
    }
  }

  podcastGetByGuid = async (podcastGuid: string): Promise<PodcastByGuidResponse | null> => {
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

  podcastsByMedium = async (medium: string, max: number = 100) => {
    const safeMax = Math.min(max, 1000);
    const url = `${this.baseUrl}/podcasts/bymedium?medium=${encodeURIComponent(medium)}&max=${safeMax}`;
    const response = await this.podcastIndexAPIRequest(url);
    return response.feeds || [];
  }

  // Recent

  recentGetData = async (sinceRange: number) => {
    this.loggerService.info('recentGetData beginning...')
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    const sinceTimeInSeconds = currentTimeInSeconds - sinceRange;

    const fetchData = async (since: number, allData: any[] = []): Promise<any[]> => {
      this.loggerService.info(`fetchData since: ${since}, allData.length: ${allData.length}`);
      const url = `${this.baseUrl}/recent/data?max=5000&since=${since}`;
      const response = await this.podcastIndexAPIRequest(url);
      const updatedFeeds = response.data.feeds;
      const nextSince = response.nextSince;
  
      allData = allData.concat(updatedFeeds);

      if (nextSince && nextSince <= currentTimeInSeconds) {
        if (nextSince <= since) {
          this.loggerService.info(`nextSince (${nextSince}) is not greater than since (${since}). Exiting to avoid infinite loop.`);
          return allData;
        }
        const timeLeft = currentTimeInSeconds - nextSince;
        this.loggerService.info(`Time remaining: ${timeLeft} seconds`);
        return fetchData(nextSince, allData);
      }
  
      return allData;
    };
  
    return fetchData(sinceTimeInSeconds);
  }

  // Search

  searchPodcasts = async (
    term: string,
    options: {
      max?: number
      val?: 'any' | 'lightning' | 'hive' | 'webmonetization'
      aponly?: boolean
      clean?: boolean
      similar?: boolean
      fulltext?: boolean
      pretty?: boolean
    } = {}
  ): Promise<PodcastIndexSearchPodcastsResponse | null> => {
    const {
      max = 25,
      val,
      aponly,
      clean,
      similar,
      fulltext,
      pretty
    } = options;

    const safeMax = Math.min(Math.max(max, 1), 1000);
    const params: string[] = [
      `q=${encodeURIComponent(term)}`,
      `max=${safeMax}`
    ];

    if (val) {
      params.push(`val=${encodeURIComponent(val)}`);
    }
    // Boolean flags: if true, include param name without value per Podcast Index docs
    if (aponly) params.push('aponly');
    if (clean) params.push('clean');
    if (similar) params.push('similar');
    if (fulltext) params.push('fulltext');
    if (pretty) params.push('pretty');

    const query = params.join('&');
    const url = `${this.baseUrl}/search/byterm?${query}`;

    this.loggerService.info(`[PodcastIndex] Searching podcasts: term="${term}" max=${safeMax} val=${val || 'none'} flags=${[aponly&&'aponly',clean&&'clean',similar&&'similar',fulltext&&'fulltext',pretty&&'pretty'].filter(Boolean).join(',')}`);
    try {
      const response = await this.podcastIndexAPIRequest(url);
      return response || [];
    } catch (error) {
      this.loggerService.logError('[PodcastIndex] searchPodcasts failed', { term, error });
      return null;
    }
  }

  // Trending

  trendingGetPodcasts = async (
    max: number = 25,
    since?: number,
    lang?: string,
    cat?: string
  ): Promise<{ feeds: any[]; nextSince?: number }> => {
    const safeMax = Math.min(max, 1000);
    let url = `${this.baseUrl}/podcasts/trending?max=${safeMax}`;
    if (since) {
      url += `&since=${since}`;
    }
    if (lang) {
      url += `&lang=${encodeURIComponent(lang)}`;
    }
    if (cat) {
      url += `&cat=${encodeURIComponent(cat)}`;
    }

    this.loggerService.info(`[PodcastIndex] Fetching trending feeds (max: ${safeMax}, since: ${since}, lang: ${lang}, cat: ${cat})`);
    const response = await this.podcastIndexAPIRequest(url);
    
    return {
      feeds: response.feeds || [],
      nextSince: response.nextSince
    };
  }

  // Value

  valueGetByPodcastIds = async (): Promise<number[]> => {
    const accumulatedPodcastIndexIds: number[] = []
    const nextStartAt = 1
    const podcast_index_ids = await this.valueGetByPodcastIdsRecursively(accumulatedPodcastIndexIds, nextStartAt)
  
    return podcast_index_ids
  }

  valueGetByPodcastIdsRecursively = async (
    accumulatedPodcastIndexIds: number[], startAt = 1): Promise<number[]> => {
    const url = `${this.baseUrl}/podcasts/bytag?podcast-valueTimeSplit=true&max=5000&start_at=${startAt}`
    const data = await this.podcastIndexAPIRequest(url) as PodcastsByTagResponse
  
    for (const feed of data.feeds) {
      accumulatedPodcastIndexIds.push(feed.id)
    }
  
    if (data.nextStartAt) {
      return await this.valueGetByPodcastIdsRecursively(accumulatedPodcastIndexIds, data.nextStartAt)
    }
  
    return accumulatedPodcastIndexIds
  }
}
