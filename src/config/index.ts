export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  google: {
    firebase: {
      projectId: process.env.GOOGLE_FIREBASE_PROJECT_ID || '',
      patoToAuthJson: process.env.GOOGLE_FIREBASE_PATH_TO_AUTH_JSON || '',
    }
  },
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    mode: process.env.PAYPAL_MODE || 'sandbox'
  },
  podcastIndex: {
    recentlyUpdatedDataInterval: parseInt(process.env.PODCAST_INDEX_RECENTLY_UPDATED_DATA_INTERVAL || '1800', 10)
  }
};
