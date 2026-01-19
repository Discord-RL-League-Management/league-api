/**
 * MmrCalculationIntegrationService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { MmrCalculationIntegrationService } from './mmr-calculation-integration.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MmrCalculationService, TrackerData } from './mmr-calculation.service';
import { TrackerDataExtractionService } from './tracker-data-extraction.service';
import { SettingsDefaultsService } from '../../guilds/services/settings-defaults.service';
import { GuildSettingsService } from '../../guilds/guild-settings.service';
import type { MmrCalculationConfig } from '../../guilds/interfaces/settings.interface';

describe('MmrCalculationIntegrationService', () => {
  let service: MmrCalculationIntegrationService;
  let mockPrisma: PrismaService;
  let mockMmrService: MmrCalculationService;
  let mockTrackerDataExtraction: TrackerDataExtractionService;
  let mockSettingsDefaults: SettingsDefaultsService;
  let mockGuildSettingsService: GuildSettingsService;

  const mockTrackerData: TrackerData = {
    ones: 1500,
    twos: 1600,
    threes: 1700,
    fours: 1400,
    onesGamesPlayed: 100,
    twosGamesPlayed: 200,
    threesGamesPlayed: 300,
    foursGamesPlayed: 50,
    onesPeak: 1600,
    twosPeak: 1700,
    threesPeak: 1800,
    foursPeak: 1500,
  };

  const mockMmrConfig: MmrCalculationConfig = {
    algorithm: 'WEIGHTED_AVERAGE',
    weights: {
      ones: 0.1,
      twos: 0.3,
      threes: 0.5,
      fours: 0.1,
    },
    minGamesPlayed: {
      ones: 50,
      twos: 50,
      threes: 50,
      fours: 50,
    },
  };

  const mockGuildMemberships = [{ guildId: 'guild_1' }, { guildId: 'guild_2' }];

  beforeEach(async () => {
    mockPrisma = {
      guildMember: {
        findMany: vi.fn().mockResolvedValue(mockGuildMemberships),
      },
    } as unknown as PrismaService;

    mockMmrService = {
      calculateMmr: vi.fn().mockReturnValue(1600),
    } as unknown as MmrCalculationService;

    mockTrackerDataExtraction = {
      extractTrackerData: vi.fn().mockResolvedValue(mockTrackerData),
    } as unknown as TrackerDataExtractionService;

    mockSettingsDefaults = {
      getDefaults: vi.fn().mockReturnValue({
        mmrCalculation: mockMmrConfig,
      }),
    } as unknown as SettingsDefaultsService;

    mockGuildSettingsService = {
      getSettings: vi.fn().mockResolvedValue({
        mmrCalculation: mockMmrConfig,
      }),
    } as unknown as GuildSettingsService;

    const module = await Test.createTestingModule({
      providers: [
        MmrCalculationIntegrationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MmrCalculationService, useValue: mockMmrService },
        {
          provide: TrackerDataExtractionService,
          useValue: mockTrackerDataExtraction,
        },
        { provide: SettingsDefaultsService, useValue: mockSettingsDefaults },
        { provide: GuildSettingsService, useValue: mockGuildSettingsService },
      ],
    }).compile();

    service = module.get<MmrCalculationIntegrationService>(
      MmrCalculationIntegrationService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateMmrForUser', () => {
    it('should_calculate_mmr_for_all_user_guilds', async () => {
      await service.calculateMmrForUser('user_123', 'tracker_123');

      expect(mockTrackerDataExtraction.extractTrackerData).toHaveBeenCalledWith(
        'tracker_123',
      );
      expect(mockPrisma.guildMember.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        select: { guildId: true },
      });
      expect(mockMmrService.calculateMmr).toHaveBeenCalledTimes(2);
    });

    it('should_skip_calculation_when_no_tracker_data_available', async () => {
      vi.spyOn(
        mockTrackerDataExtraction,
        'extractTrackerData',
      ).mockResolvedValue(null);

      await service.calculateMmrForUser('user_123', 'tracker_123');

      expect(mockPrisma.guildMember.findMany).not.toHaveBeenCalled();
      expect(mockMmrService.calculateMmr).not.toHaveBeenCalled();
    });

    it('should_skip_calculation_when_user_has_no_guild_memberships', async () => {
      vi.spyOn(mockPrisma.guildMember, 'findMany').mockResolvedValue([]);

      await service.calculateMmrForUser('user_123', 'tracker_123');

      expect(mockMmrService.calculateMmr).not.toHaveBeenCalled();
    });

    it('should_use_guild_settings_when_available', async () => {
      const customConfig: MmrCalculationConfig = {
        ...mockMmrConfig,
        algorithm: 'PEAK_MMR',
      };
      vi.spyOn(mockGuildSettingsService, 'getSettings').mockResolvedValue({
        mmrCalculation: customConfig,
      });

      await service.calculateMmrForUser('user_123', 'tracker_123');

      expect(mockMmrService.calculateMmr).toHaveBeenCalledWith(
        mockTrackerData,
        customConfig,
      );
    });

    it('should_use_default_config_when_guild_settings_fail', async () => {
      vi.spyOn(mockGuildSettingsService, 'getSettings').mockRejectedValue(
        new Error('Settings error'),
      );

      await service.calculateMmrForUser('user_123', 'tracker_123');

      expect(mockMmrService.calculateMmr).toHaveBeenCalledWith(
        mockTrackerData,
        mockMmrConfig,
      );
    });

    it('should_handle_individual_guild_calculation_failures_gracefully', async () => {
      vi.spyOn(mockMmrService, 'calculateMmr')
        .mockResolvedValueOnce(1600)
        .mockRejectedValueOnce(new Error('Calculation error'));

      await service.calculateMmrForUser('user_123', 'tracker_123');

      expect(mockMmrService.calculateMmr).toHaveBeenCalledTimes(2);
    });

    it('should_handle_tracker_data_extraction_errors_gracefully', async () => {
      vi.spyOn(
        mockTrackerDataExtraction,
        'extractTrackerData',
      ).mockRejectedValue(new Error('Extraction error'));

      await expect(
        service.calculateMmrForUser('user_123', 'tracker_123'),
      ).resolves.not.toThrow();
    });

    it('should_handle_guild_membership_query_errors_gracefully', async () => {
      vi.spyOn(mockPrisma.guildMember, 'findMany').mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.calculateMmrForUser('user_123', 'tracker_123'),
      ).resolves.not.toThrow();
    });

    it('should_calculate_mmr_with_correct_parameters_for_each_guild', async () => {
      await service.calculateMmrForUser('user_123', 'tracker_123');

      expect(mockMmrService.calculateMmr).toHaveBeenCalledWith(
        mockTrackerData,
        mockMmrConfig,
      );
    });
  });
});
