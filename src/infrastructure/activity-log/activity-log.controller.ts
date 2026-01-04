import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GuildAdminGuard } from '../../guilds/guards/guild-admin.guard';
import { ActivityLogService } from './services/activity-log.service';
import type { AuthenticatedUser } from '../../common/interfaces/user.interface';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

/**
 * ActivityLogController - Single Responsibility: Handle HTTP requests for activity/audit logs
 *
 * Controller only handles HTTP concerns, delegates to ActivityLogService.
 * Provides query API for audit logs (authorization events).
 */
@ApiTags('Audit Logs')
@Controller('api/guilds/:guildId/audit-logs')
@UseGuards(JwtAuthGuard, GuildAdminGuard)
@ApiBearerAuth('JWT-auth')
export class ActivityLogController {
  private readonly logger = new Logger(ActivityLogController.name);

  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  @ApiOperation({ summary: 'Get audit logs for a guild (admin only)' })
  @ApiResponse({ status: 200, description: 'List of audit logs' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 401, description: 'Invalid JWT token' })
  @ApiParam({ name: 'guildId', description: 'Discord guild ID' })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID',
  })
  @ApiQuery({
    name: 'action',
    required: false,
    description: 'Filter by action type (eventType in ActivityLog)',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for filter',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for filter',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of results (max 100)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Offset for pagination',
  })
  async getAuditLogs(
    @Param('guildId') guildId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.logger.log(
      `User ${user.id} requested audit logs for guild ${guildId}`,
    );

    // Map query params to ActivityLogService filters
    // Note: 'action' query param maps to 'eventType' in ActivityLogService
    const result = await this.activityLogService.findWithFilters({
      guildId,
      userId,
      eventType: action, // 'action' query param maps to eventType
      limit: limit ? Math.min(parseInt(limit, 10), 100) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    // Format response to match previous AuditLogController structure
    return {
      logs: result.logs,
      total: result.total,
      limit: limit ? Math.min(parseInt(limit, 10), 100) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    };
  }
}
