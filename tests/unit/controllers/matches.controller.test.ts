/**
 * MatchesController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MatchesController } from '@/matches/matches.controller';
import { MatchService } from '@/matches/services/match.service';
import { CreateMatchDto } from '@/matches/dto/create-match.dto';
import { CreateMatchParticipantDto } from '@/matches/dto/create-match-participant.dto';
import { UpdateMatchStatusDto } from '@/matches/dto/update-match-status.dto';
import { CompleteMatchDto } from '@/matches/dto/complete-match.dto';
import { MatchStatus } from '@prisma/client';

describe('MatchesController', () => {
  let controller: MatchesController;
  let mockMatchService: MatchService;

  const mockMatch = {
    id: 'match-123',
    leagueId: 'league-123',
    status: MatchStatus.SCHEDULED,
    scheduledAt: new Date(),
  };

  beforeEach(async () => {
    // ARRANGE: Setup test dependencies with mocks
    mockMatchService = {
      findOne: vi.fn(),
      create: vi.fn(),
      addParticipant: vi.fn(),
      updateStatus: vi.fn(),
      completeMatch: vi.fn(),
    } as unknown as MatchService;

    const module = await Test.createTestingModule({
      controllers: [MatchesController],
      providers: [{ provide: MatchService, useValue: mockMatchService }],
    }).compile();

    controller = module.get<MatchesController>(MatchesController);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getMatch', () => {
    it('should_return_match_when_match_exists', async () => {
      // ARRANGE
      vi.mocked(mockMatchService.findOne).mockResolvedValue(mockMatch as never);

      // ACT
      const result = await controller.getMatch('match-123');

      // ASSERT
      expect(result).toEqual(mockMatch);
      expect(mockMatchService.findOne).toHaveBeenCalledWith('match-123');
    });

    it('should_throw_when_match_not_found', async () => {
      // ARRANGE
      vi.mocked(mockMatchService.findOne).mockRejectedValue(
        new NotFoundException('Match not found'),
      );

      // ACT & ASSERT
      await expect(controller.getMatch('match-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createMatch', () => {
    it('should_create_match_when_data_is_valid', async () => {
      // ARRANGE
      const createDto: CreateMatchDto = {
        leagueId: 'league-123',
        scheduledAt: new Date().toISOString(),
      };
      vi.mocked(mockMatchService.create).mockResolvedValue(mockMatch as never);

      // ACT
      const result = await controller.createMatch(createDto);

      // ASSERT
      expect(result).toEqual(mockMatch);
      expect(mockMatchService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('addParticipant', () => {
    it('should_add_participant_when_data_is_valid', async () => {
      // ARRANGE
      const participantDto: CreateMatchParticipantDto = {
        playerId: 'player-123',
        teamId: 'team-123',
        isWinner: false,
      };
      const updatedMatch = { ...mockMatch, participants: [participantDto] };
      vi.mocked(mockMatchService.addParticipant).mockResolvedValue(
        updatedMatch as never,
      );

      // ACT
      const result = await controller.addParticipant(
        'match-123',
        participantDto,
      );

      // ASSERT
      expect(result).toEqual(updatedMatch);
      expect(mockMatchService.addParticipant).toHaveBeenCalledWith(
        'match-123',
        participantDto,
      );
    });
  });

  describe('updateStatus', () => {
    it('should_update_status_when_data_is_valid', async () => {
      // ARRANGE
      const updateDto: UpdateMatchStatusDto = {
        status: MatchStatus.IN_PROGRESS,
      };
      const updatedMatch = { ...mockMatch, status: MatchStatus.IN_PROGRESS };
      vi.mocked(mockMatchService.updateStatus).mockResolvedValue(
        updatedMatch as never,
      );

      // ACT
      const result = await controller.updateStatus('match-123', updateDto);

      // ASSERT
      expect(result.status).toBe(MatchStatus.IN_PROGRESS);
      expect(mockMatchService.updateStatus).toHaveBeenCalledWith(
        'match-123',
        MatchStatus.IN_PROGRESS,
      );
    });
  });

  describe('completeMatch', () => {
    it('should_complete_match_when_winner_provided', async () => {
      // ARRANGE
      const completeDto: CompleteMatchDto = { winnerId: 'team-123' };
      const completedMatch = { ...mockMatch, status: MatchStatus.COMPLETED };
      vi.mocked(mockMatchService.completeMatch).mockResolvedValue(
        completedMatch as never,
      );

      // ACT
      const result = await controller.completeMatch('match-123', completeDto);

      // ASSERT
      expect(result.status).toBe(MatchStatus.COMPLETED);
      expect(mockMatchService.completeMatch).toHaveBeenCalledWith(
        'match-123',
        'team-123',
      );
    });
  });
});
