import * as Joi from 'joi';

export const configurationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  
  // Database
  DATABASE_URL: Joi.string().required(),
  
  // Bot Authentication
  BOT_API_KEY: Joi.string().required(),
  API_KEY_SALT: Joi.string().required(),
  
  // JWT Authentication
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  
  // Discord OAuth
  DISCORD_CLIENT_ID: Joi.string().required(),
  DISCORD_CLIENT_SECRET: Joi.string().required(),
  DISCORD_CALLBACK_URL: Joi.string().required(),
  
  // Frontend
  FRONTEND_URL: Joi.string().required(),
  
  // Rate Limiting
  THROTTLE_TTL: Joi.number().default(60000), // 1 minute
  THROTTLE_LIMIT: Joi.number().default(100),
  
  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FILE_ENABLED: Joi.boolean().default(true),
  LOG_FILE_PATH: Joi.string().default('logs'),
});










