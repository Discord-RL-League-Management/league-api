/**
 * GuildSettingsController Unit Tests
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
import { GuildSettingsController } from './guild-settings.controller';
import { GuildSettingsService } from './guild-settings.service';
import { GuildAccessValidationService } from './services/guild-access-validation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GuildAdminGuard } from './guards/guild-admin.guard';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';

describe('GuildSettingsController', () => {
  let controller: GuildSettingsController;
  let mockGuildSettingsService: GuildSettingsService;
  let mockGuildAccessValidationService: GuildAccessValidationService;

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
    mockGuildSettingsService = {
      getSettings: vi.fn(),
      updateSettings: vi.fn(),
      resetSettings: vi.fn(),
      getSettingsHistory: vi.fn(),
    } as unknown as GuildSettingsService;

    mockGuildAccessValidationService = {
      validateUserGuildAccess: vi.fn(),
    } as unknown as GuildAccessValidationService;

    const module = await Test.createTestingModule({
      controllers: [GuildSettingsController],
      providers: [
        { provide: GuildSettingsService, useValue: mockGuildSettingsService },
        {
          provide: GuildAccessValidationService,
          useValue: mockGuildAccessValidationService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: vi.fn().mockReturnValue(true),
      } as unknown as JwtAuthGuard)
      .overrideGuard(GuildAdminGuard)
      .useValue({
        canActivate: vi.fn().mockReturnValue(true),
      } as unknown as GuildAdminGuard)
      .compile();

    controller = module.get<GuildSettingsController>(GuildSettingsController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSettings', () => {
    it('should_return_settings_when_user_has_access', async () => {
      const mockSettings = { _metadata: { schemaVersion: '1.0.0' } };
      vi.mocked(
        mockGuildAccessValidationService.validateUserGuildAccess,
      ).mockResolvedValue(undefined);
      vi.mocked(mockGuildSettingsService.getSettings).mockResolvedValue(
        mockSettings as never,
      );

      const result = await controller.getSettings('guild-1', mockUser);

      expect(result).toEqual(mockSettings);
      expect(mockGuildSettingsService.getSettings).toHaveBeenCalledWith(
        'guild-1',
      );
    });
  });

  describe('updateSettings', () => {
    it('should_update_settings_when_dto_valid', async () => {
      const settingsDto = { bot_command_channels: [] };
      const mockUpdated = { ...settingsDto, _metadata: {} };
      vi.mocked(
        mockGuildAccessValidationService.validateUserGuildAccess,
      ).mockResolvedValue(undefined);
      vi.mocked(mockGuildSettingsService.updateSettings).mockResolvedValue(
        mockUpdated as never,
      );

      const result = await controller.updateSettings(
        'guild-1',
        settingsDto,
        mockUser,
      );

      expect(result).toEqual(mockUpdated);
      expect(mockGuildSettingsService.updateSettings).toHaveBeenCalled();
    });

    it('should_propagate_bad_request_exception', async () => {
      const settingsDto = { bot_command_channels: [] };
      const error = new BadRequestException('Invalid settings');
      vi.mocked(
        mockGuildAccessValidationService.validateUserGuildAccess,
      ).mockResolvedValue(undefined);
      vi.mocked(mockGuildSettingsService.updateSettings).mockRejectedValue(
        error,
      );

      await expect(
        controller.updateSettings('guild-1', settingsDto, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resetSettings', () => {
    it('should_reset_settings_when_user_has_access', async () => {
      const mockReset = { _metadata: { schemaVersion: '1.0.0' } };
      vi.mocked(
        mockGuildAccessValidationService.validateUserGuildAccess,
      ).mockResolvedValue(undefined);
      vi.mocked(mockGuildSettingsService.resetSettings).mockResolvedValue(
        mockReset as never,
      );

      const result = await controller.resetSettings('guild-1', mockUser);

      expect(result).toEqual(mockReset);
      expect(mockGuildSettingsService.resetSettings).toHaveBeenCalledWith(
        'guild-1',
        mockUser.id,
      );
    });
  });

  describe('getSettingsHistory', () => {
    it('should_return_history_when_limit_provided', async () => {
      const mockHistory = [{ version: 1, settings: {} }];
      vi.mocked(
        mockGuildAccessValidationService.validateUserGuildAccess,
      ).mockResolvedValue(undefined);
      vi.mocked(mockGuildSettingsService.getSettingsHistory).mockResolvedValue(
        mockHistory as never,
      );

      const result = await controller.getSettingsHistory(
        'guild-1',
        mockUser,
        '10',
      );

      expect(result).toEqual(mockHistory);
      expect(mockGuildSettingsService.getSettingsHistory).toHaveBeenCalledWith(
        'guild-1',
        10,
      );
    });
  });
});
