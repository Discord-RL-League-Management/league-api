/**
 * LeagueSettingsServiceAdapter Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LeagueSettingsServiceAdapter } from '@/leagues/adapters/league-settings-service.adapter';
import { LeagueSettingsService } from '@/leagues/league-settings.service';
import { LeagueSettingsDto } from '@/leagues/dto/league-settings.dto';
import { LeagueConfiguration } from '@/leagues/interfaces/league-settings.interface';

describe('LeagueSettingsServiceAdapter', () => {
  let adapter: LeagueSettingsServiceAdapter;
  let mockLeagueSettingsService: LeagueSettingsService;

  const mockLeagueConfiguration: LeagueConfiguration = {
    membership: {
      joinMethod: 'OPEN',
      requiresApproval: false,
    },
    mmr: {
      minMmr: 1000,
      maxMmr: 2000,
    },
  };

  beforeEach(() => {
    mockLeagueSettingsService = {
      getSettings: vi.fn(),
      updateSettings: vi.fn(),
    } as unknown as LeagueSettingsService;

    adapter = new LeagueSettingsServiceAdapter(mockLeagueSettingsService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSettings', () => {
    it('should_delegate_get_settings_to_league_settings_service_when_called', async () => {
      // ARRANGE
      const leagueId = 'league_123456789012345678';
      vi.spyOn(mockLeagueSettingsService, 'getSettings').mockResolvedValue(
        mockLeagueConfiguration,
      );

      // ACT
      const result = await adapter.getSettings(leagueId);

      // ASSERT
      expect(result).toBe(mockLeagueConfiguration);
      expect(mockLeagueSettingsService.getSettings).toHaveBeenCalledWith(
        leagueId,
      );
    });
  });

  describe('updateSettings', () => {
    it('should_delegate_update_settings_to_league_settings_service_when_called', async () => {
      // ARRANGE
      const leagueId = 'league_123456789012345678';
      const dto: Partial<LeagueSettingsDto> = {
        membership: {
          joinMethod: 'INVITE_ONLY',
          requiresApproval: true,
        },
      };
      const updatedConfiguration = {
        ...mockLeagueConfiguration,
        membership: dto.membership,
      };
      vi.spyOn(mockLeagueSettingsService, 'updateSettings').mockResolvedValue(
        updatedConfiguration,
      );

      // ACT
      const result = await adapter.updateSettings(leagueId, dto);

      // ASSERT
      expect(result).toBe(updatedConfiguration);
      expect(mockLeagueSettingsService.updateSettings).toHaveBeenCalledWith(
        leagueId,
        dto,
      );
    });
  });
});
