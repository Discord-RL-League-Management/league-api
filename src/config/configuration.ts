export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
  },
  database: {
    url: process.env.DATABASE_URL || '',
  },
  auth: {
    botApiKey: process.env.BOT_API_KEY || '',
    apiKeySalt: process.env.API_KEY_SALT || '',
    jwtSecret: process.env.JWT_SECRET || '',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    cookieSecure: process.env.NODE_ENV === 'production',
    cookieSameSite:
      (process.env.COOKIE_SAME_SITE as 'lax' | 'strict' | 'none') || 'lax',
    cookieMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || '',
  },
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    callbackUrl: process.env.DISCORD_CALLBACK_URL || '',
    botToken: process.env.DISCORD_BOT_TOKEN || '',
    timeout: parseInt(process.env.DISCORD_TIMEOUT || '10000', 10),
    retryAttempts: parseInt(process.env.DISCORD_RETRY_ATTEMPTS || '3', 10),
    apiUrl: process.env.DISCORD_API_URL || 'https://discord.com/api/v10',
  },
  frontend: {
    url: process.env.FRONTEND_URL || '',
  },
  throttler: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    fileEnabled: process.env.LOG_FILE_ENABLED === 'true',
    filePath: process.env.LOG_FILE_PATH || 'logs',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  queue: {
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5', 10),
    defaultJobOptions: process.env.QUEUE_DEFAULT_JOB_OPTIONS
      ? JSON.parse(process.env.QUEUE_DEFAULT_JOB_OPTIONS)
      : {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
  },
  outbox: {
    pollIntervalMs: parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '5000', 10),
  },
  circuitBreaker: {
    threshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5', 10),
    timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '60000', 10),
  },
  zyte: {
    apiKey: process.env.ZYTE_API_KEY || '',
    proxyHost: process.env.ZYTE_PROXY_HOST || 'api.zyte.com',
    proxyPort: parseInt(process.env.ZYTE_PROXY_PORT || '8011', 10),
    rateLimitPerMinute: parseInt(process.env.ZYTE_RATE_LIMIT_PER_MINUTE || '60', 10),
    timeoutMs: parseInt(process.env.ZYTE_TIMEOUT_MS || '30000', 10),
    retryAttempts: parseInt(process.env.ZYTE_RETRY_ATTEMPTS || '3', 10),
    retryDelayMs: parseInt(process.env.ZYTE_RETRY_DELAY_MS || '1000', 10),
  },
  tracker: {
    refreshIntervalHours: parseInt(process.env.TRACKER_REFRESH_INTERVAL_HOURS || '24', 10),
    batchSize: parseInt(process.env.TRACKER_BATCH_SIZE || '100', 10),
    refreshCron: process.env.TRACKER_REFRESH_CRON || '0 2 * * *',
    maxScrapingAttempts: parseInt(process.env.TRACKER_MAX_SCRAPING_ATTEMPTS || '3', 10),
  },
});
