import {
  Controller,
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
import { GuildMembersService } from './guild-members.service';
import { CreateGuildMemberDto } from './dto/create-guild-member.dto';
import { UpdateGuildMemberDto } from './dto/update-guild-member.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Internal Guild Members')
@Controller('internal/guild-members')
@UseGuards(BotAuthGuard)
@SkipThrottle()
@ApiBearerAuth('bot-api-key')
export class InternalGuildMembersController {
  private readonly logger = new Logger(InternalGuildMembersController.name);

  constructor(private guildMembersService: GuildMembersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create guild member (bot only)' })
  @ApiResponse({ status: 201, description: 'Member created successfully' })
  @ApiResponse({ status: 404, description: 'Guild or user not found' })
  @ApiResponse({ status: 401, description: 'Invalid bot API key' })
  async createMember(@Body() createMemberDto: CreateGuildMemberDto) {
    this.logger.log(
      `Bot creating member ${createMemberDto.userId} in guild ${createMemberDto.guildId}`,
    );
    return this.guildMembersService.create(createMemberDto);
  }

  @Post(':guildId/sync')
  @ApiOperation({ summary: 'Sync all guild members (bot only)' })
  @ApiResponse({ status: 200, description: 'Members synced successfully' })
  @ApiResponse({ status: 404, description: 'Guild not found' })
  @ApiResponse({ status: 401, description: 'Invalid bot API key' })
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
    this.logger.log(
      `Bot syncing ${syncData.members.length} members for guild ${guildId}`,
    );
    return this.guildMembersService.syncGuildMembers(guildId, syncData.members);
  }

  @Patch(':guildId/users/:userId')
  @ApiOperation({ summary: 'Update guild member (bot only)' })
  @ApiResponse({ status: 200, description: 'Member updated successfully' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  @ApiResponse({ status: 401, description: 'Invalid bot API key' })
  @ApiParam({ name: 'guildId', description: 'Discord guild ID' })
  @ApiParam({ name: 'userId', description: 'Discord user ID' })
  async updateMember(
    @Param('guildId') guildId: string,
    @Param('userId') userId: string,
    @Body() updateMemberDto: UpdateGuildMemberDto,
  ) {
    this.logger.log(`Bot updating member ${userId} in guild ${guildId}`);
    return this.guildMembersService.update(userId, guildId, updateMemberDto);
  }

  @Delete(':guildId/users/:userId')
  @ApiOperation({ summary: 'Remove guild member (bot only)' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  @ApiResponse({ status: 401, description: 'Invalid bot API key' })
  @ApiParam({ name: 'guildId', description: 'Discord guild ID' })
  @ApiParam({ name: 'userId', description: 'Discord user ID' })
  async removeMember(
    @Param('guildId') guildId: string,
    @Param('userId') userId: string,
  ) {
    this.logger.log(`Bot removing member ${userId} from guild ${guildId}`);
    await this.guildMembersService.remove(userId, guildId);
    return { message: 'Member removed successfully' };
  }
}
