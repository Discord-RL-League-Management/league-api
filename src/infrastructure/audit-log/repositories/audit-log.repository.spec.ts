/**
 * AuditLogRepository Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { AuditLogRepository } from './audit-log.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLog } from '@prisma/client';

describe('AuditLogRepository', () => {
  let repository: AuditLogRepository;
  let mockPrisma: PrismaService;

  beforeEach(async () => {
    mockPrisma = {
      auditLog: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
    } as unknown as PrismaService;

    const module = await Test.createTestingModule({
      providers: [
        AuditLogRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<AuditLogRepository>(AuditLogRepository);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('should_create_audit_log_entry_when_valid_data_provided', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-123',
        userId: 'user-123',
        botId: null,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        method: 'POST',
        endpoint: '/api/leagues',
        action: 'create_league',
        resourceType: 'league',
        resourceId: 'league-123',
        requestBody: { name: 'Test League' },
        responseStatus: 201,
        timestamp: new Date(),
      };

      vi.mocked(mockPrisma.auditLog.create).mockResolvedValue(mockAuditLog);

      const result = await repository.create({
        userId: 'user-123',
        ipAddress: '127.0.0.1',
        method: 'POST',
        endpoint: '/api/leagues',
        action: 'create_league',
        resourceType: 'league',
        resourceId: 'league-123',
      });

      expect(result).toEqual(mockAuditLog);
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should_use_transaction_client_when_provided', async () => {
      const mockTx = {
        auditLog: {
          create: vi.fn(),
        },
      };
      const mockAuditLog: AuditLog = {
        id: 'audit-123',
        userId: 'user-123',
        botId: null,
        ipAddress: '127.0.0.1',
        userAgent: null,
        method: 'POST',
        endpoint: '/api/leagues',
        action: 'create_league',
        resourceType: null,
        resourceId: null,
        requestBody: null,
        responseStatus: null,
        timestamp: new Date(),
      };

      vi.mocked(mockTx.auditLog.create).mockResolvedValue(mockAuditLog);

      const result = await repository.create(
        {
          userId: 'user-123',
          ipAddress: '127.0.0.1',
          method: 'POST',
          endpoint: '/api/leagues',
          action: 'create_league',
        },
        mockTx as never,
      );

      expect(result).toEqual(mockAuditLog);
      expect(mockTx.auditLog.create).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });
  });

  describe('findByUser', () => {
    it('should_return_audit_logs_when_user_id_provided', async () => {
      const mockLogs: AuditLog[] = [
        {
          id: 'audit-1',
          userId: 'user-123',
          botId: null,
          ipAddress: '127.0.0.1',
          userAgent: null,
          method: 'POST',
          endpoint: '/api/leagues',
          action: 'create_league',
          resourceType: null,
          resourceId: null,
          requestBody: null,
          responseStatus: 201,
          timestamp: new Date(),
        },
      ];

      vi.mocked(mockPrisma.auditLog.findMany).mockResolvedValue(mockLogs);

      const result = await repository.findByUser('user-123');

      expect(result).toEqual(mockLogs);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
          orderBy: { timestamp: 'desc' },
        }),
      );
    });
  });

  describe('findByBot', () => {
    it('should_return_audit_logs_when_bot_id_provided', async () => {
      const mockLogs: AuditLog[] = [
        {
          id: 'audit-1',
          userId: null,
          botId: 'discord-bot',
          ipAddress: '127.0.0.1',
          userAgent: null,
          method: 'POST',
          endpoint: '/api/users',
          action: 'create_user',
          resourceType: null,
          resourceId: null,
          requestBody: null,
          responseStatus: 201,
          timestamp: new Date(),
        },
      ];

      vi.mocked(mockPrisma.auditLog.findMany).mockResolvedValue(mockLogs);

      const result = await repository.findByBot('discord-bot');

      expect(result).toEqual(mockLogs);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { botId: 'discord-bot' },
        }),
      );
    });
  });

  describe('findByResource', () => {
    it('should_return_audit_logs_when_resource_provided', async () => {
      const mockLogs: AuditLog[] = [
        {
          id: 'audit-1',
          userId: 'user-123',
          botId: null,
          ipAddress: '127.0.0.1',
          userAgent: null,
          method: 'PUT',
          endpoint: '/api/leagues/league-123',
          action: 'update_league',
          resourceType: 'league',
          resourceId: 'league-123',
          requestBody: null,
          responseStatus: 200,
          timestamp: new Date(),
        },
      ];

      vi.mocked(mockPrisma.auditLog.findMany).mockResolvedValue(mockLogs);

      const result = await repository.findByResource('league', 'league-123');

      expect(result).toEqual(mockLogs);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            resourceType: 'league',
            resourceId: 'league-123',
          },
        }),
      );
    });
  });

  describe('findWithFilters', () => {
    it('should_return_filtered_logs_when_filters_provided', async () => {
      const mockLogs: AuditLog[] = [];
      const mockTotal = 0;

      vi.mocked(mockPrisma.auditLog.findMany).mockResolvedValue(mockLogs);
      vi.mocked(mockPrisma.auditLog.count).mockResolvedValue(mockTotal);

      const result = await repository.findWithFilters({
        userId: 'user-123',
        method: 'POST',
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual({ logs: mockLogs, total: mockTotal });
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalled();
      expect(mockPrisma.auditLog.count).toHaveBeenCalled();
    });
  });
});
