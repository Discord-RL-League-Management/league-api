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
import type { TrackerData, AscendancyData } from './mmr-calculation.service';
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
        twosPeak: 1800,
        threesPeak: 2000,
        onesGamesPlayed: 100,
        twosGamesPlayed: 300,
        threesGamesPlayed: 500,
        foursGamesPlayed: 100,
      };

      const config: MmrCalculationConfig = {
        algorithm: 'ASCENDANCY',
      };

      const result = service.calculateMmr(trackerData, config);

      // 2s Score = (1400 * 0.25 + 1800 * 0.75) / 1.0 = 1700
      // 3s Score = (1600 * 0.25 + 2000 * 0.75) / 1.0 = 1900
      // 2s% = 300 / 1000 = 0.3
      // 3s% = 500 / 1000 = 0.5
      // Final = (1700 * 0.3 + 1900 * 0.5) / 0.8 = (510 + 950) / 0.8 = 1825
      expect(result).toBe(1825);
    });

    it('should_calculate_ascendancy_mmr_with_custom_weights', () => {
      const trackerData: TrackerData = {
        twos: 1400,
        threes: 1600,
        twosPeak: 1800,
        threesPeak: 2000,
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

      // 2s Score = (1400 * 0.5 + 1800 * 0.5) / 1.0 = 1600
      // 3s Score = (1600 * 0.5 + 2000 * 0.5) / 1.0 = 1800
      // 2s% = 300 / 1000 = 0.3
      // 3s% = 500 / 1000 = 0.5
      // Final = (1600 * 0.3 + 1800 * 0.5) / 0.8 = (480 + 900) / 0.8 = 1725
      expect(result).toBe(1725);
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

    it('should_fallback_to_current_mmr_when_peak_is_missing', () => {
      const trackerData: TrackerData = {
        twos: 1400,
        threes: 1600,
        onesGamesPlayed: 100,
        twosGamesPlayed: 300,
        threesGamesPlayed: 500,
        foursGamesPlayed: 100,
        // No peak data
      };

      const config: MmrCalculationConfig = {
        algorithm: 'ASCENDANCY',
      };

      const result = service.calculateMmr(trackerData, config);

      // Should fallback to current MMR when peak is missing
      // 2s Score = (1400 * 0.25 + 1400 * 0.75) / 1.0 = 1400
      // 3s Score = (1600 * 0.25 + 1600 * 0.75) / 1.0 = 1600
      // 2s% = 300 / 1000 = 0.3
      // 3s% = 500 / 1000 = 0.5
      // Final = (1400 * 0.3 + 1600 * 0.5) / 0.8 = 1525
      expect(result).toBe(1525);
    });

    it('should_calculate_ascendancy_mmr_with_previous_season_games', () => {
      // Test data from CSV: Nuitary
      // 2s Current: 1164, 2s Peak: 1333, 2s Games C: 529, 2s Games P: 371
      // 3s Current: 947, 3s Peak: 1179, 3s Games C: 51, 3s Games P: 81
      // Expected: 2s Score: 1290.75, 3s Score: 1121, Raw Score: 1269, Salary: 1275
      const ascendancyData: AscendancyData = {
        mmr2sCurrent: 1164,
        mmr2sPeak: 1333,
        games2sCurrSeason: 529,
        games2sPrevSeason: 371,
        mmr3sCurrent: 947,
        mmr3sPeak: 1179,
        games3sCurrSeason: 51,
        games3sPrevSeason: 81,
      };

      const config: MmrCalculationConfig = {
        algorithm: 'ASCENDANCY',
      };

      const result = service.calculateAscendancyMmr(ascendancyData, config);

      // Total 2s games = 529 + 371 = 900
      // Total 3s games = 51 + 81 = 132
      // Total games = 900 + 132 = 1032
      // 2s Score = (1164 * 0.25 + 1333 * 0.75) = 1290.75
      // 3s Score = (947 * 0.25 + 1179 * 0.75) = 1121
      // 2s% = 900 / 1032 = 0.8721... (87%)
      // 3s% = 132 / 1032 = 0.1279... (13%)
      // Final = weightedAverage([1290.75, 1121], [0.8721, 0.1279]) ≈ 1269.04 → 1269
      // CSV Raw Score: 1269, CSV Salary: 1275 (Salary has additional rounding logic)
      expect(result).toBe(1269);
    });

    it('should_calculate_ascendancy_mmr_with_csv_data_figgbot', () => {
      // Test data from CSV: figgbot
      // 2s Current: 1711, 2s Peak: 1768, 2s Games C: 465, 2s Games P: 132
      // 3s Current: 1274, 3s Peak: 1308, 3s Games C: 84, 3s Games P: 9
      // Expected: Raw Score: 1693, Salary: 1700
      const ascendancyData: AscendancyData = {
        mmr2sCurrent: 1711,
        mmr2sPeak: 1768,
        games2sCurrSeason: 465,
        games2sPrevSeason: 132,
        mmr3sCurrent: 1274,
        mmr3sPeak: 1308,
        games3sCurrSeason: 84,
        games3sPrevSeason: 9,
      };

      const config: MmrCalculationConfig = {
        algorithm: 'ASCENDANCY',
      };

      const result = service.calculateAscendancyMmr(ascendancyData, config);

      // Expected Raw Score: 1692.525 → 1693, CSV Salary: 1700 (Salary has additional rounding logic)
      expect(result).toBe(1693);
    });

    it('should_calculate_ascendancy_mmr_with_csv_data_reign', () => {
      // Test data from CSV: reign
      // 2s Current: 1394, 2s Peak: 1509, 2s Games C: 63, 2s Games P: 136
      // 3s Current: 1296, 3s Peak: 1353, 3s Games C: 72, 3s Games P: 146
      // Expected: Raw Score: 1406, Salary: 1400
      const ascendancyData: AscendancyData = {
        mmr2sCurrent: 1394,
        mmr2sPeak: 1509,
        games2sCurrSeason: 63,
        games2sPrevSeason: 136,
        mmr3sCurrent: 1296,
        mmr3sPeak: 1353,
        games3sCurrSeason: 72,
        games3sPrevSeason: 146,
      };

      const config: MmrCalculationConfig = {
        algorithm: 'ASCENDANCY',
      };

      const result = service.calculateAscendancyMmr(ascendancyData, config);

      // Expected Raw Score: 1406.28 → 1406, CSV Salary: 1400 (Salary has additional rounding logic)
      expect(result).toBe(1406);
    });

    it('should_use_peak_in_custom_formula', () => {
      const trackerData: TrackerData = {
        ones: 1200,
        twos: 1400,
        threes: 1600,
        onesPeak: 1300,
        twosPeak: 1500,
        threesPeak: 1700,
        onesGamesPlayed: 100,
        twosGamesPlayed: 200,
        threesGamesPlayed: 300,
      };

      const config: MmrCalculationConfig = {
        algorithm: 'CUSTOM',
        customFormula: '(onesPeak + twosPeak + threesPeak) / 3',
      };

      vi.mocked(mockFormulaValidation.validateFormula).mockReturnValue({
        valid: true,
      });

      const result = service.calculateMmr(trackerData, config);

      // (1300 + 1500 + 1700) / 3 = 1500
      expect(result).toBe(1500);
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
