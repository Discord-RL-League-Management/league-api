/**
 * LeagueMemberAccessAdapter Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { LeagueMemberAccessAdapter } from './league-member-access.adapter';
import { LeagueMemberRepository } from '../repositories/league-member.repository';
import { LeagueMember } from '@prisma/client';

describe('LeagueMemberAccessAdapter', () => {
  let adapter: LeagueMemberAccessAdapter;
  let mockRepository: LeagueMemberRepository;

  const mockPlayerId = 'player-123';
  const mockLeagueId = 'league-123';

  const mockLeagueMember: LeagueMember = {
    id: 'member-123',
    playerId: mockPlayerId,
    leagueId: mockLeagueId,
    status: 'ACTIVE',
    role: 'MEMBER',
    joinedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockRepository = {
      findByPlayerAndLeague: vi.fn(),
    } as unknown as LeagueMemberRepository;

    const module = await Test.createTestingModule({
      providers: [
        LeagueMemberAccessAdapter,
        {
          provide: LeagueMemberRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    adapter = module.get<LeagueMemberAccessAdapter>(LeagueMemberAccessAdapter);
  });

  describe('findByPlayerAndLeague', () => {
    it('should_return_league_member_when_found', async () => {
      vi.spyOn(mockRepository, 'findByPlayerAndLeague').mockResolvedValue(
        mockLeagueMember,
      );

      const result = await adapter.findByPlayerAndLeague(
        mockPlayerId,
        mockLeagueId,
      );

      expect(result).toEqual(mockLeagueMember);
      expect(result?.playerId).toBe(mockPlayerId);
      expect(result?.leagueId).toBe(mockLeagueId);
    });

    it('should_return_null_when_league_member_not_found', async () => {
      vi.spyOn(mockRepository, 'findByPlayerAndLeague').mockResolvedValue(null);

      const result = await adapter.findByPlayerAndLeague(
        mockPlayerId,
        mockLeagueId,
      );

      expect(result).toBeNull();
    });

    it('should_delegate_to_repository', async () => {
      vi.spyOn(mockRepository, 'findByPlayerAndLeague').mockResolvedValue(
        mockLeagueMember,
      );

      await adapter.findByPlayerAndLeague(mockPlayerId, mockLeagueId);

      expect(mockRepository.findByPlayerAndLeague).toHaveBeenCalledWith(
        mockPlayerId,
        mockLeagueId,
      );
      expect(mockRepository.findByPlayerAndLeague).toHaveBeenCalledTimes(1);
    });
  });
});
