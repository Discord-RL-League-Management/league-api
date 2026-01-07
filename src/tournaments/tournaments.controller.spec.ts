/**
 * TournamentsController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { TournamentsController } from './tournaments.controller';
import { TournamentService } from './services/tournament.service';

describe('TournamentsController', () => {
  let controller: TournamentsController;
  let mockTournamentService: TournamentService;

  beforeEach(async () => {
    mockTournamentService = {
      findOne: vi.fn(),
      create: vi.fn(),
      registerParticipant: vi.fn(),
    } as unknown as TournamentService;

    const module = await Test.createTestingModule({
      controllers: [TournamentsController],
      providers: [
        { provide: TournamentService, useValue: mockTournamentService },
      ],
    }).compile();

    controller = module.get<TournamentsController>(TournamentsController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getTournament', () => {
    it('should_return_tournament_when_id_provided', async () => {
      const mockTournament = { id: 'tournament-1', name: 'Test Tournament' };
      vi.mocked(mockTournamentService.findOne).mockResolvedValue(
        mockTournament as never,
      );

      const result = await controller.getTournament('tournament-1');

      expect(result).toEqual(mockTournament);
      expect(mockTournamentService.findOne).toHaveBeenCalledWith(
        'tournament-1',
      );
    });
  });

  describe('createTournament', () => {
    it('should_create_tournament_when_dto_valid', async () => {
      const createDto = { name: 'New Tournament', leagueId: 'league-1' };
      const mockTournament = { id: 'tournament-1', ...createDto };
      vi.mocked(mockTournamentService.create).mockResolvedValue(
        mockTournament as never,
      );

      const result = await controller.createTournament(createDto);

      expect(result).toEqual(mockTournament);
      expect(mockTournamentService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('registerParticipant', () => {
    it('should_register_participant_when_data_provided', async () => {
      const registerDto = { playerId: 'player-1', leagueId: 'league-1' };
      const mockParticipant = { id: 'participant-1' };
      vi.mocked(mockTournamentService.registerParticipant).mockResolvedValue(
        mockParticipant as never,
      );

      const result = await controller.registerParticipant(
        'tournament-1',
        registerDto,
      );

      expect(result).toEqual(mockParticipant);
      expect(mockTournamentService.registerParticipant).toHaveBeenCalled();
    });
  });
});
