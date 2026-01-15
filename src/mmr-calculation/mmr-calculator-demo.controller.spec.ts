/**
 * MMRCalculatorDemoController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MMRCalculatorDemoController } from './mmr-calculator-demo.controller';
import { MmrCalculationService } from './services/mmr-calculation.service';
import { GuildSettingsService } from '../guilds/guild-settings.service';
import { SettingsDefaultsService } from '../guilds/services/settings-defaults.service';
import { CalculateMmrDto } from './dto/calculate-mmr.dto';
import type { MmrCalculationConfig } from '../guilds/interfaces/settings.interface';

describe('MMRCalculatorDemoController', () => {
  let controller: MMRCalculatorDemoController;
  let mockMmrService: MmrCalculationService;
  let mockGuildSettingsService: GuildSettingsService;
  let mockSettingsDefaults: SettingsDefaultsService;

  const mockTrackerData = {
    ones: 1200,
    twos: 1400,
    threes: 1600,
    fours: 1000,
    onesGamesPlayed: 150,
    twosGamesPlayed: 300,
    threesGamesPlayed: 500,
    foursGamesPlayed: 50,
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
        { provide: GuildSettingsService, useValue: mockGuildSettingsService },
        { provide: SettingsDefaultsService, useValue: mockSettingsDefaults },
      ],
    }).compile();

    controller = module.get<MMRCalculatorDemoController>(
      MMRCalculatorDemoController,
    );
  });

  describe('calculate', () => {
    it('should_calculate_mmr_when_valid_data_and_guild_settings_exist', async () => {
      const calculateDto: CalculateMmrDto = {
        guildId: 'guild-123',
        trackerData: mockTrackerData,
      };

      const mockSettings = {
        mmrCalculation: mockMmrConfig,
      };

      vi.spyOn(mockGuildSettingsService, 'getSettings').mockResolvedValue(
        mockSettings as never,
      );
      vi.spyOn(mockMmrService, 'calculateMmr').mockReturnValue(1500);

      const result = await controller.calculate(calculateDto);

      expect(result).toEqual({
        result: 1500,
        algorithm: 'WEIGHTED_AVERAGE',
        config: mockMmrConfig,
      });
      expect(mockGuildSettingsService.getSettings).toHaveBeenCalledWith(
        'guild-123',
      );
      expect(mockMmrService.calculateMmr).toHaveBeenCalledWith(
        mockTrackerData,
        mockMmrConfig,
      );
    });

    it('should_use_default_config_when_guild_settings_have_no_mmr_config', async () => {
      const calculateDto: CalculateMmrDto = {
        guildId: 'guild-123',
        trackerData: mockTrackerData,
      };

      const mockSettings = {};
      const defaultConfig: MmrCalculationConfig = {
        algorithm: 'PEAK_MMR',
        minGamesPlayed: {
          ones: 50,
          twos: 50,
          threes: 50,
          fours: 50,
        },
      };

      vi.spyOn(mockGuildSettingsService, 'getSettings').mockResolvedValue(
        mockSettings as never,
      );
      vi.spyOn(mockSettingsDefaults, 'getDefaults').mockReturnValue({
        mmrCalculation: defaultConfig,
      } as never);
      vi.spyOn(mockMmrService, 'calculateMmr').mockReturnValue(1600);

      const result = await controller.calculate(calculateDto);

      expect(result).toEqual({
        result: 1600,
        algorithm: 'PEAK_MMR',
        config: defaultConfig,
      });
      expect(mockSettingsDefaults.getDefaults).toHaveBeenCalled();
      expect(mockMmrService.calculateMmr).toHaveBeenCalledWith(
        mockTrackerData,
        defaultConfig,
      );
    });

    it('should_throw_bad_request_when_no_mmr_config_available', async () => {
      const calculateDto: CalculateMmrDto = {
        guildId: 'guild-123',
        trackerData: mockTrackerData,
      };

      const mockSettings = {};

      vi.spyOn(mockGuildSettingsService, 'getSettings').mockResolvedValue(
        mockSettings as never,
      );
      vi.spyOn(mockSettingsDefaults, 'getDefaults').mockReturnValue(
        {} as never,
      );

      await expect(controller.calculate(calculateDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockMmrService.calculateMmr).not.toHaveBeenCalled();
    });

    it('should_throw_not_found_when_guild_not_found', async () => {
      const calculateDto: CalculateMmrDto = {
        guildId: 'guild-123',
        trackerData: mockTrackerData,
      };

      vi.spyOn(mockGuildSettingsService, 'getSettings').mockRejectedValue(
        new NotFoundException('Guild not found'),
      );

      await expect(controller.calculate(calculateDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockMmrService.calculateMmr).not.toHaveBeenCalled();
    });

    it('should_throw_bad_request_when_mmr_calculation_fails', async () => {
      const calculateDto: CalculateMmrDto = {
        guildId: 'guild-123',
        trackerData: mockTrackerData,
      };

      const mockSettings = {
        mmrCalculation: mockMmrConfig,
      };

      vi.spyOn(mockGuildSettingsService, 'getSettings').mockResolvedValue(
        mockSettings as never,
      );
      vi.spyOn(mockMmrService, 'calculateMmr').mockImplementation(() => {
        throw new BadRequestException('Invalid tracker data');
      });

      await expect(controller.calculate(calculateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should_throw_bad_request_when_unknown_error_occurs', async () => {
      const calculateDto: CalculateMmrDto = {
        guildId: 'guild-123',
        trackerData: mockTrackerData,
      };

      vi.spyOn(mockGuildSettingsService, 'getSettings').mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.calculate(calculateDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockMmrService.calculateMmr).not.toHaveBeenCalled();
    });

    it('should_handle_custom_algorithm_config', async () => {
      const calculateDto: CalculateMmrDto = {
        guildId: 'guild-123',
        trackerData: mockTrackerData,
      };

      const customConfig: MmrCalculationConfig = {
        algorithm: 'CUSTOM',
        customFormula: '(ones + twos + threes + fours) / 4',
      };

      const mockSettings = {
        mmrCalculation: customConfig,
      };

      vi.spyOn(mockGuildSettingsService, 'getSettings').mockResolvedValue(
        mockSettings as never,
      );
      vi.spyOn(mockMmrService, 'calculateMmr').mockReturnValue(1300);

      const result = await controller.calculate(calculateDto);

      expect(result).toEqual({
        result: 1300,
        algorithm: 'CUSTOM',
        config: customConfig,
      });
      expect(mockMmrService.calculateMmr).toHaveBeenCalledWith(
        mockTrackerData,
        customConfig,
      );
    });

    it('should_handle_ascendancy_algorithm_config', async () => {
      const calculateDto: CalculateMmrDto = {
        guildId: 'guild-123',
        trackerData: mockTrackerData,
      };

      const ascendancyConfig: MmrCalculationConfig = {
        algorithm: 'ASCENDANCY',
        ascendancyWeights: {
          current: 0.25,
          peak: 0.75,
        },
      };

      const mockSettings = {
        mmrCalculation: ascendancyConfig,
      };

      vi.spyOn(mockGuildSettingsService, 'getSettings').mockResolvedValue(
        mockSettings as never,
      );
      vi.spyOn(mockMmrService, 'calculateMmr').mockReturnValue(1550);

      const result = await controller.calculate(calculateDto);

      expect(result).toEqual({
        result: 1550,
        algorithm: 'ASCENDANCY',
        config: ascendancyConfig,
      });
      expect(mockMmrService.calculateMmr).toHaveBeenCalledWith(
        mockTrackerData,
        ascendancyConfig,
      );
    });
  });
});
