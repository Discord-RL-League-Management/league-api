/**
 * MMRCalculatorDemoController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MMRCalculatorDemoController } from './mmr-calculator-demo.controller';
import { MmrCalculationService } from './services/mmr-calculation.service';
import { GuildSettingsService } from '../guilds/guild-settings.service';
import { SettingsDefaultsService } from '../guilds/services/settings-defaults.service';

describe('MMRCalculatorDemoController', () => {
  let controller: MMRCalculatorDemoController;
  let mockMmrService: MmrCalculationService;
  let mockGuildSettingsService: GuildSettingsService;
  let mockSettingsDefaults: SettingsDefaultsService;

  beforeEach(async () => {
    mockMmrService = {
      calculateMmr: vi.fn(),
    } as unknown as MmrCalculationService;

    mockGuildSettingsService = {
      getSettings: vi.fn(),
    } as unknown as GuildSettingsService;

    mockSettingsDefaults = {
      getDefaults: vi.fn(),
    } as unknown as SettingsDefaultsService;

    const module = await Test.createTestingModule({
      controllers: [MMRCalculatorDemoController],
      providers: [
        { provide: MmrCalculationService, useValue: mockMmrService },
        {
          provide: GuildSettingsService,
          useValue: mockGuildSettingsService,
        },
        { provide: SettingsDefaultsService, useValue: mockSettingsDefaults },
      ],
    }).compile();

    controller = module.get<MMRCalculatorDemoController>(
      MMRCalculatorDemoController,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculate', () => {
    it('should_calculate_mmr_when_config_and_data_provided', async () => {
      const calculateDto = {
        guildId: 'guild-1',
        trackerData: { ones: 1200, twos: 1400 },
      };
      const mockSettings = {
        mmrCalculation: { algorithm: 'WEIGHTED_AVERAGE' },
      };
      vi.mocked(mockGuildSettingsService.getSettings).mockResolvedValue(
        mockSettings as never,
      );
      vi.mocked(mockMmrService.calculateMmr).mockReturnValue(1300);

      const result = await controller.calculate(calculateDto);

      expect(result.result).toBe(1300);
      expect(result.algorithm).toBe('WEIGHTED_AVERAGE');
      expect(mockMmrService.calculateMmr).toHaveBeenCalled();
    });

    it('should_use_defaults_when_settings_missing', async () => {
      const calculateDto = {
        guildId: 'guild-1',
        trackerData: { ones: 1200 },
      };
      const mockSettings = {};
      const mockDefaults = {
        mmrCalculation: { algorithm: 'PEAK_MMR' },
      };
      vi.mocked(mockGuildSettingsService.getSettings).mockResolvedValue(
        mockSettings as never,
      );
      vi.mocked(mockSettingsDefaults.getDefaults).mockReturnValue(
        mockDefaults as never,
      );
      vi.mocked(mockMmrService.calculateMmr).mockReturnValue(1200);

      const result = await controller.calculate(calculateDto);

      expect(result.algorithm).toBe('PEAK_MMR');
      expect(mockMmrService.calculateMmr).toHaveBeenCalled();
    });

    it('should_throw_bad_request_when_config_missing', async () => {
      const calculateDto = {
        guildId: 'guild-1',
        trackerData: { ones: 1200 },
      };
      const mockSettings = {};
      vi.mocked(mockGuildSettingsService.getSettings).mockResolvedValue(
        mockSettings as never,
      );
      vi.mocked(mockSettingsDefaults.getDefaults).mockReturnValue({} as never);

      await expect(controller.calculate(calculateDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
