import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { BotAuthGuard } from '../auth/guards/bot-auth.guard';
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
import type { ILoggingService } from '../infrastructure/logging/interfaces/logging.interface';

@ApiTags('Internal Leagues')
@Controller('internal/leagues')
@UseGuards(BotAuthGuard)
@SkipThrottle()
@ApiBearerAuth('bot-api-key')
export class InternalLeaguesController {
  private readonly serviceName = InternalLeaguesController.name;

  constructor(
    private leaguesService: LeaguesService,
    private leagueSettingsService: LeagueSettingsService,
    @Inject('ILoggingService')
    private readonly loggingService: ILoggingService,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get league by ID (bot only)' })
  @ApiResponse({ status: 200, description: 'League details' })
  @ApiResponse({ status: 404, description: 'League not found' })
  @ApiResponse({ status: 401, description: 'Invalid bot API key' })
  @ApiParam({ name: 'id', description: 'League ID' })
  async findOne(@Param('id', ParseCUIDPipe) id: string) {
    this.loggingService.log(`Bot requested league ${id}`, this.serviceName);
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
    this.loggingService.log(
      `Bot creating league ${createLeagueDto.name}`,
      this.serviceName,
    );
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
    this.loggingService.log(`Bot updating league ${id}`, this.serviceName);
    return this.leaguesService.update(id, updateLeagueDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete league (bot only)' })
  @ApiResponse({ status: 200, description: 'League deleted successfully' })
  @ApiResponse({ status: 404, description: 'League not found' })
  @ApiResponse({ status: 401, description: 'Invalid bot API key' })
  @ApiParam({ name: 'id', description: 'League ID' })
  async remove(@Param('id', ParseCUIDPipe) id: string) {
    this.loggingService.log(`Bot deleting league ${id}`, this.serviceName);
    return this.leaguesService.remove(id);
  }

  @Get(':id/settings')
  @ApiOperation({ summary: 'Get league settings (bot only)' })
  @ApiResponse({ status: 200, description: 'League settings' })
  @ApiResponse({ status: 404, description: 'League not found' })
  @ApiResponse({ status: 401, description: 'Invalid bot API key' })
  @ApiParam({ name: 'id', description: 'League ID' })
  async getSettings(@Param('id', ParseCUIDPipe) id: string) {
    this.loggingService.log(
      `Bot requested settings for league ${id}`,
      this.serviceName,
    );
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
    this.loggingService.log(
      `Bot updating settings for league ${id}`,
      this.serviceName,
    );
    return this.leagueSettingsService.updateSettings(id, settings);
  }
}
