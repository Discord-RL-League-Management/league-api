import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Inject,
  Body,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GuildMembersService } from './guild-members.service';
import { CreateGuildMemberDto } from './dto/create-guild-member.dto';
import { UpdateGuildMemberDto } from './dto/update-guild-member.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import type { ILoggingService } from '../infrastructure/logging/interfaces/logging.interface';

@ApiTags('Guild Members')
@Controller('api/guilds/:guildId/members')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class GuildMembersController {
  private readonly serviceName = GuildMembersController.name;

  constructor(
    private guildMembersService: GuildMembersService,
    @Inject('ILoggingService')
    private readonly loggingService: ILoggingService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get guild members with pagination' })
  @ApiResponse({ status: 200, description: 'List of guild members' })
  @ApiResponse({ status: 401, description: 'Invalid JWT token' })
  @ApiParam({ name: 'guildId', description: 'Discord guild ID' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 50)',
  })
  async getMembers(
    @Param('guildId') guildId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    const parsedPage = parseInt(page, 10);
    const pageNum = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const parsedLimit = parseInt(limit, 10);
    const limitNum = Math.min(
      isNaN(parsedLimit) || parsedLimit < 1 ? 50 : parsedLimit,
      100,
    ); // Max 100 per page

    this.loggingService.log(
      `Getting members for guild ${guildId}, page ${pageNum}`,
      this.serviceName,
    );
    return this.guildMembersService.findAll(guildId, pageNum, limitNum);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search guild members' })
  @ApiResponse({ status: 200, description: 'Search results' })
  @ApiResponse({ status: 401, description: 'Invalid JWT token' })
  @ApiParam({ name: 'guildId', description: 'Discord guild ID' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 20)',
  })
  async searchMembers(
    @Param('guildId') guildId: string,
    @Query('q') query: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const parsedPage = parseInt(page, 10);
    const pageNum = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const parsedLimit = parseInt(limit, 10);
    const limitNum = Math.min(
      isNaN(parsedLimit) || parsedLimit < 1 ? 20 : parsedLimit,
      100,
    );

    this.loggingService.log(
      `Searching members in guild ${guildId} for "${query}"`,
      this.serviceName,
    );
    return this.guildMembersService.searchMembers(
      guildId,
      query,
      pageNum,
      limitNum,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get guild member statistics' })
  @ApiResponse({ status: 200, description: 'Member statistics' })
  @ApiResponse({ status: 401, description: 'Invalid JWT token' })
  @ApiParam({ name: 'guildId', description: 'Discord guild ID' })
  async getMemberStats(@Param('guildId') guildId: string) {
    this.loggingService.log(
      `Getting member stats for guild ${guildId}`,
      this.serviceName,
    );
    return this.guildMembersService.getMemberStats(guildId);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get specific guild member' })
  @ApiResponse({ status: 200, description: 'Guild member details' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  @ApiResponse({ status: 401, description: 'Invalid JWT token' })
  @ApiParam({ name: 'guildId', description: 'Discord guild ID' })
  @ApiParam({ name: 'userId', description: 'Discord user ID' })
  async getMember(
    @Param('guildId') guildId: string,
    @Param('userId') userId: string,
  ) {
    this.loggingService.log(
      `Getting member ${userId} from guild ${guildId}`,
      this.serviceName,
    );
    return this.guildMembersService.findOne(userId, guildId);
  }

  @Post()
  @ApiOperation({ summary: 'Create guild member (admin only)' })
  @ApiResponse({ status: 201, description: 'Member created successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 401, description: 'Invalid JWT token' })
  @ApiParam({ name: 'guildId', description: 'Discord guild ID' })
  async createMember(
    @Param('guildId') guildId: string,
    @Body() createGuildMemberDto: CreateGuildMemberDto,
  ) {
    this.loggingService.log(
      `Creating member in guild ${guildId}`,
      this.serviceName,
    );
    return this.guildMembersService.create({
      ...createGuildMemberDto,
      guildId,
    });
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Update guild member (admin only)' })
  @ApiResponse({ status: 200, description: 'Member updated successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  @ApiResponse({ status: 401, description: 'Invalid JWT token' })
  @ApiParam({ name: 'guildId', description: 'Discord guild ID' })
  @ApiParam({ name: 'userId', description: 'Discord user ID' })
  async updateMember(
    @Param('guildId') guildId: string,
    @Param('userId') userId: string,
    @Body() updateGuildMemberDto: UpdateGuildMemberDto,
  ) {
    this.loggingService.log(
      `Updating member ${userId} in guild ${guildId}`,
      this.serviceName,
    );
    return this.guildMembersService.update(
      userId,
      guildId,
      updateGuildMemberDto,
    );
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Remove guild member (admin only)' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  @ApiResponse({ status: 401, description: 'Invalid JWT token' })
  @ApiParam({ name: 'guildId', description: 'Discord guild ID' })
  @ApiParam({ name: 'userId', description: 'Discord user ID' })
  async removeMember(
    @Param('guildId') guildId: string,
    @Param('userId') userId: string,
  ) {
    this.loggingService.log(
      `Removing member ${userId} from guild ${guildId}`,
      this.serviceName,
    );
    await this.guildMembersService.remove(userId, guildId);
    return { message: 'Member removed successfully' };
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync all guild members (admin only)' })
  @ApiResponse({ status: 200, description: 'Members synced successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 401, description: 'Invalid JWT token' })
  @ApiParam({ name: 'guildId', description: 'Discord guild ID' })
  async syncMembers(
    @Param('guildId') guildId: string,
    @Body()
    syncData: {
      members: Array<{
        userId: string;
        username: string;
        nickname?: string;
        roles: string[];
      }>;
    },
  ) {
    this.loggingService.log(
      `Syncing members for guild ${guildId}`,
      this.serviceName,
    );
    return this.guildMembersService.syncGuildMembers(guildId, syncData.members);
  }
}
