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
  COOKIE_SAME_SITE: Joi.string()
    .valid('strict', 'lax', 'none')
    .default('lax'),

  // Frontend
  FRONTEND_URL: Joi.string().required(),

  // Rate Limiting
  THROTTLE_TTL: Joi.number().default(60000), // 1 minute
  THROTTLE_LIMIT: Joi.number().default(100),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
  LOG_FILE_ENABLED: Joi.boolean().default(true),
  LOG_FILE_PATH: Joi.string().default('logs'),

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

  // Zyte API Configuration
  ZYTE_API_KEY: Joi.string().required(),
  ZYTE_PROXY_HOST: Joi.string().default('api.zyte.com'),
  ZYTE_PROXY_PORT: Joi.number().default(8011),
  ZYTE_RATE_LIMIT_PER_MINUTE: Joi.number().default(60),
  ZYTE_TIMEOUT_MS: Joi.number().default(30000),
  ZYTE_RETRY_ATTEMPTS: Joi.number().default(3),
  ZYTE_RETRY_DELAY_MS: Joi.number().default(1000),

  // Tracker Refresh Configuration
  TRACKER_REFRESH_INTERVAL_HOURS: Joi.number().default(24),
  TRACKER_BATCH_SIZE: Joi.number().default(100),
  TRACKER_REFRESH_CRON: Joi.string().default('0 2 * * *'),
  TRACKER_MAX_SCRAPING_ATTEMPTS: Joi.number().default(3),
});
