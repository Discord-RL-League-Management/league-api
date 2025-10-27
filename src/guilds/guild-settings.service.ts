import { Injectable, NotFoundException, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscordValidationService } from '../discord/discord-validation.service';
import { GuildSettingsDto } from './dto/guild-settings.dto';
import { Inject } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class GuildSettingsService {
  private readonly logger = new Logger(GuildSettingsService.name);

  constructor(
    private prisma: PrismaService,
    private discordValidation: DiscordValidationService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Get guild settings with caching and defaults
   * Single Responsibility: Settings retrieval with caching and fallback defaults
   */
  async getSettings(guildId: string) {
    try {
      // Check cache first
      const cacheKey = `settings:${guildId}`;
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.logger.log(`Settings cache hit for guild ${guildId}`);
        return cached;
      }

      const settings = await this.prisma.guildSettings.findUnique({
        where: { guildId },
      });

      let result;
      if (!settings) {
        // Return default settings if none exist
        result = this.getDefaultSettings();
      } else {
        // Merge with defaults to ensure all fields exist
        result = this.mergeWithDefaults(settings.settings as any);
      }

      // Cache the result
      await this.cacheManager.set(cacheKey, result, 300000); // 5 minutes TTL
      
      return result;
    } catch (error) {
      this.logger.error(`Error getting settings for guild ${guildId}:`, error);
      throw new NotFoundException(`Settings for guild ${guildId} not found`);
    }
  }

  /**
   * Update guild settings with validation and transaction management
   * Single Responsibility: Settings updates with validation and atomic operations
   */
  async updateSettings(guildId: string, newSettings: GuildSettingsDto, userId: string) {
    try {
      // Validate settings with Discord API
      await this.validateSettings(newSettings, guildId);

      // Use transaction for atomic operations
      const result = await this.prisma.$transaction(async (tx) => {
        // Get current settings
        const currentSettings = await tx.guildSettings.findUnique({
          where: { guildId },
        });

        let mergedSettings;
        if (currentSettings) {
          mergedSettings = this.mergeSettings(currentSettings.settings as any, newSettings);
        } else {
          mergedSettings = this.mergeSettings(this.getDefaultSettings(), newSettings);
        }

        // Update in database
        const updatedSettings = await tx.guildSettings.upsert({
          where: { guildId },
          update: {
            settings: mergedSettings,
            updatedAt: new Date(),
          },
          create: {
            guildId,
            settings: mergedSettings,
          },
        });

        // Create history entry
        await tx.settingsHistory.create({
          data: {
            guildId,
            userId,
            action: 'update',
            changes: newSettings as any,
            timestamp: new Date(),
          },
        });

        return updatedSettings;
      });

      // Invalidate cache
      await this.cacheManager.del(`settings:${guildId}`);

      this.logger.log(`Updated settings for guild ${guildId} by user ${userId}`);
      return result;
    } catch (error) {
      this.logger.error(`Error updating settings for guild ${guildId}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update settings');
    }
  }

  /**
   * Reset settings to defaults with transaction management
   * Single Responsibility: Settings reset functionality with audit trail
   */
  async resetSettings(guildId: string, userId: string) {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const defaultSettings = this.getDefaultSettings();

        const updatedSettings = await tx.guildSettings.upsert({
          where: { guildId },
          update: {
            settings: defaultSettings,
            updatedAt: new Date(),
          },
          create: {
            guildId,
            settings: defaultSettings,
          },
        });

        // Create history entry
        await tx.settingsHistory.create({
          data: {
            guildId,
            userId,
            action: 'reset',
            changes: { reset: true } as any,
            timestamp: new Date(),
          },
        });

        return updatedSettings;
      });

      // Invalidate cache
      await this.cacheManager.del(`settings:${guildId}`);

      this.logger.log(`Reset settings to defaults for guild ${guildId} by user ${userId}`);
      return result;
    } catch (error) {
      this.logger.error(`Error resetting settings for guild ${guildId}:`, error);
      throw new InternalServerErrorException('Failed to reset settings');
    }
  }

  /**
   * Get settings history for audit trail
   * Single Responsibility: Settings history retrieval
   */
  async getSettingsHistory(guildId: string, limit: number = 50) {
    try {
      return this.prisma.settingsHistory.findMany({
        where: { guildId },
        orderBy: { timestamp: 'desc' },
        take: limit,
        include: {
          user: {
            select: { username: true, globalName: true },
          },
        },
      });
    } catch (error) {
      this.logger.error(`Error getting settings history for guild ${guildId}:`, error);
      throw new InternalServerErrorException('Failed to get settings history');
    }
  }

  /**
   * Get default settings structure
   * Single Responsibility: Default settings definition
   */
  private getDefaultSettings() {
    return {
      channels: {
        general: null,
        announcements: null,
        league_chat: null,
        tournament_chat: null,
        logs: null,
      },
      roles: {
        admin: [],
        moderator: [],
        member: [],
        league_manager: [],
        tournament_manager: [],
      },
      features: {
        league_management: true,
        tournament_mode: false,
        auto_roles: false,
        statistics: true,
        leaderboards: true,
      },
      permissions: {
        create_leagues: ['admin'],
        manage_teams: ['admin'],
        view_stats: ['member'],
        manage_tournaments: ['admin'],
        manage_roles: ['admin'],
        view_logs: ['admin', 'moderator'],
      },
      display: {
        show_leaderboards: true,
        show_member_count: false,
        theme: 'default',
        command_prefix: '!',
      },
    };
  }

  /**
   * Merge new settings with defaults
   * Single Responsibility: Settings merging logic
   */
  private mergeWithDefaults(settings: any) {
    const defaults = this.getDefaultSettings();
    return this.deepMerge(defaults, settings);
  }

  /**
   * Merge new settings with current settings
   * Single Responsibility: Settings update merging
   */
  private mergeSettings(current: any, newSettings: GuildSettingsDto) {
    return this.deepMerge(current, newSettings);
  }

  /**
   * Deep merge two objects
   * Single Responsibility: Object merging utility
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Validate settings structure and values with Discord API verification
   * Single Responsibility: Settings validation with Discord API integration
   */
  private async validateSettings(settings: GuildSettingsDto, guildId: string) {
    // Validate channels with Discord API
    if (settings.channels) {
      await this.validateChannels(settings.channels, guildId);
    }

    // Validate roles with Discord API
    if (settings.roles) {
      await this.validateRoles(settings.roles, guildId);
    }

    // Validate features
    if (settings.features) {
      this.validateFeatures(settings.features);
    }

    // Validate permissions
    if (settings.permissions) {
      this.validatePermissions(settings.permissions);
    }

    // Validate display
    if (settings.display) {
      this.validateDisplay(settings.display);
    }

    // Validate business logic
    await this.validateBusinessRules(settings, guildId);
  }

  /**
   * Validate channels with Discord API verification
   * Single Responsibility: Channel validation with Discord API
   */
  private async validateChannels(channels: any, guildId: string) {
    const validChannelTypes = ['general', 'announcements', 'league_chat', 'tournament_chat', 'logs'];
    
    for (const [key, value] of Object.entries(channels)) {
      if (!validChannelTypes.includes(key)) {
        throw new BadRequestException(`Invalid channel type: ${key}`);
      }
      
      if (value && typeof value === 'object') {
        const channelValue = value as any;
        if (channelValue.id && typeof channelValue.id !== 'string') {
          throw new BadRequestException(`Channel ID must be a string: ${key}`);
        }
        
        // Validate Discord ID format
        if (channelValue.id && !/^\d{17,20}$/.test(channelValue.id)) {
          throw new BadRequestException(`Invalid Discord channel ID format: ${key}`);
        }
        
        // Validate channel exists in Discord
        if (channelValue.id) {
          const isValidChannel = await this.discordValidation.validateChannelId(guildId, channelValue.id);
          if (!isValidChannel) {
            throw new BadRequestException(`Channel ${channelValue.id} does not exist in Discord guild`);
          }
        }
        
        if (channelValue.name && typeof channelValue.name !== 'string') {
          throw new BadRequestException(`Channel name must be a string: ${key}`);
        }
      }
    }
  }

  /**
   * Validate roles with Discord API verification
   * Single Responsibility: Role validation with Discord API
   */
  private async validateRoles(roles: any, guildId: string) {
    const validRoleTypes = ['admin', 'moderator', 'member', 'league_manager', 'tournament_manager'];
    
    for (const [key, value] of Object.entries(roles)) {
      if (!validRoleTypes.includes(key)) {
        throw new BadRequestException(`Invalid role type: ${key}`);
      }
      
      // Validate array of role objects
      if (value && Array.isArray(value)) {
        for (const role of value) {
          if (typeof role !== 'object' || !(role as any).id) {
            throw new BadRequestException(`Invalid role object format in ${key}`);
          }
          
          // Validate Discord ID format
          if (!/^\d{17,20}$/.test((role as any).id)) {
            throw new BadRequestException(`Invalid Discord role ID format in ${key}`);
          }
          
          // Validate role exists in Discord
          const isValidRole = await this.discordValidation.validateRoleId(guildId, (role as any).id);
          if (!isValidRole) {
            throw new BadRequestException(`Role ${(role as any).id} does not exist in Discord guild`);
          }
          
          if ((role as any).name && typeof (role as any).name !== 'string') {
            throw new BadRequestException(`Role name must be a string in ${key}`);
          }
        }
      } else if (value !== undefined && value !== null) {
        throw new BadRequestException(`Role ${key} must be an array`);
      }
    }
  }

  /**
   * Validate business logic rules
   * Single Responsibility: Business logic validation
   */
  private async validateBusinessRules(settings: GuildSettingsDto, guildId: string) {
    // No business rules to validate yet
    // This can be expanded later as needed
  }

  private validateFeatures(features: any) {
    const validFeatures = ['league_management', 'tournament_mode', 'auto_roles', 'statistics', 'leaderboards'];
    
    for (const [key, value] of Object.entries(features)) {
      if (!validFeatures.includes(key)) {
        throw new BadRequestException(`Invalid feature: ${key}`);
      }
      
      if (typeof value !== 'boolean') {
        throw new BadRequestException(`Feature ${key} must be a boolean`);
      }
    }
  }

  private validatePermissions(permissions: any) {
    const validPermissions = ['create_leagues', 'manage_teams', 'view_stats', 'manage_tournaments', 'manage_roles', 'view_logs'];
    
    for (const [key, value] of Object.entries(permissions)) {
      if (!validPermissions.includes(key)) {
        throw new BadRequestException(`Invalid permission: ${key}`);
      }
      
      if (!Array.isArray(value)) {
        throw new BadRequestException(`Permission ${key} must be an array`);
      }
      
      for (const role of value) {
        if (typeof role !== 'string') {
          throw new BadRequestException(`Permission role must be a string: ${key}`);
        }
      }
    }
  }

  private validateDisplay(display: any) {
    if (display.theme && !['default', 'dark', 'light'].includes(display.theme)) {
      throw new BadRequestException('Invalid theme. Must be: default, dark, or light');
    }
    
    if (display.command_prefix && typeof display.command_prefix !== 'string') {
      throw new BadRequestException('Command prefix must be a string');
    }
    
    if (display.command_prefix && display.command_prefix.length > 5) {
      throw new BadRequestException('Command prefix must be 5 characters or less');
    }
  }
}

