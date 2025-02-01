export const config = {
  podcastIndex: {
    recentlyUpdatedDataInterval: parseInt(process.env.PODCAST_INDEX_RECENTLY_UPDATED_DATA_INTERVAL || '1800', 10)
  }
};
