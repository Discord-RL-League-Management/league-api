/**
 * AuditLogService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { AuditLogService } from './audit-log.service';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLog } from '@prisma/client';
import type { CreateAuditLogInput } from '../interfaces/audit-log.interface';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let mockRepository: AuditLogRepository;
  let mockPrisma: PrismaService;

  beforeEach(async () => {
    mockRepository = {
      create: vi.fn(),
      findByUser: vi.fn(),
      findByBot: vi.fn(),
      findByResource: vi.fn(),
      findWithFilters: vi.fn(),
    } as unknown as AuditLogRepository;

    mockPrisma = {
      $transaction: vi.fn(),
    } as unknown as PrismaService;

    const module = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: AuditLogRepository, useValue: mockRepository },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logAuditEntry', () => {
    it('should_create_audit_log_entry_when_valid_data_provided', async () => {
      const auditData: CreateAuditLogInput = {
        userId: 'user-123',
        ipAddress: '127.0.0.1',
        method: 'POST',
        endpoint: '/api/leagues',
        action: 'create_league',
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

      const mockTx = {
        auditLog: {
          create: vi.fn().mockResolvedValue(mockAuditLog),
        },
      };

      // Mock repository.create to return the mock audit log
      vi.mocked(mockRepository.create).mockResolvedValue(mockAuditLog);

      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          return callback(mockTx as never);
        },
      );

      const result = await service.logAuditEntry(auditData);

      expect(result).toEqual(mockAuditLog);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should_log_error_when_creation_fails', async () => {
      const auditData: CreateAuditLogInput = {
        userId: 'user-123',
        ipAddress: '127.0.0.1',
        method: 'POST',
        endpoint: '/api/leagues',
        action: 'create_league',
      };

      const error = new Error('Database error');
      vi.mocked(mockPrisma.$transaction).mockRejectedValue(error);

      await expect(service.logAuditEntry(auditData)).rejects.toThrow(error);
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

      vi.mocked(mockRepository.findByUser).mockResolvedValue(mockLogs);

      const result = await service.findByUser('user-123');

      expect(result).toEqual(mockLogs);
      expect(mockRepository.findByUser).toHaveBeenCalledWith(
        'user-123',
        undefined,
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

      vi.mocked(mockRepository.findByBot).mockResolvedValue(mockLogs);

      const result = await service.findByBot('discord-bot');

      expect(result).toEqual(mockLogs);
      expect(mockRepository.findByBot).toHaveBeenCalledWith(
        'discord-bot',
        undefined,
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

      vi.mocked(mockRepository.findByResource).mockResolvedValue(mockLogs);

      const result = await service.findByResource('league', 'league-123');

      expect(result).toEqual(mockLogs);
      expect(mockRepository.findByResource).toHaveBeenCalledWith(
        'league',
        'league-123',
        undefined,
      );
    });
  });

  describe('findWithFilters', () => {
    it('should_return_filtered_logs_when_filters_provided', async () => {
      const mockResult = { logs: [], total: 0 };

      vi.mocked(mockRepository.findWithFilters).mockResolvedValue(mockResult);

      const result = await service.findWithFilters({
        userId: 'user-123',
        method: 'POST',
      });

      expect(result).toEqual(mockResult);
      expect(mockRepository.findWithFilters).toHaveBeenCalledWith({
        userId: 'user-123',
        method: 'POST',
      });
    });
  });
});
