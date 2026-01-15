/**
 * GuildMemberStatisticsService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { GuildMemberStatisticsService } from './guild-member-statistics.service';
import { GuildMemberRepository } from '../repositories/guild-member.repository';

describe('GuildMemberStatisticsService', () => {
  let service: GuildMemberStatisticsService;
  let mockRepository: GuildMemberRepository;

  beforeEach(async () => {
    mockRepository = {
      countStats: vi.fn(),
      countMembersWithRoles: vi.fn(),
    } as unknown as GuildMemberRepository;

    const module = await Test.createTestingModule({
      providers: [
        GuildMemberStatisticsService,
        { provide: GuildMemberRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<GuildMemberStatisticsService>(
      GuildMemberStatisticsService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMemberStats', () => {
    it('should_return_statistics_when_guild_exists', async () => {
      const mockStats = {
        totalMembers: 100,
        activeMembers: 80,
        newThisWeek: 5,
      };
      vi.spyOn(mockRepository, 'countStats').mockResolvedValue(
        mockStats as never,
      );

      const result = await service.getMemberStats('guild_123');

      expect(result).toEqual(mockStats);
      expect(mockRepository.countStats).toHaveBeenCalledWith('guild_123');
    });

    it('should_throw_exception_when_repository_fails', async () => {
      vi.spyOn(mockRepository, 'countStats').mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getMemberStats('guild_123')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('countMembersWithRoles', () => {
    it('should_return_count_when_members_with_roles_exist', async () => {
      vi.spyOn(mockRepository, 'countMembersWithRoles').mockResolvedValue(10);

      const result = await service.countMembersWithRoles('guild_123', [
        'role_1',
        'role_2',
      ]);

      expect(result).toBe(10);
      expect(mockRepository.countMembersWithRoles).toHaveBeenCalledWith(
        'guild_123',
        ['role_1', 'role_2'],
      );
    });

    it('should_return_zero_when_no_members_with_roles', async () => {
      vi.spyOn(mockRepository, 'countMembersWithRoles').mockResolvedValue(0);

      const result = await service.countMembersWithRoles('guild_123', [
        'role_1',
      ]);

      expect(result).toBe(0);
    });

    it('should_throw_exception_when_repository_fails', async () => {
      vi.spyOn(mockRepository, 'countMembersWithRoles').mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.countMembersWithRoles('guild_123', ['role_1']),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getActiveMembersCount', () => {
    it('should_return_active_members_count', async () => {
      const mockStats = {
        totalMembers: 100,
        activeMembers: 80,
        newThisWeek: 5,
      };
      vi.spyOn(mockRepository, 'countStats').mockResolvedValue(
        mockStats as never,
      );

      const result = await service.getActiveMembersCount('guild_123');

      expect(result).toBe(80);
      expect(mockRepository.countStats).toHaveBeenCalledWith('guild_123');
    });

    it('should_throw_exception_when_repository_fails', async () => {
      vi.spyOn(mockRepository, 'countStats').mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getActiveMembersCount('guild_123')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
