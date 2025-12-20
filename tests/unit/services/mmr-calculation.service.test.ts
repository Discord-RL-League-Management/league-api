/**
 * MMR Calculation Service Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { MmrCalculationService } from '@/mmr-calculation/services/mmr-calculation.service';
import { FormulaValidationService } from '@/mmr-calculation/services/formula-validation.service';
import type { TrackerData } from '@/mmr-calculation/services/mmr-calculation.service';
import type { MmrCalculationConfig } from '@/guilds/interfaces/settings.interface';

describe('MmrCalculationService', () => {
  let service: MmrCalculationService;
  let mockFormulaValidation: FormulaValidationService;

  beforeEach(() => {
    // ARRANGE: Setup test dependencies
    // Mock external dependency (FormulaValidationService)
    mockFormulaValidation = {
      validateFormula: vi.fn().mockReturnValue({ valid: true }),
    } as unknown as FormulaValidationService;

    service = new MmrCalculationService(mockFormulaValidation);
  });

  describe('calculateMmr - WEIGHTED_AVERAGE algorithm', () => {
    it('should_calculate_weighted_average_mmr_with_valid_data', () => {
      // ARRANGE: Prepare test data
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

      // ACT: Execute the function
      const result = service.calculateMmr(trackerData, config);

      // ASSERT: Verify the result (state verification)
      // Expected: (1200 * 0.2 + 1400 * 0.3 + 1600 * 0.5) / (0.2 + 0.3 + 0.5)
      // = (240 + 420 + 800) / 1.0 = 1460
      expect(result).toBe(1460);
    });

    it('should_return_zero_when_no_valid_playlists_meet_min_games', () => {
      // ARRANGE
      const trackerData: TrackerData = {
        ones: 1200,
        onesGamesPlayed: 10, // Below minimum
      };

      const config: MmrCalculationConfig = {
        algorithm: 'WEIGHTED_AVERAGE',
        weights: { ones: 1.0 },
        minGamesPlayed: { ones: 50 },
      };

      // ACT
      const result = service.calculateMmr(trackerData, config);

      // ASSERT
      expect(result).toBe(0);
    });
  });

  describe('calculateMmr - PEAK_MMR algorithm', () => {
    it('should_return_highest_mmr_across_all_playlists', () => {
      // ARRANGE
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

      // ACT
      const result = service.calculateMmr(trackerData, config);

      // ASSERT
      expect(result).toBe(1800); // Highest MMR
    });
  });

  describe('calculateMmr - CUSTOM algorithm', () => {
    it('should_calculate_mmr_using_custom_formula', () => {
      // ARRANGE
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

      // Mock validation to return valid
      vi.mocked(mockFormulaValidation.validateFormula).mockReturnValue({
        valid: true,
      });

      // ACT
      const result = service.calculateMmr(trackerData, config);

      // ASSERT
      // Expected: (1400 + 1600) / 2 = 1500
      expect(result).toBe(1500);
      expect(mockFormulaValidation.validateFormula).toHaveBeenCalledWith(
        config.customFormula,
      );
    });

    it('should_throw_exception_when_custom_formula_is_invalid', () => {
      // ARRANGE
      const trackerData: TrackerData = {
        twos: 1400,
        twosGamesPlayed: 200,
      };

      const config: MmrCalculationConfig = {
        algorithm: 'CUSTOM',
        customFormula: 'invalid formula',
      };

      // Mock validation to return invalid
      vi.mocked(mockFormulaValidation.validateFormula).mockReturnValue({
        valid: false,
        error: 'Invalid formula syntax',
      });

      // ACT & ASSERT
      expect(() => service.calculateMmr(trackerData, config)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('calculateMmr - error handling', () => {
    it('should_throw_exception_when_config_is_missing', () => {
      // ARRANGE
      const trackerData: TrackerData = { ones: 1200 };

      // ACT & ASSERT
      expect(() =>
        service.calculateMmr(
          trackerData,
          null as unknown as MmrCalculationConfig,
        ),
      ).toThrow(BadRequestException);
    });

    it('should_throw_exception_when_algorithm_is_unknown', () => {
      // ARRANGE
      const trackerData: TrackerData = { ones: 1200 };
      const config = {
        algorithm: 'UNKNOWN_ALGORITHM',
      } as unknown as MmrCalculationConfig;

      // ACT & ASSERT
      expect(() => service.calculateMmr(trackerData, config)).toThrow(
        BadRequestException,
      );
    });
  });
});
