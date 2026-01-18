import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BotAuthGuard } from '../auth/guards/bot-auth.guard';
import { BotOnly } from '../common/decorators';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ParseCUIDPipe } from '../common/pipes';
import { RegisterByStaffDto } from '../internal/dto/register-by-staff.dto';
import { TrackerProcessingService } from '../trackers/services/tracker-processing.service';
import { PermissionCheckService } from '../permissions/modules/permission-check/permission-check.service';
import { GuildSettingsService } from '../guilds/guild-settings.service';
import { DiscordBotService } from '../discord/discord-bot.service';

/**
 * InternalUsersController - Bot-only endpoints for full user management
 * Single Responsibility: Bot API endpoints for user CRUD operations
 */
@ApiTags('Internal Users')
@Controller('internal/users')
@UseGuards(BotAuthGuard)
@SkipThrottle()
@BotOnly()
export class InternalUsersController {
  private readonly logger = new Logger(InternalUsersController.name);

  constructor(
    private usersService: UsersService,
    private trackerProcessingService: TrackerProcessingService,
    private permissionCheckService: PermissionCheckService,
    private guildSettingsService: GuildSettingsService,
    private discordBotService: DiscordBotService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all users (bot only)' })
  @ApiResponse({ status: 200, description: 'List of users' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID (bot only)' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id', ParseCUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create user (bot only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user (bot only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(
    @Param('id', ParseCUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user (bot only)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  delete(@Param('id', ParseCUIDPipe) id: string) {
    return this.usersService.delete(id);
  }

  @Post('register-by-staff')
  @ApiOperation({
    summary: 'Register user with trackers by staff member (bot only)',
    description:
      'Allows staff members to register a user into the system with up to 4 trackers. Validates staff permissions and guild membership.',
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully with trackers',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - staff role or guild membership validation failed',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data or user already has trackers',
  })
  @ApiResponse({ status: 404, description: 'Guild not found' })
  async registerByStaff(@Body() dto: RegisterByStaffDto) {
    // 1. Validate staff member has admin role in guild
    const guildSettings = await this.guildSettingsService.getSettings(
      dto.guildId,
    );

    const staffMember = await this.discordBotService.getGuildMemberByUserId(
      dto.guildId,
      dto.staffUserId,
    );

    if (!staffMember) {
      throw new ForbiddenException(
        `Staff member ${dto.staffUserId} is not a member of guild ${dto.guildId}`,
      );
    }

    const hasAdminRole = await this.permissionCheckService.checkAdminRoles(
      staffMember.roles,
      dto.guildId,
      guildSettings,
      true, // validateWithDiscord
    );

    if (!hasAdminRole) {
      throw new ForbiddenException(
        `Staff member ${dto.staffUserId} does not have admin role in guild ${dto.guildId}`,
      );
    }

    // 2. Validate target user is member of guild
    const targetMember = await this.discordBotService.getGuildMemberByUserId(
      dto.guildId,
      dto.userId,
    );

    if (!targetMember) {
      throw new ForbiddenException(
        `User ${dto.userId} is not a member of guild ${dto.guildId}`,
      );
    }

    // 3. Register trackers (this also ensures user exists)
    const trackers = await this.trackerProcessingService.registerTrackers(
      dto.userId,
      dto.urls,
      dto.userData,
      dto.channelId,
      dto.interactionToken,
    );

    // 4. Get user object
    const user = await this.usersService.findOne(dto.userId);
    if (!user) {
      throw new NotFoundException(
        `User ${dto.userId} not found after registration`,
      );
    }

    // 5. Format response with user and tracker status information
    return {
      user,
      trackers: {
        count: trackers.length,
        items: trackers.map((tracker) => ({
          id: tracker.id,
          url: tracker.url,
          status: tracker.scrapingStatus,
          game: tracker.game,
          platform: tracker.platform,
        })),
      },
    };
  }
}
