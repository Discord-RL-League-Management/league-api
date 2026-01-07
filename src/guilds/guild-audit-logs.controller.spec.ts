/**
 * GuildAuditLogsController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { GuildAuditLogsController } from './guild-audit-logs.controller';
import { ActivityLogService } from '../infrastructure/activity-log/services/activity-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GuildAdminGuard } from './guards/guild-admin.guard';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';

describe('GuildAuditLogsController', () => {
  let controller: GuildAuditLogsController;
  let mockActivityLogService: ActivityLogService;

  const mockUser: AuthenticatedUser = {
    id: 'user-123',
    username: 'testuser',
    globalName: 'Test User',
    avatar: 'avatar_hash',
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  beforeEach(async () => {
    mockActivityLogService = {
      findWithFilters: vi.fn(),
    } as unknown as ActivityLogService;

    const module = await Test.createTestingModule({
      controllers: [GuildAuditLogsController],
      providers: [
        { provide: ActivityLogService, useValue: mockActivityLogService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: vi.fn().mockReturnValue(true),
      } as unknown as JwtAuthGuard)
      .overrideGuard(GuildAdminGuard)
      .useValue({
        canActivate: vi.fn().mockReturnValue(true),
      } as unknown as GuildAdminGuard)
      .compile();

    controller = module.get<GuildAuditLogsController>(GuildAuditLogsController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAuditLogs', () => {
    it('should_return_audit_logs_when_filters_provided', async () => {
      const mockResult = { logs: [], total: 0 };
      vi.mocked(mockActivityLogService.findWithFilters).mockResolvedValue(
        mockResult as never,
      );

      const result = await controller.getAuditLogs(
        'guild-1',
        mockUser,
        'user-1',
        'action',
      );

      expect(result.logs).toEqual([]);
      expect(result.total).toBe(0);
      expect(mockActivityLogService.findWithFilters).toHaveBeenCalled();
    });

    it('should_limit_results_to_max_100', async () => {
      const mockResult = { logs: [], total: 0 };
      vi.mocked(mockActivityLogService.findWithFilters).mockResolvedValue(
        mockResult as never,
      );

      await controller.getAuditLogs(
        'guild-1',
        mockUser,
        undefined,
        undefined,
        undefined,
        undefined,
        '200',
      );

      expect(mockActivityLogService.findWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100 }),
      );
    });

    it('should_use_default_limit_when_not_provided', async () => {
      const mockResult = { logs: [], total: 0 };
      vi.mocked(mockActivityLogService.findWithFilters).mockResolvedValue(
        mockResult as never,
      );

      const result = await controller.getAuditLogs('guild-1', mockUser);

      expect(result.limit).toBe(50);
      expect(mockActivityLogService.findWithFilters).toHaveBeenCalled();
    });
  });
});
