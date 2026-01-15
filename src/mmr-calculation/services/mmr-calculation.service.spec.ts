/**
 * MMR Calculation Service Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { MmrCalculationService } from './mmr-calculation.service';
import { FormulaValidationService } from '../../formula-validation/services/formula-validation/formula-validation.service';
import type { TrackerData } from './mmr-calculation.service';
import type { MmrCalculationConfig } from '@/guilds/interfaces/settings.interface';

describe('MmrCalculationService', () => {
  let service: MmrCalculationService;
  let mockFormulaValidation: FormulaValidationService;

  beforeEach(() => {
    // Mock external dependency (FormulaValidationService)
    mockFormulaValidation = {
      validateFormula: vi.fn().mockReturnValue({ valid: true }),
    } as unknown as FormulaValidationService;

    service = new MmrCalculationService(mockFormulaValidation);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateMmr - WEIGHTED_AVERAGE algorithm', () => {
    it('should_calculate_weighted_average_mmr_with_valid_data', () => {
      const trackerData: TrackerData = {
        ones: 1200,
        twos: 1400,
        threes: 1600,
        onesGamesPlayed: 100,
        twosGamesPlayed: 200,
        threesGamesPlayed: 150,
      };

      const config: MmrCalculationConfig = {
        algorithm: 'WEIGHTED_AVERAGE',
        weights: {
          ones: 0.2,
          twos: 0.3,
          threes: 0.5,
        },
        minGamesPlayed: {
          ones: 50,
          twos: 100,
          threes: 100,
        },
      };

      const result = service.calculateMmr(trackerData, config);

      // Expected: (1200 * 0.2 + 1400 * 0.3 + 1600 * 0.5) / (0.2 + 0.3 + 0.5)
      // = (240 + 420 + 800) / 1.0 = 1460
      expect(result).toBe(1460);
    });

    it('should_return_zero_when_no_valid_playlists_meet_min_games', () => {
      const trackerData: TrackerData = {
        ones: 1200,
        onesGamesPlayed: 10, // Below minimum
      };

      const config: MmrCalculationConfig = {
        algorithm: 'WEIGHTED_AVERAGE',
        weights: { ones: 1.0 },
        minGamesPlayed: { ones: 50 },
      };

      const result = service.calculateMmr(trackerData, config);

      expect(result).toBe(0);
    });
  });

  describe('calculateMmr - PEAK_MMR algorithm', () => {
    it('should_return_highest_mmr_across_all_playlists', () => {
      const trackerData: TrackerData = {
        ones: 1200,
        twos: 1800,
        threes: 1600,
        onesGamesPlayed: 100,
        twosGamesPlayed: 200,
        threesGamesPlayed: 150,
      };

      const config: MmrCalculationConfig = {
        algorithm: 'PEAK_MMR',
        minGamesPlayed: {
          ones: 50,
          twos: 100,
          threes: 100,
        },
      };

      const result = service.calculateMmr(trackerData, config);

      expect(result).toBe(1800); // Highest MMR
    });
  });

  describe('calculateMmr - CUSTOM algorithm', () => {
    it('should_calculate_mmr_using_custom_formula', () => {
      const trackerData: TrackerData = {
        twos: 1400,
        threes: 1600,
        twosGamesPlayed: 200,
        threesGamesPlayed: 300,
      };

      const config: MmrCalculationConfig = {
        algorithm: 'CUSTOM',
        customFormula: '(twos + threes) / 2',
      };

      vi.mocked(mockFormulaValidation.validateFormula).mockReturnValue({
        valid: true,
      });

      const result = service.calculateMmr(trackerData, config);

      // Expected: (1400 + 1600) / 2 = 1500
      expect(result).toBe(1500);
      expect(mockFormulaValidation.validateFormula).toHaveBeenCalledWith(
        config.customFormula,
      );
    });

    it('should_throw_exception_when_custom_formula_is_invalid', () => {
      const trackerData: TrackerData = {
        twos: 1400,
        twosGamesPlayed: 200,
      };

      const config: MmrCalculationConfig = {
        algorithm: 'CUSTOM',
        customFormula: 'invalid formula',
      };

      vi.mocked(mockFormulaValidation.validateFormula).mockReturnValue({
        valid: false,
        error: 'Invalid formula syntax',
      });

      expect(() => service.calculateMmr(trackerData, config)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('calculateMmr - ASCENDANCY algorithm', () => {
    it('should_calculate_ascendancy_mmr_with_default_weights', () => {
      const trackerData: TrackerData = {
        twos: 1400,
        threes: 1600,
        onesGamesPlayed: 100,
        twosGamesPlayed: 300,
        threesGamesPlayed: 500,
        foursGamesPlayed: 100,
      };

      const config: MmrCalculationConfig = {
        algorithm: 'ASCENDANCY',
      };

      const result = service.calculateMmr(trackerData, config);

      // 2s Score = (1400 * 0.25 + 1400 * 0.75) / 1.0 = 1400
      // 3s Score = (1600 * 0.25 + 1600 * 0.75) / 1.0 = 1600
      // 2s% = 300 / 1000 = 0.3
      // 3s% = 500 / 1000 = 0.5
      // Final = (1400 * 0.3 + 1600 * 0.5) / 0.8 = (420 + 800) / 0.8 = 1525
      expect(result).toBe(1525);
    });

    it('should_calculate_ascendancy_mmr_with_custom_weights', () => {
      const trackerData: TrackerData = {
        twos: 1400,
        threes: 1600,
        onesGamesPlayed: 100,
        twosGamesPlayed: 300,
        threesGamesPlayed: 500,
        foursGamesPlayed: 100,
      };

      const config: MmrCalculationConfig = {
        algorithm: 'ASCENDANCY',
        ascendancyWeights: {
          current: 0.5,
          peak: 0.5,
        },
      };

      const result = service.calculateMmr(trackerData, config);

      // 2s Score = (1400 * 0.5 + 1400 * 0.5) / 1.0 = 1400
      // 3s Score = (1600 * 0.5 + 1600 * 0.5) / 1.0 = 1600
      // 2s% = 300 / 1000 = 0.3
      // 3s% = 500 / 1000 = 0.5
      // Final = (1400 * 0.3 + 1600 * 0.5) / 0.8 = 1525
      expect(result).toBe(1525);
    });

    it('should_return_zero_when_no_games_played', () => {
      const trackerData: TrackerData = {
        twos: 1400,
        threes: 1600,
        onesGamesPlayed: 0,
        twosGamesPlayed: 0,
        threesGamesPlayed: 0,
        foursGamesPlayed: 0,
      };

      const config: MmrCalculationConfig = {
        algorithm: 'ASCENDANCY',
      };

      const result = service.calculateMmr(trackerData, config);

      expect(result).toBe(0);
    });
  });

  describe('testFormula', () => {
    it('should_test_valid_formula_with_default_data', () => {
      const formula = '(ones + twos + threes + fours) / 4';

      vi.mocked(mockFormulaValidation.validateFormula).mockReturnValue({
        valid: true,
      });

      const result = service.testFormula(formula);

      expect(result.valid).toBe(true);
      expect(result.result).toBeGreaterThan(0);
      expect(result.testData).toBeDefined();
      expect(mockFormulaValidation.validateFormula).toHaveBeenCalledWith(
        formula,
      );
    });

    it('should_test_valid_formula_with_custom_data', () => {
      const formula = '(twos * 2 + threes) / 3';
      const customData: TrackerData = {
        twos: 1500,
        threes: 1600,
        twosGamesPlayed: 200,
        threesGamesPlayed: 300,
      };

      vi.mocked(mockFormulaValidation.validateFormula).mockReturnValue({
        valid: true,
      });

      const result = service.testFormula(formula, customData);

      expect(result.valid).toBe(true);
      expect(result.result).toBeGreaterThan(0);
      expect(result.testData).toEqual(customData);
    });

    it('should_return_invalid_result_when_formula_is_invalid', () => {
      const formula = 'invalid formula syntax';

      vi.mocked(mockFormulaValidation.validateFormula).mockReturnValue({
        valid: false,
        error: 'Invalid syntax',
      });

      const result = service.testFormula(formula);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid syntax');
      expect(result.result).toBe(0);
    });

    it('should_return_invalid_result_when_formula_evaluation_fails', () => {
      const formula = 'ones / 0'; // Division by zero

      vi.mocked(mockFormulaValidation.validateFormula).mockReturnValue({
        valid: true,
      });

      const result = service.testFormula(formula);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.result).toBe(0);
    });
  });

  describe('calculateMmr - error handling', () => {
    it('should_throw_exception_when_config_is_missing', () => {
      const trackerData: TrackerData = { ones: 1200 };

      expect(() =>
        service.calculateMmr(
          trackerData,
          null as unknown as MmrCalculationConfig,
        ),
      ).toThrow(BadRequestException);
    });

    it('should_throw_exception_when_algorithm_is_unknown', () => {
      const trackerData: TrackerData = { ones: 1200 };
      const config = {
        algorithm: 'UNKNOWN_ALGORITHM',
      } as unknown as MmrCalculationConfig;

      expect(() => service.calculateMmr(trackerData, config)).toThrow(
        BadRequestException,
      );
    });

    it('should_throw_exception_when_custom_formula_is_missing', () => {
      const trackerData: TrackerData = { ones: 1200 };
      const config: MmrCalculationConfig = {
        algorithm: 'CUSTOM',
      };

      expect(() => service.calculateMmr(trackerData, config)).toThrow(
        BadRequestException,
      );
    });

    it('should_throw_exception_when_formula_evaluates_to_invalid_number', () => {
      const trackerData: TrackerData = { ones: 1200 };
      const config: MmrCalculationConfig = {
        algorithm: 'CUSTOM',
        customFormula: 'Math.sqrt(-1)', // Returns NaN
      };

      vi.mocked(mockFormulaValidation.validateFormula).mockReturnValue({
        valid: true,
      });

      expect(() => service.calculateMmr(trackerData, config)).toThrow(
        BadRequestException,
      );
    });
  });
});
