/**
 * MmrCalculationController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MmrCalculationController } from './mmr-calculation.controller';
import { MmrCalculationService } from './services/mmr-calculation.service';
import { FormulaValidationService } from '../formula-validation/services/formula-validation/formula-validation.service';
import { GuildSettingsService } from '../guilds/guild-settings.service';
import { SettingsDefaultsService } from '../guilds/services/settings-defaults.service';
import { TestFormulaDto } from './dto/test-formula.dto';
import { ValidateFormulaDto } from './dto/validate-formula.dto';
import { CalculateMmrDto } from './dto/calculate-mmr.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GuildAdminGuard } from '../guilds/guards/guild-admin.guard';

describe('MmrCalculationController', () => {
  let controller: MmrCalculationController;
  let mockMmrService: MmrCalculationService;
  let mockFormulaValidation: FormulaValidationService;
  let mockGuildSettingsService: GuildSettingsService;
  let mockSettingsDefaults: SettingsDefaultsService;

  const mockMmrConfig = {
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
      testFormula: vi.fn(),
      calculateMmr: vi.fn(),
    } as unknown as MmrCalculationService;

    mockFormulaValidation = {
      validateFormula: vi.fn(),
    } as unknown as FormulaValidationService;

    mockGuildSettingsService = {
      getSettings: vi.fn(),
    } as unknown as GuildSettingsService;

    mockSettingsDefaults = {
      getDefaults: vi.fn().mockReturnValue({
        mmrCalculation: mockMmrConfig,
      }),
    } as unknown as SettingsDefaultsService;

    const module = await Test.createTestingModule({
      controllers: [MmrCalculationController],
      providers: [
        { provide: MmrCalculationService, useValue: mockMmrService },
        {
          provide: FormulaValidationService,
          useValue: mockFormulaValidation,
        },
        { provide: GuildSettingsService, useValue: mockGuildSettingsService },
        { provide: SettingsDefaultsService, useValue: mockSettingsDefaults },
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

    controller = module.get<MmrCalculationController>(MmrCalculationController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('testFormula', () => {
    it('should_test_formula_when_valid_data_provided', async () => {
      const testDto: TestFormulaDto = {
        formula: 'ones * 0.5 + twos * 0.5',
        testData: { ones: 1500, twos: 1600 },
      };
      const mockResult = { result: 1550 };
      vi.spyOn(mockMmrService, 'testFormula').mockReturnValue(
        mockResult as never,
      );

      const result = controller.testFormula(testDto);

      expect(result).toEqual(mockResult);
      expect(mockMmrService.testFormula).toHaveBeenCalledWith(
        testDto.formula,
        testDto.testData,
      );
    });
  });

  describe('validateFormula', () => {
    it('should_validate_formula_when_valid', async () => {
      const validateDto: ValidateFormulaDto = {
        formula: 'ones * 0.5 + twos * 0.5',
      };
      const mockResult = { valid: true };
      vi.spyOn(mockFormulaValidation, 'validateFormula').mockReturnValue(
        mockResult as never,
      );

      const result = controller.validateFormula(validateDto);

      expect(result).toEqual(mockResult);
      expect(mockFormulaValidation.validateFormula).toHaveBeenCalledWith(
        validateDto.formula,
      );
    });
  });

  describe('calculateMmr', () => {
    it('should_calculate_mmr_when_guild_settings_exist', async () => {
      const calculateDto: CalculateMmrDto = {
        guildId: 'guild_123',
        trackerData: {
          ones: 1500,
          twos: 1600,
          threes: 1700,
          fours: 1400,
        },
      };
      vi.spyOn(mockGuildSettingsService, 'getSettings').mockResolvedValue({
        mmrCalculation: mockMmrConfig,
      } as never);
      vi.spyOn(mockMmrService, 'calculateMmr').mockReturnValue(1600);

      const result = await controller.calculateMmr(calculateDto);

      expect(result.result).toBe(1600);
      expect(result.algorithm).toBe('WEIGHTED_AVERAGE');
      expect(result.config).toEqual(mockMmrConfig);
      expect(mockMmrService.calculateMmr).toHaveBeenCalledWith(
        calculateDto.trackerData,
        mockMmrConfig,
      );
    });

    it('should_use_default_config_when_guild_settings_missing', async () => {
      const calculateDto: CalculateMmrDto = {
        guildId: 'guild_123',
        trackerData: {
          ones: 1500,
          twos: 1600,
        },
      };
      vi.spyOn(mockGuildSettingsService, 'getSettings').mockResolvedValue({
        mmrCalculation: undefined,
      } as never);
      vi.spyOn(mockMmrService, 'calculateMmr').mockReturnValue(1550);

      const result = await controller.calculateMmr(calculateDto);

      expect(result.result).toBe(1550);
      expect(mockMmrService.calculateMmr).toHaveBeenCalledWith(
        calculateDto.trackerData,
        mockMmrConfig,
      );
    });

    it('should_throw_exception_when_no_config_available', async () => {
      const calculateDto: CalculateMmrDto = {
        guildId: 'guild_123',
        trackerData: { ones: 1500 },
      };
      vi.spyOn(mockGuildSettingsService, 'getSettings').mockResolvedValue({
        mmrCalculation: undefined,
      } as never);
      vi.spyOn(mockSettingsDefaults, 'getDefaults').mockReturnValue({
        mmrCalculation: undefined,
      } as never);

      await expect(controller.calculateMmr(calculateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should_throw_exception_when_guild_not_found', async () => {
      const calculateDto: CalculateMmrDto = {
        guildId: 'guild_123',
        trackerData: { ones: 1500 },
      };
      vi.spyOn(mockGuildSettingsService, 'getSettings').mockRejectedValue(
        new NotFoundException('Guild not found'),
      );

      await expect(controller.calculateMmr(calculateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should_handle_calculation_errors_gracefully', async () => {
      const calculateDto: CalculateMmrDto = {
        guildId: 'guild_123',
        trackerData: { ones: 1500 },
      };
      vi.spyOn(mockGuildSettingsService, 'getSettings').mockResolvedValue({
        mmrCalculation: mockMmrConfig,
      } as never);
      vi.spyOn(mockMmrService, 'calculateMmr').mockImplementation(() => {
        throw new Error('Calculation error');
      });

      await expect(controller.calculateMmr(calculateDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
