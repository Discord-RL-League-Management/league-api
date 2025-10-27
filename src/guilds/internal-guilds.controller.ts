import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { BotAuthGuard } from '../auth/guards/bot-auth.guard';
import { GuildsService } from './guilds.service';
import { GuildMembersService } from '../guild-members/guild-members.service';
import { GuildSettingsService } from './guild-settings.service';
import { CreateGuildDto } from './dto/create-guild.dto';
import { UpdateGuildDto } from './dto/update-guild.dto';
import { CreateGuildMemberDto } from '../guild-members/dto/create-guild-member.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

@ApiTags('Internal Guilds')
@Controller('internal/guilds')
@UseGuards(BotAuthGuard)
@SkipThrottle()
@ApiBearerAuth('bot-api-key')
export class InternalGuildsController {
  private readonly logger = new Logger(InternalGuildsController.name);

  constructor(
    private guildsService: GuildsService,
    private guildMembersService: GuildMembersService,
    private guildSettingsService: GuildSettingsService,
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

  @Patch(':id')
  @ApiOperation({ summary: 'Update guild (bot only)' })
  @ApiResponse({ status: 200, description: 'Guild updated successfully' })
  @ApiResponse({ status: 404, description: 'Guild not found' })
  @ApiResponse({ status: 401, description: 'Invalid bot API key' })
  @ApiParam({ name: 'id', description: 'Discord guild ID' })
  async update(@Param('id') id: string, @Body() updateGuildDto: UpdateGuildDto) {
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
  async updateSettings(@Param('id') id: string, @Body() settings: any) {
    this.logger.log(`Bot updating settings for guild ${id}`);
    // Note: Bot endpoints don't have userId, using a placeholder for audit trail
    return this.guildSettingsService.updateSettings(id, settings, 'bot');
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create guild member (bot only)' })
  @ApiResponse({ status: 201, description: 'Member created successfully' })
  @ApiResponse({ status: 404, description: 'Guild or user not found' })
  @ApiResponse({ status: 401, description: 'Invalid bot API key' })
  @ApiParam({ name: 'id', description: 'Discord guild ID' })
  async createMember(@Param('id') id: string, @Body() createMemberDto: CreateGuildMemberDto) {
    this.logger.log(`Bot creating member ${createMemberDto.userId} in guild ${id}`);
    return this.guildMembersService.create({
      ...createMemberDto,
      guildId: id,
    });
  }

  @Post(':id/members/sync')
  @ApiOperation({ summary: 'Sync all guild members (bot only)' })
  @ApiResponse({ status: 200, description: 'Members synced successfully' })
  @ApiResponse({ status: 404, description: 'Guild not found' })
  @ApiResponse({ status: 401, description: 'Invalid bot API key' })
  @ApiParam({ name: 'id', description: 'Discord guild ID' })
  async syncMembers(
    @Param('id') id: string,
    @Body() syncData: { members: Array<{ userId: string; username: string; roles: string[] }> },
  ) {
    this.logger.log(`Bot syncing ${syncData.members.length} members for guild ${id}`);
    return this.guildMembersService.syncGuildMembers(id, syncData.members);
  }
}
