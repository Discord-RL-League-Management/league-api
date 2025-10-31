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
});
