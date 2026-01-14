/**
 * MatchRepository Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MatchRepository } from './match.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateMatchDto } from '../dto/create-match.dto';
import { MatchStatus } from '@prisma/client';

describe('MatchRepository', () => {
  let repository: MatchRepository;
  let mockPrisma: PrismaService;

  const mockMatch = {
    id: 'match-123',
    leagueId: 'league-123',
    tournamentId: null,
    round: null,
    status: MatchStatus.SCHEDULED,
    scheduledAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = {
      match: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    } as unknown as PrismaService;

    repository = new MatchRepository(mockPrisma);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findById', () => {
    it('should_return_match_when_match_exists', async () => {
      vi.mocked(mockPrisma.match.findUnique).mockResolvedValue(
        mockMatch as never,
      );

      const result = await repository.findById('match-123');

      expect(result).toEqual(mockMatch);
      expect(mockPrisma.match.findUnique).toHaveBeenCalledWith({
        where: { id: 'match-123' },
        include: { participants: true },
      });
    });

    it('should_return_null_when_match_not_found', async () => {
      vi.mocked(mockPrisma.match.findUnique).mockResolvedValue(null);

      const result = await repository.findById('match-999');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should_create_match_when_data_is_valid', async () => {
      const createDto: CreateMatchDto = {
        leagueId: 'league-123',
        scheduledAt: new Date().toISOString(),
      };
      vi.mocked(mockPrisma.match.create).mockResolvedValue(mockMatch as never);

      const result = await repository.create(createDto);

      expect(result).toEqual(mockMatch);
      expect(mockPrisma.match.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should_update_match_when_data_is_provided', async () => {
      const updateData = { status: MatchStatus.IN_PROGRESS };
      const updatedMatch = { ...mockMatch, ...updateData };
      vi.mocked(mockPrisma.match.update).mockResolvedValue(
        updatedMatch as never,
      );

      const result = await repository.update('match-123', updateData);

      expect(result).toEqual(updatedMatch);
      expect(mockPrisma.match.update).toHaveBeenCalledWith({
        where: { id: 'match-123' },
        data: updateData,
      });
    });
  });

  describe('exists', () => {
    it('should_return_true_when_match_exists', async () => {
      vi.mocked(mockPrisma.match.count).mockResolvedValue(1);

      const result = await repository.exists('match-123');

      expect(result).toBe(true);
      expect(mockPrisma.match.count).toHaveBeenCalledWith({
        where: { id: 'match-123' },
      });
    });

    it('should_return_false_when_match_not_found', async () => {
      vi.mocked(mockPrisma.match.count).mockResolvedValue(0);

      const result = await repository.exists('match-999');

      expect(result).toBe(false);
    });
  });

  describe('findAll', () => {
    it('should_return_matches_when_options_not_provided', async () => {
      const matches = [mockMatch];
      vi.mocked(mockPrisma.match.findMany).mockResolvedValue(matches as never);
      vi.mocked(mockPrisma.match.count).mockResolvedValue(1);

      const result = await repository.findAll();

      expect(result.data).toEqual(matches);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(mockPrisma.match.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 50,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should_return_matches_when_page_and_limit_provided', async () => {
      const matches = [mockMatch];
      vi.mocked(mockPrisma.match.findMany).mockResolvedValue(matches as never);
      vi.mocked(mockPrisma.match.count).mockResolvedValue(10);

      const result = await repository.findAll({ page: 2, limit: 5 });

      expect(result.data).toEqual(matches);
      expect(result.total).toBe(10);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(mockPrisma.match.findMany).toHaveBeenCalledWith({
        skip: 5,
        take: 5,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should_cap_limit_at_100_when_limit_exceeds_100', async () => {
      const matches = [mockMatch];
      vi.mocked(mockPrisma.match.findMany).mockResolvedValue(matches as never);
      vi.mocked(mockPrisma.match.count).mockResolvedValue(1);

      const result = await repository.findAll({ page: 1, limit: 200 });

      expect(result.limit).toBe(100);
      expect(mockPrisma.match.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 100,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should_use_default_page_when_only_limit_provided', async () => {
      const matches = [mockMatch];
      vi.mocked(mockPrisma.match.findMany).mockResolvedValue(matches as never);
      vi.mocked(mockPrisma.match.count).mockResolvedValue(1);

      const result = await repository.findAll({ limit: 10 });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(mockPrisma.match.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('create', () => {
    it('should_create_match_when_scheduledAt_provided', async () => {
      const createDto: CreateMatchDto = {
        leagueId: 'league-123',
        scheduledAt: '2024-01-01T00:00:00Z',
      };
      const createdMatch = {
        ...mockMatch,
        scheduledAt: new Date('2024-01-01T00:00:00Z'),
      };
      vi.mocked(mockPrisma.match.create).mockResolvedValue(
        createdMatch as never,
      );

      const result = await repository.create(createDto);

      expect(result).toEqual(createdMatch);
      expect(mockPrisma.match.create).toHaveBeenCalledWith({
        data: {
          leagueId: 'league-123',
          tournamentId: undefined,
          round: undefined,
          scheduledAt: new Date('2024-01-01T00:00:00Z'),
        },
      });
    });

    it('should_create_match_when_scheduledAt_not_provided', async () => {
      const createDto: CreateMatchDto = {
        leagueId: 'league-123',
      };
      vi.mocked(mockPrisma.match.create).mockResolvedValue(mockMatch as never);

      const result = await repository.create(createDto);

      expect(result).toEqual(mockMatch);
      const callArgs = vi.mocked(mockPrisma.match.create).mock.calls[0]?.[0];
      expect(callArgs?.data.scheduledAt).toBeUndefined();
    });
  });
});
