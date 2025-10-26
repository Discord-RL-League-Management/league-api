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
  },
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    callbackUrl: process.env.DISCORD_CALLBACK_URL || '',
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
});
