import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { BotAuthGuard } from '../auth/guards/bot-auth.guard';
import { PlayerService } from './services/player.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import type { PlayerQueryOptions } from './interfaces/player.interface';
import { ParseCUIDPipe } from '../common/pipes';

/**
 * InternalPlayersController - Bot-only endpoints for full player management
 * Single Responsibility: Bot API endpoints for player CRUD operations
 */
@ApiTags('Internal - Players')
@Controller('internal/players')
@UseGuards(BotAuthGuard)
@SkipThrottle()
export class InternalPlayersController {
  private readonly logger = new Logger(InternalPlayersController.name);

  constructor(private playerService: PlayerService) {}

  @Get()
  @ApiOperation({ summary: 'List all players (Bot only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of players' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Query() query: { page?: number; limit?: number }) {
    return this.playerService.findAll({
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get player by ID (Bot only)' })
  @ApiParam({ name: 'id', description: 'Player ID (CUID)' })
  @ApiResponse({ status: 200, description: 'Player details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Player not found' })
  findOne(@Param('id', ParseCUIDPipe) id: string) {
    return this.playerService.findOne(id, {
      includeUser: true,
      includeGuild: true,
      includePrimaryTracker: true,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create player (Bot only)' })
  @ApiResponse({ status: 201, description: 'Player created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Player already exists' })
  create(@Body() createPlayerDto: CreatePlayerDto) {
    return this.playerService.create(createPlayerDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update player (Bot only)' })
  @ApiParam({ name: 'id', description: 'Player ID (CUID)' })
  @ApiResponse({ status: 200, description: 'Player updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Player not found' })
  update(
    @Param('id', ParseCUIDPipe) id: string,
    @Body() updatePlayerDto: UpdatePlayerDto,
  ) {
    return this.playerService.update(id, updatePlayerDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete player (Bot only)' })
  @ApiParam({ name: 'id', description: 'Player ID (CUID)' })
  @ApiResponse({ status: 200, description: 'Player deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Player not found' })
  delete(@Param('id', ParseCUIDPipe) id: string) {
    return this.playerService.delete(id);
  }

  @Get('guild/:guildId')
  @ApiOperation({ summary: 'List players in guild (Bot only)' })
  @ApiParam({ name: 'guildId', description: 'Discord guild ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of players in guild' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getPlayersByGuild(
    @Param('guildId') guildId: string,
    @Query() query: PlayerQueryOptions,
  ) {
    return this.playerService.findByGuildId(guildId, {
      ...query,
      includeUser: true,
      includeGuild: true,
      includePrimaryTracker: true,
    });
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'List players for user (Bot only)' })
  @ApiParam({ name: 'userId', description: 'Discord user ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of players for user' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getPlayersByUser(
    @Param('userId') userId: string,
    @Query() query: PlayerQueryOptions,
  ) {
    return this.playerService.findByUserId(userId, {
      ...query,
      includeUser: true,
      includeGuild: true,
      includePrimaryTracker: true,
    });
  }
}
