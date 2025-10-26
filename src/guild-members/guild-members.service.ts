import { Injectable, NotFoundException, ConflictException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGuildMemberDto } from './dto/create-guild-member.dto';
import { UpdateGuildMemberDto } from './dto/update-guild-member.dto';

@Injectable()
export class GuildMembersService {
  private readonly logger = new Logger(GuildMembersService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create or update guild member with validation
   * Single Responsibility: Member data management with conflict resolution
   */
  async create(createGuildMemberDto: CreateGuildMemberDto) {
    try {
      // Validate guild exists
      const guild = await this.prisma.guild.findUnique({
        where: { id: createGuildMemberDto.guildId },
      });

      if (!guild) {
        throw new NotFoundException(`Guild ${createGuildMemberDto.guildId} not found`);
      }

      // Validate user exists
      const user = await this.prisma.user.findUnique({
        where: { id: createGuildMemberDto.userId },
      });

      if (!user) {
        throw new NotFoundException(`User ${createGuildMemberDto.userId} not found`);
      }

      return await this.prisma.guildMember.upsert({
        where: {
          userId_guildId: {
            userId: createGuildMemberDto.userId,
            guildId: createGuildMemberDto.guildId,
          },
        },
        update: {
          username: createGuildMemberDto.username,
          roles: createGuildMemberDto.roles || [],
          updatedAt: new Date(),
        },
        create: {
          ...createGuildMemberDto,
          roles: createGuildMemberDto.roles || [],
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to create guild member ${createGuildMemberDto.userId}:`, error);
      throw new InternalServerErrorException('Failed to create guild member');
    }
  }

  /**
   * Find all members in a guild with pagination
   * Single Responsibility: Member list retrieval with performance optimization
   */
  async findAll(guildId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    const maxLimit = Math.min(limit, 100); // Cap at 100 per page

    try {
      const [members, total] = await Promise.all([
        this.prisma.guildMember.findMany({
          where: { guildId },
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
          orderBy: { joinedAt: 'desc' },
          skip,
          take: maxLimit,
        }),
        this.prisma.guildMember.count({
          where: { guildId },
        }),
      ]);

      return {
        members,
        pagination: {
          page,
          limit: maxLimit,
          total,
          pages: Math.ceil(total / maxLimit),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to fetch members for guild ${guildId}:`, error);
      throw new InternalServerErrorException('Failed to fetch guild members');
    }
  }

  /**
   * Find specific member in guild with validation
   * Single Responsibility: Single member retrieval with error handling
   */
  async findOne(userId: string, guildId: string) {
    try {
      const member = await this.prisma.guildMember.findUnique({
        where: {
          userId_guildId: {
            userId,
            guildId,
          },
        },
        include: { 
          user: {
            select: {
              id: true,
              username: true,
              globalName: true,
              avatar: true,
              email: true,
              lastLoginAt: true,
            },
          },
        },
      });

      if (!member) {
        throw new NotFoundException(`Member ${userId} not found in guild ${guildId}`);
      }

      return member;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch member ${userId} in guild ${guildId}:`, error);
      throw new InternalServerErrorException('Failed to fetch guild member');
    }
  }

  /**
   * Update guild member with validation
   * Single Responsibility: Member data updates with error handling
   */
  async update(userId: string, guildId: string, updateGuildMemberDto: UpdateGuildMemberDto) {
    try {
      // Check if member exists
      const existingMember = await this.prisma.guildMember.findUnique({
        where: {
          userId_guildId: {
            userId,
            guildId,
          },
        },
      });

      if (!existingMember) {
        throw new NotFoundException(`Member ${userId} not found in guild ${guildId}`);
      }

      return await this.prisma.guildMember.update({
        where: {
          userId_guildId: {
            userId,
            guildId,
          },
        },
        data: {
          ...updateGuildMemberDto,
          updatedAt: new Date(),
        },
        include: { user: true },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update member ${userId} in guild ${guildId}:`, error);
      throw new InternalServerErrorException('Failed to update guild member');
    }
  }

  /**
   * Remove member from guild with validation
   * Single Responsibility: Member removal with error handling
   */
  async remove(userId: string, guildId: string) {
    try {
      // Check if member exists
      const existingMember = await this.prisma.guildMember.findUnique({
        where: {
          userId_guildId: {
            userId,
            guildId,
          },
        },
      });

      if (!existingMember) {
        throw new NotFoundException(`Member ${userId} not found in guild ${guildId}`);
      }

      await this.prisma.guildMember.delete({
        where: {
          userId_guildId: {
            userId,
            guildId,
          },
        },
      });

      this.logger.log(`Removed member ${userId} from guild ${guildId}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to remove member ${userId} from guild ${guildId}:`, error);
      throw new InternalServerErrorException('Failed to remove guild member');
    }
  }

  /**
   * Get user's guild memberships with validation
   * Single Responsibility: User-guild relationship retrieval with error handling
   */
  async getUserGuilds(userId: string) {
    try {
      return await this.prisma.guildMember.findMany({
        where: { userId },
        include: { 
          guild: {
            include: { settings: true },
          },
        },
        orderBy: { joinedAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Failed to get guilds for user ${userId}:`, error);
      throw new InternalServerErrorException('Failed to get user guilds');
    }
  }

  /**
   * Sync all guild members (bulk operation)
   * Single Responsibility: Bulk member synchronization with transaction
   */
  async syncGuildMembers(guildId: string, members: Array<{
    userId: string;
    username: string;
    roles: string[];
  }>) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Validate guild exists
        const guild = await tx.guild.findUnique({
          where: { id: guildId },
        });

        if (!guild) {
          throw new NotFoundException(`Guild ${guildId} not found`);
        }

        // Delete existing members
        await tx.guildMember.deleteMany({
          where: { guildId },
        });

        // Create new members
        const memberData = members.map(member => ({
          userId: member.userId,
          guildId,
          username: member.username,
          roles: member.roles,
        }));

        await tx.guildMember.createMany({
          data: memberData,
        });

        this.logger.log(`Synced ${members.length} members for guild ${guildId}`);
        return { synced: members.length };
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to sync members for guild ${guildId}:`, error);
      throw new InternalServerErrorException('Failed to sync guild members');
    }
  }
}
