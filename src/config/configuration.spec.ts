import configuration from './configuration';

describe('Configuration', () => {
  let config: ReturnType<typeof configuration>;

  beforeEach(() => {
    // Reset environment variables
    delete process.env.NODE_ENV;
    delete process.env.PORT;
    delete process.env.DATABASE_URL;
    delete process.env.BOT_API_KEY;
    delete process.env.API_KEY_SALT;
    delete process.env.JWT_SECRET;
    delete process.env.JWT_EXPIRES_IN;
    delete process.env.DISCORD_CLIENT_ID;
    delete process.env.DISCORD_CLIENT_SECRET;
    delete process.env.DISCORD_CALLBACK_URL;
    delete process.env.FRONTEND_URL;
    delete process.env.THROTTLE_TTL;
    delete process.env.THROTTLE_LIMIT;
  });

  describe('default values', () => {
    it('should use default values when environment variables are not set', () => {
      config = configuration();

      expect(config.app.nodeEnv).toBe('development');
      expect(config.app.port).toBe(3000);
      expect(config.auth.jwtExpiresIn).toBe('7d');
      expect(config.throttler.ttl).toBe(60000);
      expect(config.throttler.limit).toBe(100);
    });
  });

  describe('environment variable parsing', () => {
    it('should parse string environment variables correctly', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      process.env.BOT_API_KEY = 'test-api-key';
      process.env.API_KEY_SALT = 'test-salt';
      process.env.JWT_SECRET = 'test-jwt-secret';
      process.env.DISCORD_CLIENT_ID = 'test-client-id';
      process.env.DISCORD_CLIENT_SECRET = 'test-client-secret';
      process.env.DISCORD_CALLBACK_URL =
        'http://localhost:3000/auth/discord/callback';
      process.env.FRONTEND_URL = 'http://localhost:5173';

      config = configuration();

      expect(config.app.nodeEnv).toBe('production');
      expect(config.database.url).toBe(
        'postgresql://test:test@localhost:5432/test',
      );
      expect(config.auth.botApiKey).toBe('test-api-key');
      expect(config.auth.apiKeySalt).toBe('test-salt');
      expect(config.auth.jwtSecret).toBe('test-jwt-secret');
      expect(config.discord.clientId).toBe('test-client-id');
      expect(config.discord.clientSecret).toBe('test-client-secret');
      expect(config.discord.callbackUrl).toBe(
        'http://localhost:3000/auth/discord/callback',
      );
      expect(config.frontend.url).toBe('http://localhost:5173');
    });

    it('should parse numeric environment variables correctly', () => {
      process.env.PORT = '8080';
      process.env.THROTTLE_TTL = '30000';
      process.env.THROTTLE_LIMIT = '50';

      config = configuration();

      expect(config.app.port).toBe(8080);
      expect(config.throttler.ttl).toBe(30000);
      expect(config.throttler.limit).toBe(50);
    });
  });

  describe('configuration structure', () => {
    beforeEach(() => {
      config = configuration();
    });

    it('should have all required configuration sections', () => {
      expect(config).toHaveProperty('app');
      expect(config).toHaveProperty('database');
      expect(config).toHaveProperty('auth');
      expect(config).toHaveProperty('discord');
      expect(config).toHaveProperty('frontend');
      expect(config).toHaveProperty('throttler');
    });

    it('should have correct app configuration structure', () => {
      expect(config.app).toHaveProperty('nodeEnv');
      expect(config.app).toHaveProperty('port');
    });

    it('should have correct auth configuration structure', () => {
      expect(config.auth).toHaveProperty('botApiKey');
      expect(config.auth).toHaveProperty('apiKeySalt');
      expect(config.auth).toHaveProperty('jwtSecret');
      expect(config.auth).toHaveProperty('jwtExpiresIn');
    });

    it('should have correct discord configuration structure', () => {
      expect(config.discord).toHaveProperty('clientId');
      expect(config.discord).toHaveProperty('clientSecret');
      expect(config.discord).toHaveProperty('callbackUrl');
    });

    it('should have correct throttler configuration structure', () => {
      expect(config.throttler).toHaveProperty('ttl');
      expect(config.throttler).toHaveProperty('limit');
    });
  });
});
