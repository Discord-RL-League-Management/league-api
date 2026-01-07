/**
 * LeagueSettingsController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { LeagueSettingsController } from './league-settings.controller';
import { LeagueSettingsService } from './league-settings.service';
import { LeagueAdminOrModeratorGuard } from './guards/league-admin-or-moderator.guard';
import { LeagueAdminGuard } from './guards/league-admin.guard';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';

describe('LeagueSettingsController', () => {
  let controller: LeagueSettingsController;
  let mockLeagueSettingsService: LeagueSettingsService;

  const mockUser: AuthenticatedUser = {
    id: 'user-123',
    username: 'testuser',
    globalName: 'Test User',
    avatar: 'avatar_hash',
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  beforeEach(async () => {
    mockLeagueSettingsService = {
      getSettings: vi.fn(),
      updateSettings: vi.fn(),
      resetSettings: vi.fn(),
    } as unknown as LeagueSettingsService;

    const module = await Test.createTestingModule({
      controllers: [LeagueSettingsController],
      providers: [
        { provide: LeagueSettingsService, useValue: mockLeagueSettingsService },
      ],
    })
      .overrideGuard(LeagueAdminOrModeratorGuard)
      .useValue({
        canActivate: vi.fn().mockReturnValue(true),
      } as unknown as LeagueAdminOrModeratorGuard)
      .overrideGuard(LeagueAdminGuard)
      .useValue({
        canActivate: vi.fn().mockReturnValue(true),
      } as unknown as LeagueAdminGuard)
      .compile();

    controller = module.get<LeagueSettingsController>(LeagueSettingsController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSettings', () => {
    it('should_return_settings_when_league_id_provided', async () => {
      const mockSettings = { _metadata: { schemaVersion: '1.0.0' } };
      vi.mocked(mockLeagueSettingsService.getSettings).mockResolvedValue(
        mockSettings as never,
      );

      const result = await controller.getSettings('league-1');

      expect(result).toEqual(mockSettings);
      expect(mockLeagueSettingsService.getSettings).toHaveBeenCalledWith(
        'league-1',
      );
    });
  });

  describe('updateSettings', () => {
    it('should_update_settings_when_dto_valid', async () => {
      const settingsDto = { maxTeamsPerOrganization: 5 };
      const mockUpdated = { ...settingsDto, _metadata: {} };
      vi.mocked(mockLeagueSettingsService.updateSettings).mockResolvedValue(
        mockUpdated as never,
      );

      const result = await controller.updateSettings(
        'league-1',
        settingsDto,
        mockUser,
      );

      expect(result).toEqual(mockUpdated);
      expect(mockLeagueSettingsService.updateSettings).toHaveBeenCalled();
    });

    it('should_propagate_bad_request_exception', async () => {
      const settingsDto = { maxTeamsPerOrganization: 5 };
      const error = new BadRequestException('Invalid settings');
      vi.mocked(mockLeagueSettingsService.updateSettings).mockRejectedValue(
        error,
      );

      await expect(
        controller.updateSettings('league-1', settingsDto, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
