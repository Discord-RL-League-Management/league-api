/**
 * LeagueMemberService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { LeagueMemberService } from './league-member.service';
import { LeagueMemberRepository } from '../repositories/league-member.repository';
import { LeagueJoinValidationService } from '../services/league-join-validation.service';
import { PlayerService } from '@/players/player.service';
import { PlayerRepository } from '@/players/repositories/player.repository';
import { PlayerNotFoundException } from '@/players/exceptions/player.exceptions';
import { LeagueRepository } from '@/leagues/repositories/league.repository';
import { LeagueSettingsService } from '@/leagues/league-settings.service';
import { ActivityLogService } from '@/infrastructure/activity-log/services/activity-log.service';
import { PlayerLeagueRatingService } from '@/player-ratings/services/player-league-rating.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  LeagueMemberNotFoundException,
  LeagueMemberAlreadyExistsException,
} from '../exceptions/league-member.exceptions';
import { JoinLeagueDto } from '../dto/join-league.dto';
import { UpdateLeagueMemberDto } from '../dto/update-league-member.dto';
import { LeagueMemberStatus, LeagueStatus, PlayerStatus } from '@prisma/client';

describe('LeagueMemberService', () => {
  let service: LeagueMemberService;
  let mockRepository: LeagueMemberRepository;
  let mockPlayerRepository: PlayerRepository;
  let mockLeagueRepository: LeagueRepository;
  let mockJoinValidation: LeagueJoinValidationService;
  let mockPlayerService: PlayerService;
  let mockLeagueSettings: LeagueSettingsService;
  let mockActivityLog: ActivityLogService;
  let mockRatingService: PlayerLeagueRatingService;
  let mockPrisma: PrismaService;

  const mockLeagueMember = {
    id: 'member_123',
    playerId: 'player_123',
    leagueId: 'league_123',
    status: LeagueMemberStatus.ACTIVE,
    role: 'MEMBER' as const,
    joinedAt: new Date(),
    leftAt: null,
    approvedBy: null,
    approvedAt: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLeague = {
    id: 'league_123',
    guildId: 'guild_123',
    name: 'Test League',
    description: null,
    game: null,
    status: LeagueStatus.ACTIVE,
    createdBy: 'user_123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPlayer = {
    id: 'player_123',
    userId: 'user_123',
    guildId: 'guild_123',
    status: PlayerStatus.ACTIVE,
    lastLeftLeagueAt: null,
    lastLeftLeagueId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findByPlayerAndLeague: vi.fn(),
      findByLeagueId: vi.fn(),
      findByPlayerId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
    } as unknown as LeagueMemberRepository;

    mockJoinValidation = {
      validateJoin: vi.fn().mockResolvedValue(undefined),
    } as unknown as LeagueJoinValidationService;

    mockPlayerService = {
      findOne: vi.fn(),
      ensurePlayerExists: vi.fn(),
    } as unknown as PlayerService;

    mockLeagueSettings = {
      getSettings: vi.fn().mockResolvedValue({
        membership: {
          cooldownAfterLeave: 7,
          requireApproval: false,
        },
      }),
    } as unknown as LeagueSettingsService;

    mockActivityLog = {
      logActivity: vi.fn().mockResolvedValue(undefined),
    } as unknown as ActivityLogService;

    mockRatingService = {
      updateRating: vi.fn().mockResolvedValue(undefined),
    } as unknown as PlayerLeagueRatingService;

    mockPlayerRepository = {
      findById: vi.fn(),
      updateCooldown: vi.fn(),
    } as unknown as PlayerRepository;

    mockLeagueRepository = {
      findById: vi.fn(),
    } as unknown as LeagueRepository;

    mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (callback) => {
        const mockTx = {} as Prisma.TransactionClient;
        return await callback(mockTx);
      }),
    } as unknown as PrismaService;

    service = new LeagueMemberService(
      mockRepository,
      mockJoinValidation,
      mockPlayerService,
      mockPlayerRepository,
      mockLeagueSettings,
      mockLeagueRepository,
      mockPrisma,
      mockActivityLog,
      mockRatingService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findOne', () => {
    it('should_return_league_member_when_member_exists', async () => {
      const memberId = 'member_123';
      vi.mocked(mockRepository.findById).mockResolvedValue(mockLeagueMember);

      const result = await service.findOne(memberId);

      expect(result).toEqual(mockLeagueMember);
      expect(result.id).toBe(memberId);
    });

    it('should_throw_LeagueMemberNotFoundException_when_member_does_not_exist', async () => {
      const memberId = 'nonexistent';
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.findOne(memberId)).rejects.toThrow(
        LeagueMemberNotFoundException,
      );
    });
  });

  describe('findByPlayerAndLeague', () => {
    it('should_return_member_when_player_and_league_match', async () => {
      const playerId = 'player_123';
      const leagueId = 'league_123';
      vi.mocked(mockRepository.findByPlayerAndLeague).mockResolvedValue(
        mockLeagueMember,
      );

      const result = await service.findByPlayerAndLeague(playerId, leagueId);

      expect(result).toEqual(mockLeagueMember);
    });

    it('should_return_null_when_no_member_exists', async () => {
      const playerId = 'player_999';
      const leagueId = 'league_999';
      vi.mocked(mockRepository.findByPlayerAndLeague).mockResolvedValue(null);

      const result = await service.findByPlayerAndLeague(playerId, leagueId);

      expect(result).toBeNull();
    });
  });

  describe('findByLeagueId', () => {
    it('should_return_paginated_members_for_league', async () => {
      const leagueId = 'league_123';
      const mockResult = {
        data: [mockLeagueMember],
        total: 1,
        page: 1,
        limit: 50,
      };

      vi.mocked(mockRepository.findByLeagueId).mockResolvedValue(mockResult);

      const result = await service.findByLeagueId(leagueId);

      expect(result).toEqual(mockResult);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('update', () => {
    it('should_update_member_when_member_exists', async () => {
      const memberId = 'member_123';
      const updateDto: UpdateLeagueMemberDto = {
        notes: 'Updated notes',
      };
      const updatedMember = {
        ...mockLeagueMember,
        ...updateDto,
        leftAt: updateDto.leftAt ? new Date(updateDto.leftAt) : null,
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(mockLeagueMember);
      vi.mocked(mockRepository.update).mockResolvedValue(updatedMember);

      const result = await service.update(memberId, updateDto);

      expect(result).toEqual(updatedMember);
      expect(result.notes).toBe(updateDto.notes);
    });

    it('should_throw_LeagueMemberNotFoundException_when_member_does_not_exist', async () => {
      const memberId = 'nonexistent';
      const updateDto: UpdateLeagueMemberDto = { notes: 'Test' };

      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.update(memberId, updateDto)).rejects.toThrow(
        LeagueMemberNotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should_delete_member_when_member_exists', async () => {
      const memberId = 'member_123';
      vi.mocked(mockRepository.findById).mockResolvedValue(mockLeagueMember);
      vi.mocked(mockRepository.delete).mockResolvedValue(mockLeagueMember);

      const result = await service.delete(memberId);

      expect(result).toEqual(mockLeagueMember);
    });

    it('should_throw_LeagueMemberNotFoundException_when_member_does_not_exist', async () => {
      const memberId = 'nonexistent';
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.delete(memberId)).rejects.toThrow(
        LeagueMemberNotFoundException,
      );
    });
  });

  describe('approveMember', () => {
    it('should_approve_pending_member_and_return_updated_member', async () => {
      const memberId = 'member_123';
      const approvedBy = 'admin_123';
      const pendingMember = {
        ...mockLeagueMember,
        status: LeagueMemberStatus.PENDING_APPROVAL,
        playerId: 'player_123',
        leagueId: 'league_123',
      };
      const approvedMember = {
        ...pendingMember,
        status: LeagueMemberStatus.ACTIVE,
        approvedBy,
        approvedAt: new Date(),
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(pendingMember);
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {} as Prisma.TransactionClient;
          return await callback(mockTx);
        },
      );
      vi.mocked(mockRepository.update).mockResolvedValue(approvedMember);
      vi.mocked(mockPlayerRepository.findById).mockResolvedValue(mockPlayer);
      vi.mocked(mockLeagueRepository.findById).mockResolvedValue(mockLeague);

      const result = await service.approveMember(memberId, approvedBy);

      expect(result.status).toBe(LeagueMemberStatus.ACTIVE);
      expect(result.approvedBy).toBe(approvedBy);
      expect(mockRepository.update).toHaveBeenCalledWith(
        memberId,
        {
          status: LeagueMemberStatus.ACTIVE,
          approvedBy,
        },
        expect.anything(),
      );
    });

    it('should_throw_LeagueMemberNotFoundException_when_member_does_not_exist', async () => {
      const memberId = 'nonexistent';
      const approvedBy = 'admin_123';

      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.approveMember(memberId, approvedBy)).rejects.toThrow(
        LeagueMemberNotFoundException,
      );
    });

    it('should_throw_LeagueMemberNotFoundException_when_member_is_not_pending', async () => {
      const memberId = 'member_123';
      const approvedBy = 'admin_123';
      const activeMember = {
        ...mockLeagueMember,
        status: LeagueMemberStatus.ACTIVE,
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(activeMember);

      await expect(service.approveMember(memberId, approvedBy)).rejects.toThrow(
        LeagueMemberNotFoundException,
      );
    });
  });

  describe('rejectMember', () => {
    it('should_delete_member_when_member_is_pending', async () => {
      const memberId = 'member_123';
      const pendingMember = {
        ...mockLeagueMember,
        status: LeagueMemberStatus.PENDING_APPROVAL,
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(pendingMember);
      vi.mocked(mockRepository.delete).mockResolvedValue(pendingMember);

      const result = await service.rejectMember(memberId);

      expect(result).toEqual(pendingMember);
    });

    it('should_throw_LeagueMemberNotFoundException_when_member_does_not_exist', async () => {
      const memberId = 'nonexistent';
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.rejectMember(memberId)).rejects.toThrow(
        LeagueMemberNotFoundException,
      );
    });

    it('should_throw_LeagueMemberNotFoundException_when_member_is_not_pending', async () => {
      const memberId = 'member_123';
      const activeMember = {
        ...mockLeagueMember,
        status: LeagueMemberStatus.ACTIVE,
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(activeMember);

      await expect(service.rejectMember(memberId)).rejects.toThrow(
        LeagueMemberNotFoundException,
      );
    });
  });

  describe('exists', () => {
    it('should_return_true_when_member_exists', async () => {
      const memberId = 'member_123';
      vi.mocked(mockRepository.exists).mockResolvedValue(true);

      const result = await service.exists(memberId);

      expect(result).toBe(true);
    });

    it('should_return_false_when_member_does_not_exist', async () => {
      const memberId = 'nonexistent';
      vi.mocked(mockRepository.exists).mockResolvedValue(false);

      const result = await service.exists(memberId);

      expect(result).toBe(false);
    });
  });

  describe('joinLeague', () => {
    it('should_create_new_member_when_player_and_league_exist_and_no_approval_required', async () => {
      const leagueId = 'league_123';
      const joinDto: JoinLeagueDto = {
        playerId: 'player_123',
        notes: 'Test join',
      };

      const newMember = {
        ...mockLeagueMember,
        status: LeagueMemberStatus.ACTIVE,
        notes: joinDto.notes,
      };

      const playerWithUserId = {
        ...mockPlayer,
        userId: 'user_123',
      };

      vi.mocked(mockLeagueRepository.findById).mockResolvedValue(mockLeague);
      vi.mocked(mockPlayerService.findOne).mockResolvedValue(
        playerWithUserId as any,
      );
      vi.mocked(mockPlayerService.ensurePlayerExists).mockResolvedValue(
        playerWithUserId as any,
      );
      vi.mocked(mockRepository.findByPlayerAndLeague)
        .mockResolvedValueOnce(null) // Before transaction
        .mockResolvedValueOnce(null); // In transaction
      vi.mocked(mockLeagueSettings.getSettings).mockResolvedValue({
        membership: {
          requiresApproval: false,
        },
      } as any);

      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {} as Prisma.TransactionClient;
          return await callback(mockTx);
        },
      );
      vi.mocked(mockRepository.create).mockResolvedValue(newMember);

      vi.mocked(mockActivityLog.logActivity).mockResolvedValue({
        id: 'log-1',
        entityType: 'league_member',
        entityId: 'member_123',
        eventType: 'MEMBER_JOINED',
        action: 'CREATE',
        userId: 'user_123',
        guildId: 'guild_123',
        changes: null,
        metadata: null,
        timestamp: new Date(),
      } as any);
      vi.mocked(mockRatingService.updateRating).mockResolvedValue({
        id: 'rating-1',
        playerId: 'player_123',
        leagueId: 'league_123',
        ratingSystem: 'MMR',
        currentRating: {} as any,
        ratingData: null,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUpdatedAt: new Date(),
      } as any);

      const result = await service.joinLeague(leagueId, joinDto);

      expect(result.status).toBe(LeagueMemberStatus.ACTIVE);
      expect(result.notes).toBe(joinDto.notes);
    });

    it('should_throw_NotFoundException_when_league_does_not_exist', async () => {
      const leagueId = 'nonexistent';
      const joinDto: JoinLeagueDto = { playerId: 'player_123' };

      vi.mocked(mockLeagueRepository.findById).mockResolvedValue(null);

      await expect(service.joinLeague(leagueId, joinDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should_throw_LeagueMemberAlreadyExistsException_when_member_already_active', async () => {
      const leagueId = 'league_123';
      const joinDto: JoinLeagueDto = { playerId: 'player_123' };
      const existingMember = {
        ...mockLeagueMember,
        status: LeagueMemberStatus.ACTIVE,
      };

      vi.mocked(mockLeagueRepository.findById).mockResolvedValue(mockLeague);
      vi.mocked(mockPlayerService.findOne).mockResolvedValue({
        ...mockPlayer,
        userId: 'user_123',
      } as any);
      vi.mocked(mockPlayerService.ensurePlayerExists).mockResolvedValue(
        mockPlayer as any,
      );
      vi.mocked(mockRepository.findByPlayerAndLeague).mockResolvedValue(
        existingMember,
      );

      await expect(service.joinLeague(leagueId, joinDto)).rejects.toThrow(
        LeagueMemberAlreadyExistsException,
      );
    });

    it('should_throw_NotFoundException_when_player_does_not_exist', async () => {
      const leagueId = 'league_123';
      const joinDto: JoinLeagueDto = { playerId: 'nonexistent_player' };

      vi.mocked(mockLeagueRepository.findById).mockResolvedValue(mockLeague);
      vi.mocked(mockPlayerService.findOne).mockRejectedValue(
        new PlayerNotFoundException('nonexistent_player'),
      );

      await expect(service.joinLeague(leagueId, joinDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPlayerService.findOne).toHaveBeenCalledWith(joinDto.playerId);
    });

    it('should_rethrow_unexpected_errors_from_playerService_findOne', async () => {
      const leagueId = 'league_123';
      const joinDto: JoinLeagueDto = { playerId: 'player_123' };
      const unexpectedError = new Error('Database connection failed');

      vi.mocked(mockLeagueRepository.findById).mockResolvedValue(mockLeague);
      vi.mocked(mockPlayerService.findOne).mockRejectedValue(unexpectedError);

      await expect(service.joinLeague(leagueId, joinDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(mockPlayerService.findOne).toHaveBeenCalledWith(joinDto.playerId);
    });
  });

  describe('leaveLeague', () => {
    it('should_deactivate_member_when_member_is_active', async () => {
      const playerId = 'player_123';
      const leagueId = 'league_123';
      const activeMember = {
        ...mockLeagueMember,
        status: LeagueMemberStatus.ACTIVE,
      };
      const inactiveMember = {
        ...activeMember,
        status: LeagueMemberStatus.INACTIVE,
        leftAt: new Date(),
      };

      vi.mocked(mockRepository.findByPlayerAndLeague).mockResolvedValue(
        activeMember,
      );
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {} as Prisma.TransactionClient;
          return await callback(mockTx);
        },
      );
      vi.mocked(mockLeagueRepository.findById).mockResolvedValue(mockLeague);
      vi.mocked(mockPlayerRepository.findById).mockResolvedValue(
        mockPlayer as any,
      );
      vi.mocked(mockRepository.update).mockResolvedValue(inactiveMember);
      vi.mocked(mockPlayerRepository.updateCooldown).mockResolvedValue(
        mockPlayer as any,
      );

      const result = await service.leaveLeague(playerId, leagueId);

      expect(result.status).toBe(LeagueMemberStatus.INACTIVE);
      expect(result.leftAt).toBeTruthy();
      expect(mockRepository.update).toHaveBeenCalledWith(
        activeMember.id,
        {
          status: LeagueMemberStatus.INACTIVE,
          leftAt: expect.any(String),
        },
        expect.anything(),
      );
    });

    it('should_throw_LeagueMemberNotFoundException_when_member_does_not_exist', async () => {
      const playerId = 'player_999';
      const leagueId = 'league_999';

      vi.mocked(mockRepository.findByPlayerAndLeague).mockResolvedValue(null);

      await expect(service.leaveLeague(playerId, leagueId)).rejects.toThrow(
        LeagueMemberNotFoundException,
      );
    });

    it('should_throw_LeagueMemberNotFoundException_when_member_is_not_active', async () => {
      const playerId = 'player_123';
      const leagueId = 'league_123';
      const inactiveMember = {
        ...mockLeagueMember,
        status: LeagueMemberStatus.INACTIVE,
      };

      vi.mocked(mockRepository.findByPlayerAndLeague).mockResolvedValue(
        inactiveMember,
      );

      await expect(service.leaveLeague(playerId, leagueId)).rejects.toThrow(
        LeagueMemberNotFoundException,
      );
    });
  });

  describe('joinLeague - edge cases', () => {
    it('should_handle_cooldown_at_boundary_when_cooldown_just_expired', async () => {
      const leagueId = 'league_123';
      const joinDto: JoinLeagueDto = { playerId: 'player_123' };
      const playerWithExpiredCooldown = {
        ...mockPlayer,
        lastLeftLeagueAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        lastLeftLeagueId: 'league_123',
      };

      vi.mocked(mockLeagueRepository.findById).mockResolvedValue(mockLeague);
      vi.mocked(mockPlayerService.findOne).mockResolvedValue(
        playerWithExpiredCooldown as any,
      );
      vi.mocked(mockPlayerService.ensurePlayerExists).mockResolvedValue(
        playerWithExpiredCooldown as any,
      );
      vi.mocked(mockLeagueSettings.getSettings).mockResolvedValue({
        membership: {
          cooldownAfterLeave: 7,
          requireApproval: false,
        },
      } as any);
      vi.mocked(mockJoinValidation.validateJoin).mockResolvedValue(undefined);
      vi.mocked(mockRepository.findByPlayerAndLeague).mockResolvedValue(null);
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {} as Prisma.TransactionClient;
          return await callback(mockTx);
        },
      );
      vi.mocked(mockRepository.create).mockResolvedValue(mockLeagueMember);

      const result = await service.joinLeague(leagueId, joinDto);

      expect(result).toEqual(mockLeagueMember);
    });

    it('should_handle_approval_workflow_when_approval_required', async () => {
      const leagueId = 'league_123';
      const joinDto: JoinLeagueDto = { playerId: 'player_123' };

      vi.mocked(mockLeagueRepository.findById).mockResolvedValue(mockLeague);
      vi.mocked(mockPlayerService.findOne).mockResolvedValue(mockPlayer as any);
      vi.mocked(mockPlayerService.ensurePlayerExists).mockResolvedValue(
        mockPlayer as any,
      );
      vi.mocked(mockLeagueSettings.getSettings).mockResolvedValue({
        membership: {
          cooldownAfterLeave: 0,
          requireApproval: true,
        },
      } as any);
      vi.mocked(mockJoinValidation.validateJoin).mockResolvedValue(undefined);
      vi.mocked(mockRepository.findByPlayerAndLeague).mockResolvedValue(null);
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {} as Prisma.TransactionClient;
          return await callback(mockTx);
        },
      );
      const pendingMember = {
        ...mockLeagueMember,
        status: LeagueMemberStatus.PENDING_APPROVAL,
      };
      vi.mocked(mockRepository.create).mockResolvedValue(pendingMember);

      const result = await service.joinLeague(leagueId, joinDto);

      expect(result.status).toBe(LeagueMemberStatus.PENDING_APPROVAL);
    });
  });
});
