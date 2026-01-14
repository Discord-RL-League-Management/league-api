import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { BotAuthGuard } from '../auth/guards/bot-auth.guard';
import { BotOnly } from '../common/decorators';
import { GuildsService } from './guilds.service';
import { GuildSettingsService } from './guild-settings.service';
import { GuildSyncService } from './services/guild-sync.service';
import { CreateGuildDto } from './dto/create-guild.dto';
import { UpdateGuildDto } from './dto/update-guild.dto';
import { GuildSettingsDto } from './dto/guild-settings.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Internal Guilds')
@Controller('internal/guilds')
@UseGuards(BotAuthGuard)
@SkipThrottle()
@BotOnly()
@ApiBearerAuth('bot-api-key')
export class InternalGuildsController {
  private readonly logger = new Logger(InternalGuildsController.name);

  constructor(
    private guildsService: GuildsService,
    private guildSettingsService: GuildSettingsService,
    private guildSyncService: GuildSyncService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all guilds (bot only)' })
  @ApiResponse({ status: 200, description: 'List of all guilds' })
  @ApiResponse({ status: 401, description: 'Invalid bot API key' })
  async findAll() {
    this.logger.log('Bot requested all guilds');
    return this.guildsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get guild by ID (bot only)' })
  @ApiResponse({ status: 200, description: 'Guild details' })
  @ApiResponse({ status: 404, description: 'Guild not found' })
  @ApiResponse({ status: 401, description: 'Invalid bot API key' })
  @ApiParam({ name: 'id', description: 'Discord guild ID' })
  async findOne(@Param('id') id: string) {
    this.logger.log(`Bot requested guild ${id}`);
    return this.guildsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new guild (bot only)' })
  @ApiResponse({ status: 201, description: 'Guild created successfully' })
  @ApiResponse({ status: 409, description: 'Guild already exists' })
  @ApiResponse({ status: 401, description: 'Invalid bot API key' })
  async create(@Body() createGuildDto: CreateGuildDto) {
    this.logger.log(`Bot creating guild ${createGuildDto.id}`);
    return this.guildsService.create(createGuildDto);
  }

  @Post('upsert')
  @ApiOperation({ summary: 'Upsert guild (create or update) (bot only)' })
  @ApiResponse({ status: 200, description: 'Guild updated successfully' })
  @ApiResponse({ status: 201, description: 'Guild created successfully' })
  @ApiResponse({ status: 401, description: 'Invalid bot API key' })
  async upsert(@Body() createGuildDto: CreateGuildDto, @Res() res: Response) {
    this.logger.log(`Bot upserting guild ${createGuildDto.id}`);

    const exists = await this.guildsService.exists(createGuildDto.id);
    const guild = await this.guildsService.upsert(createGuildDto);

    const statusCode = exists ? HttpStatus.OK : HttpStatus.CREATED;
    return res.status(statusCode).json(guild);
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Atomically sync guild with members (bot only)' })
  @ApiResponse({
    status: 200,
    description: 'Guild and members synced successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Invalid bot API key' })
  @ApiResponse({ status: 404, description: 'Guild not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiParam({ name: 'id', description: 'Discord guild ID' })
  async syncGuildWithMembers(
    @Param('id') guildId: string,
    @Body()
    syncData: {
      guild: CreateGuildDto;
      members: Array<{
        userId: string;
        username: string;
        globalName?: string;
        avatar?: string;
        nickname?: string;
        roles: string[];
      }>;
      roles?: { admin: Array<{ id: string; name: string }> };
    },
  ) {
    this.logger.log(
      `Bot syncing guild ${guildId} with ${syncData.members.length} members`,
    );
    return this.guildSyncService.syncGuildWithMembers(
      guildId,
      syncData.guild,
      syncData.members,
      syncData.roles,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update guild (bot only)' })
  @ApiResponse({ status: 200, description: 'Guild updated successfully' })
  @ApiResponse({ status: 404, description: 'Guild not found' })
  @ApiResponse({ status: 401, description: 'Invalid bot API key' })
  @ApiParam({ name: 'id', description: 'Discord guild ID' })
  async update(
    @Param('id') id: string,
    @Body() updateGuildDto: UpdateGuildDto,
  ) {
    this.logger.log(`Bot updating guild ${id}`);
    return this.guildsService.update(id, updateGuildDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove guild (soft delete) (bot only)' })
  @ApiResponse({ status: 200, description: 'Guild removed successfully' })
  @ApiResponse({ status: 404, description: 'Guild not found' })
  @ApiResponse({ status: 401, description: 'Invalid bot API key' })
  @ApiParam({ name: 'id', description: 'Discord guild ID' })
  async remove(@Param('id') id: string) {
    this.logger.log(`Bot removing guild ${id}`);
    return this.guildsService.remove(id);
  }

  @Get(':id/settings')
  @ApiOperation({ summary: 'Get guild settings (bot only)' })
  @ApiResponse({ status: 200, description: 'Guild settings' })
  @ApiResponse({ status: 404, description: 'Guild not found' })
  @ApiResponse({ status: 401, description: 'Invalid bot API key' })
  @ApiParam({ name: 'id', description: 'Discord guild ID' })
  async getSettings(@Param('id') id: string) {
    this.logger.log(`Bot requested settings for guild ${id}`);
    return this.guildSettingsService.getSettings(id);
  }

  @Patch(':id/settings')
  @ApiOperation({ summary: 'Update guild settings (bot only)' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  @ApiResponse({ status: 404, description: 'Guild not found' })
  @ApiResponse({ status: 401, description: 'Invalid bot API key' })
  @ApiParam({ name: 'id', description: 'Discord guild ID' })
  async updateSettings(
    @Param('id') id: string,
    @Body() settings: GuildSettingsDto,
  ) {
    this.logger.log(`Bot updating settings for guild ${id}`);
    return this.guildSettingsService.updateSettings(id, settings, 'bot');
  }
}
