import * as Joi from 'joi';

export const configurationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  // Database
  DATABASE_URL: Joi.string().required(),

  // Bot Authentication
  BOT_API_KEY: Joi.string().required(),
  API_KEY_SALT: Joi.string().required(),

  // JWT Authentication
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  // Encryption
  ENCRYPTION_KEY: Joi.string().required(),

  // Discord OAuth
  DISCORD_CLIENT_ID: Joi.string().required(),
  DISCORD_CLIENT_SECRET: Joi.string().required(),
  DISCORD_CALLBACK_URL: Joi.string().required(),
  DISCORD_BOT_TOKEN: Joi.string().required(),
  DISCORD_TIMEOUT: Joi.number().default(10000),
  DISCORD_RETRY_ATTEMPTS: Joi.number().default(3),
  DISCORD_API_URL: Joi.string().default('https://discord.com/api/v10'),

  // Cookie settings
  COOKIE_SAME_SITE: Joi.string().valid('strict', 'lax', 'none').default('lax'),

  // Frontend
  FRONTEND_URL: Joi.string().required(),

  // Rate Limiting
  THROTTLE_TTL: Joi.number().default(60000), // 1 minute
  THROTTLE_LIMIT: Joi.number().default(100),

  // New Relic Logs API Configuration
  NEW_RELIC_LICENSE_KEY: Joi.string().optional().allow(''),
  NEW_RELIC_ENABLED: Joi.boolean().default(true),

  // Redis Configuration
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().required(),
  REDIS_DB: Joi.number().default(0),

  // BullMQ Queue Configuration
  QUEUE_CONCURRENCY: Joi.number().default(5),
  QUEUE_DEFAULT_JOB_OPTIONS: Joi.string().default(
    '{"removeOnComplete": 100, "removeOnFail": 50, "attempts": 3, "backoff": {"type": "exponential", "delay": 2000}}',
  ),

  // Outbox Pattern Configuration
  OUTBOX_POLL_INTERVAL_MS: Joi.number().default(5000),

  // Circuit Breaker Configuration
  CIRCUIT_BREAKER_THRESHOLD: Joi.number().default(5),
  CIRCUIT_BREAKER_TIMEOUT: Joi.number().default(60000),

  // Decodo Scraper API Configuration
  DECODO_API_KEY: Joi.string().required(),
  DECODO_API_URL: Joi.string().default(
    'https://scraper-api.decodo.com/v2/scrape',
  ),
  DECODO_PROXY_URL: Joi.string().default('http://gate.decodo.com:7000'),
  DECODO_PROXY_USERNAME: Joi.string().required(),
  DECODO_PROXY_PASSWORD: Joi.string().required(),
  DECODO_RATE_LIMIT_PER_MINUTE: Joi.number().default(60),
  DECODO_TIMEOUT_MS: Joi.number().default(30000),
  DECODO_RETRY_ATTEMPTS: Joi.number().default(3),
  DECODO_RETRY_DELAY_MS: Joi.number().default(1000),

  // FlareSolverr Configuration
  FLARESOLVERR_URL: Joi.string().default('http://flaresolverr:8191'),

  // Tracker Refresh Configuration
  TRACKER_REFRESH_INTERVAL_HOURS: Joi.number().default(24),
  TRACKER_BATCH_SIZE: Joi.number().default(100),
  TRACKER_REFRESH_CRON: Joi.string().default('0 2 * * *'),
  TRACKER_MAX_SCRAPING_ATTEMPTS: Joi.number().default(3),

  // System Admin Configuration
  SYSTEM_ADMIN_USER_IDS: Joi.string()
    .optional()
    .allow('')
    .pattern(/^(\d{17,20})(,\s*\d{17,20})*$/)
    .description('Comma-separated Discord user IDs (snowflakes)'),
});
