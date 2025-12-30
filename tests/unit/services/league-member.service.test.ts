/**
 * LeagueMemberService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { LeagueMemberService } from '@/league-members/services/league-member.service';
import { LeagueMemberRepository } from '@/league-members/repositories/league-member.repository';
import { LeagueJoinValidationService } from '@/league-members/services/league-join-validation.service';
import { PlayerService } from '@/players/services/player.service';
import { LeagueSettingsService } from '@/leagues/league-settings.service';
import { ActivityLogService } from '@/infrastructure/activity-log/services/activity-log.service';
import { PlayerLeagueRatingService } from '@/player-ratings/services/player-league-rating.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  LeagueMemberNotFoundException,
  LeagueMemberAlreadyExistsException,
} from '@/league-members/exceptions/league-member.exceptions';
import { JoinLeagueDto } from '@/league-members/dto/join-league.dto';
import { UpdateLeagueMemberDto } from '@/league-members/dto/update-league-member.dto';
import { LeagueMemberStatus, LeagueStatus, PlayerStatus } from '@prisma/client';

describe('LeagueMemberService', () => {
  let service: LeagueMemberService;
  let mockRepository: LeagueMemberRepository;
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

    mockPrisma = {
      league: {
        findUnique: vi.fn(),
      },
      player: {
        findUnique: vi.fn(),
      },
      leagueMember: {
        create: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn((callback) =>
        callback({
          league: { findUnique: vi.fn() },
          player: { findUnique: vi.fn(), update: vi.fn() },
          leagueMember: { create: vi.fn(), update: vi.fn() },
        }),
      ),
    } as unknown as PrismaService;

    service = new LeagueMemberService(
      mockRepository,
      mockJoinValidation,
      mockPlayerService,
      mockLeagueSettings,
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
      vi.mocked(mockPrisma.player.findUnique).mockResolvedValue(mockPlayer);
      vi.mocked(mockPrisma.league.findUnique).mockResolvedValue(mockLeague);
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const tx = {
            leagueMember: {
              update: vi.fn().mockResolvedValue(approvedMember),
            },
            player: {
              findUnique: vi.fn().mockResolvedValue(mockPlayer),
            },
            league: {
              findUnique: vi.fn().mockResolvedValue(mockLeague),
            },
          };
          return callback(tx as any);
        },
      );

      const result = await service.approveMember(memberId, approvedBy);

      expect(result.status).toBe(LeagueMemberStatus.ACTIVE);
      expect(result.approvedBy).toBe(approvedBy);
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

      vi.mocked(mockPrisma.league.findUnique).mockResolvedValue(mockLeague);
      vi.mocked(mockPlayerService.findOne).mockResolvedValue(
        playerWithUserId as any,
      );
      vi.mocked(mockPlayerService.ensurePlayerExists).mockResolvedValue(
        playerWithUserId as any,
      );
      vi.mocked(mockRepository.findByPlayerAndLeague).mockResolvedValue(null);
      vi.mocked(mockLeagueSettings.getSettings).mockResolvedValue({
        membership: {
          requiresApproval: false, // Note: requiresApproval, not requireApproval
        },
      } as any);

      // Mock transaction with all required operations
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const tx = {
            leagueMember: {
              findUnique: vi.fn().mockResolvedValue(null), // No existing member
              create: vi.fn().mockResolvedValue(newMember),
            },
          };
          const result = await callback(tx as any);
          return result;
        },
      );

      // Mock activity log and rating service to be called within transaction
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

      vi.mocked(mockPrisma.league.findUnique).mockResolvedValue(null);

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

      vi.mocked(mockPrisma.league.findUnique).mockResolvedValue(mockLeague);
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
          const tx = {
            league: {
              findUnique: vi.fn().mockResolvedValue(mockLeague),
            },
            player: {
              findUnique: vi.fn().mockResolvedValue(mockPlayer),
              update: vi.fn().mockResolvedValue(mockPlayer),
            },
            leagueMember: {
              update: vi.fn().mockResolvedValue(inactiveMember),
            },
          };
          return callback(tx as any);
        },
      );

      const result = await service.leaveLeague(playerId, leagueId);

      expect(result.status).toBe(LeagueMemberStatus.INACTIVE);
      expect(result.leftAt).toBeTruthy();
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
});
