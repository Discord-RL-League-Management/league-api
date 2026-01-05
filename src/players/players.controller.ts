import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PlayerService } from './player.service';
import { Player } from '@prisma/client';
import { GuildAccessValidationService } from '../guilds/services/guild-access-validation.service';
import { UpdatePlayerDto } from './dto/update-player.dto';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';
import type { PlayerQueryOptions } from './interfaces/player.interface';
import { ParseCUIDPipe } from '../common/pipes';

/**
 * PlayersController - User endpoints for accessing player data
 * Single Responsibility: User-facing endpoints for player management
 */
@ApiTags('Players')
@Controller('api/players')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PlayersController {
  constructor(
    private playerService: PlayerService,
    private guildAccessValidationService: GuildAccessValidationService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: "Get current user's players" })
  @ApiResponse({ status: 200, description: 'List of players for current user' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyPlayers(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PlayerQueryOptions,
  ) {
    return this.playerService.findByUserId(user.id, query);
  }

  @Get('guild/:guildId')
  @ApiOperation({ summary: 'List players in a guild' })
  @ApiParam({ name: 'guildId', description: 'Discord guild ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of players in guild' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not a member of guild',
  })
  async getPlayersByGuild(
    @Param('guildId') guildId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PlayerQueryOptions,
  ) {
    // Restrict player listings to guild members to protect user privacy
    await this.guildAccessValidationService.validateUserGuildAccess(
      user.id,
      guildId,
    );

    return this.playerService.findByGuildId(guildId, {
      ...query,
      includeUser: true,
      includeGuild: true,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get player details' })
  @ApiParam({ name: 'id', description: 'Player ID (CUID)' })
  @ApiResponse({ status: 200, description: 'Player details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Player not found' })
  async getPlayer(
    @Param('id', ParseCUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const player = await this.playerService.findOne(id, {
      includeUser: true,
      includeGuild: true,
    });

    if ((player as Player & { userId: string }).userId !== user.id) {
      throw new ForbiddenException('You can only view your own players');
    }

    return player;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update player' })
  @ApiParam({ name: 'id', description: 'Player ID (CUID)' })
  @ApiResponse({ status: 200, description: 'Player updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Player not found' })
  async updatePlayer(
    @Param('id', ParseCUIDPipe) id: string,
    @Body() updatePlayerDto: UpdatePlayerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const player = await this.playerService.findOne(id);

    if ((player as Player & { userId: string }).userId !== user.id) {
      throw new ForbiddenException('You can only update your own players');
    }

    return this.playerService.update(id, updatePlayerDto) as Promise<unknown>;
  }
}
