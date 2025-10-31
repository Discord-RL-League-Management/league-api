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
});
