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
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { BotAuthGuard } from '../auth/guards/bot-auth.guard';
import { BotOnly } from '../common/decorators';
import { LeaguesService } from './leagues.service';
import { LeagueSettingsService } from './league-settings.service';
import { CreateLeagueDto } from './dto/create-league.dto';
import { UpdateLeagueDto } from './dto/update-league.dto';
import { LeagueSettingsDto } from './dto/league-settings.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ParseCUIDPipe } from '../common/pipes';

@ApiTags('Internal Leagues')
@Controller('internal/leagues')
@UseGuards(BotAuthGuard)
@SkipThrottle()
@BotOnly()
@ApiBearerAuth('bot-api-key')
export class InternalLeaguesController {
  private readonly logger = new Logger(InternalLeaguesController.name);

  constructor(
    private leaguesService: LeaguesService,
    private leagueSettingsService: LeagueSettingsService,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get league by ID (bot only)' })
  @ApiResponse({ status: 200, description: 'League details' })
  @ApiResponse({ status: 404, description: 'League not found' })
  @ApiResponse({ status: 401, description: 'Invalid bot API key' })
  @ApiParam({ name: 'id', description: 'League ID' })
  async findOne(@Param('id', ParseCUIDPipe) id: string) {
    this.logger.log(`Bot requested league ${id}`);
    return this.leaguesService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create league (bot only)' })
  @ApiResponse({ status: 201, description: 'League created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Invalid bot API key' })
  async create(
    @Body() createLeagueDto: CreateLeagueDto & { createdBy: string },
  ) {
    this.logger.log(`Bot creating league ${createLeagueDto.name}`);
    return this.leaguesService.create(
      createLeagueDto,
      createLeagueDto.createdBy || 'bot',
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update league (bot only)' })
  @ApiResponse({ status: 200, description: 'League updated successfully' })
  @ApiResponse({ status: 404, description: 'League not found' })
  @ApiResponse({ status: 401, description: 'Invalid bot API key' })
  @ApiParam({ name: 'id', description: 'League ID' })
  async update(
    @Param('id', ParseCUIDPipe) id: string,
    @Body() updateLeagueDto: UpdateLeagueDto,
  ) {
    this.logger.log(`Bot updating league ${id}`);
    return this.leaguesService.update(id, updateLeagueDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete league (bot only)' })
  @ApiResponse({ status: 200, description: 'League deleted successfully' })
  @ApiResponse({ status: 404, description: 'League not found' })
  @ApiResponse({ status: 401, description: 'Invalid bot API key' })
  @ApiParam({ name: 'id', description: 'League ID' })
  async remove(@Param('id', ParseCUIDPipe) id: string) {
    this.logger.log(`Bot deleting league ${id}`);
    return this.leaguesService.remove(id);
  }

  @Get(':id/settings')
  @ApiOperation({ summary: 'Get league settings (bot only)' })
  @ApiResponse({ status: 200, description: 'League settings' })
  @ApiResponse({ status: 404, description: 'League not found' })
  @ApiResponse({ status: 401, description: 'Invalid bot API key' })
  @ApiParam({ name: 'id', description: 'League ID' })
  async getSettings(@Param('id', ParseCUIDPipe) id: string) {
    this.logger.log(`Bot requested settings for league ${id}`);
    return this.leagueSettingsService.getSettings(id);
  }

  @Patch(':id/settings')
  @ApiOperation({ summary: 'Update league settings (bot only)' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  @ApiResponse({ status: 404, description: 'League not found' })
  @ApiResponse({ status: 401, description: 'Invalid bot API key' })
  @ApiParam({ name: 'id', description: 'League ID' })
  async updateSettings(
    @Param('id', ParseCUIDPipe) id: string,
    @Body() settings: LeagueSettingsDto,
  ) {
    this.logger.log(`Bot updating settings for league ${id}`);
    return this.leagueSettingsService.updateSettings(id, settings);
  }
}
