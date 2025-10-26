import { Injectable, NotFoundException, ConflictException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGuildDto } from './dto/create-guild.dto';
import { UpdateGuildDto } from './dto/update-guild.dto';

@Injectable()
export class GuildsService {
  private readonly logger = new Logger(GuildsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new guild with default settings using transaction
   * Single Responsibility: Guild creation and initialization with atomicity
   */
  async create(createGuildDto: CreateGuildDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Check if guild already exists
        const existingGuild = await tx.guild.findUnique({
          where: { id: createGuildDto.id },
        });

        if (existingGuild) {
          throw new ConflictException(`Guild ${createGuildDto.id} already exists`);
        }

        // Create guild
        const guild = await tx.guild.create({
          data: createGuildDto,
        });

        // Initialize default settings atomically
        await tx.guildSettings.create({
          data: {
            guildId: guild.id,
            settings: this.getDefaultSettings(),
          },
        });

        this.logger.log(`Created guild ${guild.id} with default settings`);
        return guild;
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Failed to create guild ${createGuildDto.id}:`, error);
      throw new InternalServerErrorException('Failed to create guild');
    }
  }

  /**
   * Find all active guilds with pagination
   * Single Responsibility: Guild retrieval with performance optimization
   */
  async findAll(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    const maxLimit = Math.min(limit, 100); // Cap at 100 per page

    try {
      const [guilds, total] = await Promise.all([
        this.prisma.guild.findMany({
          where: { isActive: true },
          include: {
            settings: true,
            _count: {
              select: { members: true },
            },
          },
          orderBy: { joinedAt: 'desc' },
          skip,
          take: maxLimit,
        }),
        this.prisma.guild.count({
          where: { isActive: true },
        }),
      ]);

      return {
        guilds,
        pagination: {
          page,
          limit: maxLimit,
          total,
          pages: Math.ceil(total / maxLimit),
        },
      };
    } catch (error) {
      this.logger.error('Failed to fetch guilds:', error);
      throw new InternalServerErrorException('Failed to fetch guilds');
    }
  }

  /**
   * Find guild by ID with related data and caching
   * Single Responsibility: Single guild retrieval with error handling
   */
  async findOne(id: string) {
    try {
      const guild = await this.prisma.guild.findUnique({
        where: { id },
        include: {
          settings: true,
          members: {
            include: { 
              user: {
                select: {
                  id: true,
                  username: true,
                  globalName: true,
                  avatar: true,
                  lastLoginAt: true,
                },
              },
            },
            take: 10, // Limit members for performance
            orderBy: { joinedAt: 'desc' },
          },
          _count: {
            select: { members: true },
          },
        },
      });

      if (!guild) {
        throw new NotFoundException(`Guild ${id} not found`);
      }

      return guild;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch guild ${id}:`, error);
      throw new InternalServerErrorException('Failed to fetch guild');
    }
  }

  /**
   * Update guild information with validation
   * Single Responsibility: Guild data updates with error handling
   */
  async update(id: string, updateGuildDto: UpdateGuildDto) {
    try {
      // Check if guild exists
      const existingGuild = await this.prisma.guild.findUnique({
        where: { id },
      });

      if (!existingGuild) {
        throw new NotFoundException(`Guild ${id} not found`);
      }

      return await this.prisma.guild.update({
        where: { id },
        data: updateGuildDto,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update guild ${id}:`, error);
      throw new InternalServerErrorException('Failed to update guild');
    }
  }

  /**
   * Soft delete guild (mark as inactive) with cascade handling
   * Single Responsibility: Guild deactivation with proper cleanup
   */
  async remove(id: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Check if guild exists
        const existingGuild = await tx.guild.findUnique({
          where: { id },
        });

        if (!existingGuild) {
          throw new NotFoundException(`Guild ${id} not found`);
        }

        // Soft delete guild
        const updatedGuild = await tx.guild.update({
          where: { id },
          data: { 
            isActive: false,
            leftAt: new Date(),
          },
        });

        // Optionally deactivate all members (soft delete)
        await tx.guildMember.updateMany({
          where: { guildId: id },
          data: { updatedAt: new Date() },
        });

        this.logger.log(`Soft deleted guild ${id}`);
        return updatedGuild;
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to remove guild ${id}:`, error);
      throw new InternalServerErrorException('Failed to remove guild');
    }
  }

  /**
   * Get guild settings with defaults fallback
   * Single Responsibility: Settings retrieval with fallback
   */
  async getSettings(guildId: string) {
    try {
      const settings = await this.prisma.guildSettings.findUnique({
        where: { guildId },
      });

      if (!settings) {
        // Return default settings if none exist
        return { settings: this.getDefaultSettings() };
      }

      return settings;
    } catch (error) {
      this.logger.error(`Failed to get settings for guild ${guildId}:`, error);
      throw new InternalServerErrorException('Failed to get guild settings');
    }
  }

  /**
   * Update guild settings with validation
   * Single Responsibility: Settings updates with validation
   */
  async updateSettings(guildId: string, newSettings: any) {
    try {
      // Validate settings structure
      this.validateSettings(newSettings);

      return await this.prisma.guildSettings.upsert({
        where: { guildId },
        update: { 
          settings: newSettings,
          updatedAt: new Date(),
        },
        create: {
          guildId,
          settings: newSettings,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update settings for guild ${guildId}:`, error);
      throw new InternalServerErrorException('Failed to update guild settings');
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
        admin: null,
        moderator: null,
        member: null,
        league_manager: null,
        tournament_manager: null,
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
   * Validate settings structure
   * Single Responsibility: Settings validation
   */
  private validateSettings(settings: any) {
    if (!settings || typeof settings !== 'object') {
      throw new Error('Settings must be an object');
    }

    // Validate features
    if (settings.features) {
      const validFeatures = ['league_management', 'tournament_mode', 'auto_roles', 'statistics', 'leaderboards'];
      for (const [key, value] of Object.entries(settings.features)) {
        if (!validFeatures.includes(key)) {
          throw new Error(`Invalid feature: ${key}`);
        }
        if (typeof value !== 'boolean') {
          throw new Error(`Feature ${key} must be a boolean`);
        }
      }
    }

    // Validate permissions
    if (settings.permissions) {
      const validPermissions = ['create_leagues', 'manage_teams', 'view_stats', 'manage_tournaments', 'manage_roles', 'view_logs'];
      for (const [key, value] of Object.entries(settings.permissions)) {
        if (!validPermissions.includes(key)) {
          throw new Error(`Invalid permission: ${key}`);
        }
        if (!Array.isArray(value)) {
          throw new Error(`Permission ${key} must be an array`);
        }
      }
    }
  }
}
