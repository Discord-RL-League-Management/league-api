import { Injectable, BadRequestException } from '@nestjs/common';
import { GuildMembersService } from '../../guild-members/guild-members.service';
import { DiscordValidationService } from '../../discord/discord-validation.service';
import { GuildSettingsDto } from '../dto/guild-settings.dto';
import {
  VALID_CHANNEL_TYPES,
  VALID_ROLE_TYPES,
  VALID_FEATURES,
  VALID_PERMISSIONS,
  VALID_THEMES,
  MAX_ROLE_NAME_LENGTH,
  MAX_CHANNEL_NAME_LENGTH,
  MAX_COMMAND_PREFIX_LENGTH,
} from '../constants/settings.constants';

@Injectable()
export class SettingsValidationService {
  constructor(
    private guildMembersService: GuildMembersService,
    private discordValidation: DiscordValidationService,
  ) {}

  /**
   * Validate settings structure and values with Discord API verification
   * Single Responsibility: Settings validation with Discord API integration
   */
  async validate(settings: GuildSettingsDto, guildId: string): Promise<void> {
    if (settings.channels) {
      await this.validateChannels(settings.channels, guildId);
    }

    if (settings.roles) {
      await this.validateRoles(settings.roles, guildId);
    }

    if (settings.features) {
      this.validateFeatures(settings.features);
    }

    if (settings.permissions) {
      this.validatePermissions(settings.permissions);
    }

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
  private async validateChannels(
    channels: any,
    guildId: string,
  ): Promise<void> {
    for (const [key, value] of Object.entries(channels)) {
      if (!VALID_CHANNEL_TYPES.includes(key)) {
        throw new BadRequestException(`Invalid channel type: ${key}`);
      }

      if (value && typeof value === 'object') {
        const channelValue = value as any;

        if (channelValue.id) {
          if (typeof channelValue.id !== 'string') {
            throw new BadRequestException(
              `Channel ID must be a string: ${key}`,
            );
          }

          if (!/^\d{17,20}$/.test(channelValue.id)) {
            throw new BadRequestException(
              `Invalid Discord channel ID format: ${key}`,
            );
          }

          const isValidChannel = await this.discordValidation.validateChannelId(
            guildId,
            channelValue.id,
          );
          if (!isValidChannel) {
            throw new BadRequestException(
              `Channel ${channelValue.id} does not exist in Discord guild`,
            );
          }
        }

        if (channelValue.name && typeof channelValue.name !== 'string') {
          throw new BadRequestException(
            `Channel name must be a string: ${key}`,
          );
        }

        if (
          channelValue.name &&
          channelValue.name.length > MAX_CHANNEL_NAME_LENGTH
        ) {
          throw new BadRequestException(`Channel name too long: ${key}`);
        }
      }
    }
  }

  /**
   * Validate roles with Discord API verification
   * Single Responsibility: Role validation with Discord API
   */
  private async validateRoles(roles: any, guildId: string): Promise<void> {
    for (const [key, value] of Object.entries(roles)) {
      if (!VALID_ROLE_TYPES.includes(key)) {
        throw new BadRequestException(`Invalid role type: ${key}`);
      }

      if (value && Array.isArray(value)) {
        for (const role of value) {
          if (typeof role !== 'object' || !role.id) {
            throw new BadRequestException(
              `Invalid role object format in ${key}`,
            );
          }

          if (!/^\d{17,20}$/.test(role.id)) {
            throw new BadRequestException(
              `Invalid Discord role ID format in ${key}`,
            );
          }

          const isValidRole = await this.discordValidation.validateRoleId(
            guildId,
            role.id,
          );
          if (!isValidRole) {
            throw new BadRequestException(
              `Role ${role.id} does not exist in Discord guild`,
            );
          }

          if (role.name && typeof role.name !== 'string') {
            throw new BadRequestException(
              `Role name must be a string in ${key}`,
            );
          }

          if (role.name && role.name.length > MAX_ROLE_NAME_LENGTH) {
            throw new BadRequestException(`Role name too long in ${key}`);
          }
        }
      } else if (value !== undefined && value !== null) {
        throw new BadRequestException(`Role ${key} must be an array`);
      }
    }
  }

  /**
   * Validate features configuration
   */
  private validateFeatures(features: any): void {
    for (const [key, value] of Object.entries(features)) {
      if (!VALID_FEATURES.includes(key)) {
        throw new BadRequestException(`Invalid feature: ${key}`);
      }

      if (typeof value !== 'boolean') {
        throw new BadRequestException(`Feature ${key} must be a boolean`);
      }
    }
  }

  /**
   * Validate permissions configuration
   */
  private validatePermissions(permissions: any): void {
    for (const [key, value] of Object.entries(permissions)) {
      if (!VALID_PERMISSIONS.includes(key)) {
        throw new BadRequestException(`Invalid permission: ${key}`);
      }

      if (!Array.isArray(value)) {
        throw new BadRequestException(`Permission ${key} must be an array`);
      }

      for (const role of value) {
        if (typeof role !== 'string') {
          throw new BadRequestException(
            `Permission role must be a string: ${key}`,
          );
        }
      }
    }
  }

  /**
   * Validate display configuration
   */
  private validateDisplay(display: any): void {
    if (display.theme && !VALID_THEMES.includes(display.theme)) {
      throw new BadRequestException(
        `Invalid theme. Must be one of: ${VALID_THEMES.join(', ')}`,
      );
    }

    if (display.command_prefix && typeof display.command_prefix !== 'string') {
      throw new BadRequestException('Command prefix must be a string');
    }

    if (
      display.command_prefix &&
      display.command_prefix.length > MAX_COMMAND_PREFIX_LENGTH
    ) {
      throw new BadRequestException(
        `Command prefix must be ${MAX_COMMAND_PREFIX_LENGTH} characters or less`,
      );
    }
  }

  /**
   * Validate business logic rules
   * Single Responsibility: Business logic validation
   */
  private async validateBusinessRules(
    settings: GuildSettingsDto,
    guildId: string,
  ): Promise<void> {
    // Prevent removing admin role from all users
    if (settings.roles?.admin) {
      const adminRoleIds = settings.roles.admin
        .filter((role) => role.id)
        .map((role) => role.id);

      if (adminRoleIds.length > 0) {
        const adminUsersCount = await this.guildMembersService.countMembersWithRoles(
          guildId,
          adminRoleIds,
        );

        if (adminUsersCount === 0) {
          throw new BadRequestException(
            'Cannot remove admin role from all users',
          );
        }
      }
    }

    // Validate permission dependencies
    if (settings.permissions) {
      this.validatePermissionDependencies(settings.permissions);
    }
  }

  /**
   * Validate permission dependencies
   * Ensures admin role has all critical permissions
   */
  private validatePermissionDependencies(permissions: any): void {
    const adminPermissions = [
      'create_leagues',
      'manage_teams',
      'manage_tournaments',
      'manage_roles',
      'view_logs',
    ];

    for (const permission of adminPermissions) {
      if (
        permissions[permission] &&
        !permissions[permission].includes('admin')
      ) {
        throw new BadRequestException(
          `Admin role must have ${permission} permission`,
        );
      }
    }
  }
}
