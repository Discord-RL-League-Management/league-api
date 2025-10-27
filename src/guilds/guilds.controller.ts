import { Controller, Get, Param, UseGuards, ForbiddenException, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GuildsService } from './guilds.service';
import { GuildMembersService } from '../guild-members/guild-members.service';
import { PermissionService } from '../permissions/permission.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

@ApiTags('Guilds')
@Controller('api/guilds')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class GuildsController {
  private readonly logger = new Logger(GuildsController.name);

  constructor(
    private guildsService: GuildsService,
    private guildMembersService: GuildMembersService,
    private permissionService: PermissionService,
  ) {}

  @Get('my-guilds')
  @ApiOperation({ summary: 'Get user\'s guilds' })
  @ApiResponse({ status: 200, description: 'List of user\'s guilds' })
  @ApiResponse({ status: 401, description: 'Invalid JWT token' })
  async getMyGuilds(@CurrentUser() user) {
    this.logger.log(`User ${user.id} requested their guilds`);
    return this.guildMembersService.getUserGuilds(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get guild details' })
  @ApiResponse({ status: 200, description: 'Guild details' })
  @ApiResponse({ status: 403, description: 'Not a member of this guild' })
  @ApiResponse({ status: 404, description: 'Guild not found' })
  @ApiResponse({ status: 401, description: 'Invalid JWT token' })
  @ApiParam({ name: 'id', description: 'Discord guild ID' })
  async getGuild(@Param('id') id: string, @CurrentUser() user) {
    this.logger.log(`User ${user.id} requested guild ${id}`);
    
    // Verify user is member of this guild
    const membership = await this.guildMembersService.findOne(user.id, id);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this guild');
    }

    return this.guildsService.findOne(id);
  }

  @Get(':id/settings')
  @ApiOperation({ summary: 'Get guild settings (admin only)' })
  @ApiResponse({ status: 200, description: 'Guild settings' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Guild not found' })
  @ApiResponse({ status: 401, description: 'Invalid JWT token' })
  @ApiParam({ name: 'id', description: 'Discord guild ID' })
  async getGuildSettings(@Param('id') id: string, @CurrentUser() user) {
    this.logger.log(`User ${user.id} requested settings for guild ${id}`);
    
    // Verify user has admin permissions in this guild
    const membership = await this.guildMembersService.findOne(user.id, id);
    
    // Get guild with settings for admin check
    const guild = await this.guildsService.findOne(id);
    
    const isAdmin = membership 
      ? await this.permissionService.checkAdminRoles(
          membership.roles,
          id,
          guild.settings?.settings,
          true // Validate with Discord for authorization
        )
      : false;

    if (!membership || !isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    return this.guildsService.getSettings(id);
  }
}
