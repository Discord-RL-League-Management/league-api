/**
 * TournamentService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TournamentService } from './tournament.service';
import { TournamentRepository } from '../repositories/tournament.repository';
import { CreateTournamentDto } from '../dto/create-tournament.dto';

describe('TournamentService', () => {
  let service: TournamentService;
  let mockRepository: TournamentRepository;

  const mockTournament = {
    id: 'tournament_123',
    leagueId: 'league_123',
    name: 'Test Tournament',
    description: 'A test tournament',
    format: 'SINGLE_ELIMINATION' as const,
    status: 'UPCOMING' as const,
    startDate: new Date('2024-06-01'),
    endDate: new Date('2024-06-30'),
    maxParticipants: 16,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      create: vi.fn(),
    } as unknown as TournamentRepository;

    service = new TournamentService(mockRepository);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findOne', () => {
    it('should_return_tournament_when_tournament_exists', async () => {
      const tournamentId = 'tournament_123';
      vi.mocked(mockRepository.findById).mockResolvedValue(mockTournament);

      const result = await service.findOne(tournamentId);

      expect(result).toEqual(mockTournament);
      expect(mockRepository.findById).toHaveBeenCalledWith(tournamentId);
    });

    it('should_return_null_when_tournament_does_not_exist', async () => {
      const tournamentId = 'nonexistent';
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      const result = await service.findOne(tournamentId);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should_create_tournament_when_valid_dto_provided', async () => {
      const createDto: CreateTournamentDto = {
        leagueId: 'league_123',
        name: 'New Tournament',
        description: 'A new tournament',
        format: 'SINGLE_ELIMINATION',
        status: 'UPCOMING',
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-06-30'),
        maxParticipants: 16,
      };
      const createdTournament = { ...mockTournament, ...createDto };
      vi.mocked(mockRepository.create).mockResolvedValue(createdTournament);

      const result = await service.create(createDto);

      expect(result).toEqual(createdTournament);
      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('registerParticipant', () => {
    it('should_register_player_participant_when_player_id_provided', () => {
      const tournamentId = 'tournament_123';
      const playerId = 'player_123';
      const leagueId = 'league_123';

      const result = service.registerParticipant(
        tournamentId,
        playerId,
        null,
        leagueId,
      );

      expect(result).toEqual({
        tournamentId,
        playerId,
        teamId: null,
        leagueId,
      });
    });

    it('should_register_team_participant_when_team_id_provided', () => {
      const tournamentId = 'tournament_123';
      const teamId = 'team_123';
      const leagueId = 'league_123';

      const result = service.registerParticipant(
        tournamentId,
        null,
        teamId,
        leagueId,
      );

      expect(result).toEqual({
        tournamentId,
        playerId: null,
        teamId,
        leagueId,
      });
    });

    it('should_register_participant_with_both_player_and_team_ids', () => {
      const tournamentId = 'tournament_123';
      const playerId = 'player_123';
      const teamId = 'team_123';
      const leagueId = 'league_123';

      const result = service.registerParticipant(
        tournamentId,
        playerId,
        teamId,
        leagueId,
      );

      expect(result).toEqual({
        tournamentId,
        playerId,
        teamId,
        leagueId,
      });
    });

    it('should_register_participant_with_null_ids', () => {
      const tournamentId = 'tournament_123';
      const leagueId = 'league_123';

      const result = service.registerParticipant(
        tournamentId,
        null,
        null,
        leagueId,
      );

      expect(result).toEqual({
        tournamentId,
        playerId: null,
        teamId: null,
        leagueId,
      });
    });
  });
});
