import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AuthConfig {
  private readonly logger = new Logger(AuthConfig.name);

  constructor() {
    this.validateEnvironmentVariables();
  }

  private validateEnvironmentVariables() {
    const requiredVars = [
      'JWT_SECRET',
      'DISCORD_CLIENT_ID',
      'DISCORD_CLIENT_SECRET',
      'DISCORD_CALLBACK_URL',
      'FRONTEND_URL',
    ];

    const missingVars: string[] = [];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    }

    if (missingVars.length > 0) {
      const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    // Validate JWT secret length
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      this.logger.warn('JWT_SECRET should be at least 32 characters long for security');
    }

    // Validate Discord client ID format
    if (process.env.DISCORD_CLIENT_ID && !/^\d{17,19}$/.test(process.env.DISCORD_CLIENT_ID)) {
      this.logger.warn('DISCORD_CLIENT_ID should be a valid Discord snowflake (17-19 digits)');
    }

    // Validate URLs
    if (process.env.DISCORD_CALLBACK_URL && !this.isValidUrl(process.env.DISCORD_CALLBACK_URL)) {
      this.logger.warn('DISCORD_CALLBACK_URL should be a valid URL');
    }

    if (process.env.FRONTEND_URL && !this.isValidUrl(process.env.FRONTEND_URL)) {
      this.logger.warn('FRONTEND_URL should be a valid URL');
    }

    this.logger.log('Auth configuration validated successfully');
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  getJwtSecret(): string {
    return process.env.JWT_SECRET!;
  }

  getJwtExpiresIn(): string {
    return process.env.JWT_EXPIRES_IN || '7d';
  }

  getDiscordClientId(): string {
    return process.env.DISCORD_CLIENT_ID!;
  }

  getDiscordClientSecret(): string {
    return process.env.DISCORD_CLIENT_SECRET!;
  }

  getDiscordCallbackUrl(): string {
    return process.env.DISCORD_CALLBACK_URL!;
  }

  getFrontendUrl(): string {
    return process.env.FRONTEND_URL!;
  }
}
