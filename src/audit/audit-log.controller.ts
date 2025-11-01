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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuditLogService } from './services/audit-log.service';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/**
 * Audit Log Controller - Single Responsibility: Handle HTTP requests for audit logs
 * 
 * Controller only handles HTTP concerns, delegates to services.
 */
@ApiTags('Audit Logs')
@Controller('api/guilds/:guildId/audit-logs')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth('JWT-auth')
export class AuditLogController {
  private readonly logger = new Logger(AuditLogController.name);

  constructor(private auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'Get audit logs for a guild (admin only)' })
  @ApiResponse({ status: 200, description: 'List of audit logs' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 401, description: 'Invalid JWT token' })
  @ApiParam({ name: 'guildId', description: 'Discord guild ID' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by action type' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for filter' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for filter' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results (max 100)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination' })
  async getAuditLogs(
    @Param('guildId') guildId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    this.logger.log(`User ${user.id} requested audit logs for guild ${guildId}`);

    const filters: any = {};

    if (userId) filters.userId = userId;
    if (action) filters.action = action;
    if (limit) filters.limit = Math.min(parseInt(limit), 100);
    if (offset) filters.offset = parseInt(offset);
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    return this.auditLogService.queryLogs(guildId, filters);
  }
}

