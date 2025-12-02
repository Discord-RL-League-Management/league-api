import { Test, TestingModule } from '@nestjs/testing';
import { MmrCalculationService, TrackerData } from './mmr-calculation.service';
import { FormulaValidationService } from './formula-validation.service';
import { MmrCalculationConfig } from '../../guilds/interfaces/settings.interface';

describe('MmrCalculationService', () => {
  let service: MmrCalculationService;
  let formulaValidation: FormulaValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MmrCalculationService, FormulaValidationService],
    }).compile();

    service = module.get<MmrCalculationService>(MmrCalculationService);
    formulaValidation = module.get<FormulaValidationService>(
      FormulaValidationService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateMmr - WEIGHTED_AVERAGE', () => {
    const trackerData: TrackerData = {
      ones: 1200,
      twos: 1400,
      threes: 1600,
      fours: 1000,
      onesGamesPlayed: 150,
      twosGamesPlayed: 300,
      threesGamesPlayed: 500,
      foursGamesPlayed: 50,
    };

    it('should calculate weighted average correctly', () => {
      const config: MmrCalculationConfig = {
        algorithm: 'WEIGHTED_AVERAGE',
        weights: {
          ones: 0.1,
          twos: 0.3,
          threes: 0.5,
          fours: 0.1,
        },
      };

      const result = service.calculateMmr(trackerData, config);
      // Expected: (1200 * 0.1) + (1400 * 0.3) + (1600 * 0.5) + (1000 * 0.1) = 120 + 420 + 800 + 100 = 1440
      expect(result).toBe(1440);
    });

    it('should respect minimum games played threshold', () => {
      const config: MmrCalculationConfig = {
        algorithm: 'WEIGHTED_AVERAGE',
        weights: {
          ones: 0.1,
          twos: 0.3,
          threes: 0.5,
          fours: 0.1,
        },
        minGamesPlayed: {
          ones: 200, // Higher than actual (150)
          twos: 50,
          threes: 50,
          fours: 50,
        },
      };

      const result = service.calculateMmr(trackerData, config);
      // Should exclude ones (150 < 200), so: (1400 * 0.3) + (1600 * 0.5) + (1000 * 0.1) = 420 + 800 + 100 = 1320
      // But weights need to be normalized: total weight = 0.3 + 0.5 + 0.1 = 0.9
      // So: (420 + 800 + 100) / 0.9 = 1320 / 0.9 = 1466.67 ≈ 1467
      expect(result).toBeGreaterThan(1300);
      expect(result).toBeLessThan(1500);
    });

    it('should return 0 if no playlists meet criteria', () => {
      const config: MmrCalculationConfig = {
        algorithm: 'WEIGHTED_AVERAGE',
        weights: {
          ones: 0.1,
        },
        minGamesPlayed: {
          ones: 1000, // Higher than actual
        },
      };

      const result = service.calculateMmr(trackerData, config);
      expect(result).toBe(0);
    });
  });

  describe('calculateMmr - PEAK_MMR', () => {
    const trackerData: TrackerData = {
      ones: 1200,
      twos: 1400,
      threes: 1600,
      fours: 1000,
      onesGamesPlayed: 150,
      twosGamesPlayed: 300,
      threesGamesPlayed: 500,
      foursGamesPlayed: 50,
    };

    it('should return highest MMR', () => {
      const config: MmrCalculationConfig = {
        algorithm: 'PEAK_MMR',
      };

      const result = service.calculateMmr(trackerData, config);
      expect(result).toBe(1600); // Highest is threes
    });

    it('should respect minimum games played threshold', () => {
      const config: MmrCalculationConfig = {
        algorithm: 'PEAK_MMR',
        minGamesPlayed: {
          threes: 1000, // Higher than actual (500)
        },
      };

      const result = service.calculateMmr(trackerData, config);
      // Should exclude threes, so max of remaining: max(1200, 1400, 1000) = 1400
      expect(result).toBe(1400);
    });
  });

  describe('calculateMmr - CUSTOM', () => {
    const trackerData: TrackerData = {
      ones: 1200,
      twos: 1400,
      threes: 1600,
      fours: 1000,
      onesGamesPlayed: 150,
      twosGamesPlayed: 300,
      threesGamesPlayed: 500,
      foursGamesPlayed: 50,
    };

    it('should evaluate custom formula correctly', () => {
      const config: MmrCalculationConfig = {
        algorithm: 'CUSTOM',
        customFormula: '(ones * 0.1 + twos * 0.3 + threes * 0.5 + fours * 0.1)',
      };

      const result = service.calculateMmr(trackerData, config);
      expect(result).toBe(1440);
    });

    it('should throw error for invalid formula', () => {
      const config: MmrCalculationConfig = {
        algorithm: 'CUSTOM',
        customFormula: 'invalid syntax + +',
      };

      expect(() => service.calculateMmr(trackerData, config)).toThrow();
    });

    it('should throw error if custom formula is missing', () => {
      const config: MmrCalculationConfig = {
        algorithm: 'CUSTOM',
      };

      expect(() => service.calculateMmr(trackerData, config)).toThrow(
        'Custom formula is required',
      );
    });
  });

  describe('testFormula', () => {
    it('should test formula with default test data', () => {
      const formula = '(ones * 0.1 + twos * 0.3 + threes * 0.5 + fours * 0.1)';
      const result = service.testFormula(formula);

      expect(result.valid).toBe(true);
      expect(result.result).toBeGreaterThan(0);
      expect(result.testData).toBeDefined();
    });

    it('should test formula with custom test data', () => {
      // Use array syntax for max function
      const formula = 'max([ones, twos, threes, fours])';
      const customData: TrackerData = {
        ones: 1000,
        twos: 2000,
        threes: 1500,
        fours: 800,
        onesGamesPlayed: 100,
        twosGamesPlayed: 200,
        threesGamesPlayed: 150,
        foursGamesPlayed: 80,
      };

      const result = service.testFormula(formula, customData);

      expect(result.valid).toBe(true);
      expect(result.result).toBe(2000); // Max value
      expect(result.testData).toEqual(customData);
    });

    it('should return error for invalid formula', () => {
      const formula = 'invalid + + syntax';
      const result = service.testFormula(formula);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('calculateMmr - Edge Cases and Protections', () => {
    // PROTECTION: Handle missing/null tracker data
    it('should handle missing MMR values gracefully', () => {
      const trackerData: TrackerData = {
        ones: undefined,
        twos: 1400,
        threes: undefined,
        fours: 1000,
      };
      const config: MmrCalculationConfig = {
        algorithm: 'WEIGHTED_AVERAGE',
        weights: {
          twos: 0.5,
          fours: 0.5,
        },
      };

      const result = service.calculateMmr(trackerData, config);
      // Should only use available values: (1400 * 0.5) + (1000 * 0.5) = 1200
      expect(result).toBe(1200);
    });

    it('should handle null MMR values', () => {
      const trackerData: TrackerData = {
        ones: null as any,
        twos: 1400,
        threes: null as any,
        fours: 1000,
      };
      const config: MmrCalculationConfig = {
        algorithm: 'PEAK_MMR',
      };

      const result = service.calculateMmr(trackerData, config);
      expect(result).toBe(1400); // Max of available values
    });

    it('should return 0 when all MMR values are missing for WEIGHTED_AVERAGE', () => {
      const trackerData: TrackerData = {
        ones: undefined,
        twos: undefined,
        threes: undefined,
        fours: undefined,
      };
      const config: MmrCalculationConfig = {
        algorithm: 'WEIGHTED_AVERAGE',
        weights: {
          ones: 0.25,
          twos: 0.25,
          threes: 0.25,
          fours: 0.25,
        },
      };

      const result = service.calculateMmr(trackerData, config);
      expect(result).toBe(0);
    });

    it('should return 0 when all MMR values are missing for PEAK_MMR', () => {
      const trackerData: TrackerData = {
        ones: undefined,
        twos: undefined,
        threes: undefined,
        fours: undefined,
      };
      const config: MmrCalculationConfig = {
        algorithm: 'PEAK_MMR',
      };

      const result = service.calculateMmr(trackerData, config);
      expect(result).toBe(0);
    });

    // INPUT: Test invalid algorithm
    it('should throw error for unknown algorithm', () => {
      const trackerData: TrackerData = {
        ones: 1200,
        twos: 1400,
      };
      const config: MmrCalculationConfig = {
        algorithm: 'INVALID_ALGORITHM' as any,
      };

      expect(() => service.calculateMmr(trackerData, config)).toThrow(
        'Unknown algorithm',
      );
    });

    // INPUT: Test missing config
    it('should throw error when config is missing', () => {
      const trackerData: TrackerData = {
        ones: 1200,
        twos: 1400,
      };

      expect(() => service.calculateMmr(trackerData, null as any)).toThrow(
        'MMR calculation configuration is required',
      );
    });

    // PROTECTION: Handle extreme values
    it('should handle very large MMR values', () => {
      const trackerData: TrackerData = {
        ones: 999999,
        twos: 888888,
      };
      const config: MmrCalculationConfig = {
        algorithm: 'PEAK_MMR',
      };

      const result = service.calculateMmr(trackerData, config);
      expect(result).toBe(999999);
    });

    it('should handle negative MMR values (if tracker provides them)', () => {
      const trackerData: TrackerData = {
        ones: -100,
        twos: 1400,
      };
      const config: MmrCalculationConfig = {
        algorithm: 'PEAK_MMR',
      };

      const result = service.calculateMmr(trackerData, config);
      expect(result).toBe(1400); // Should use the positive value
    });

    // OUTPUT: Verify rounding behavior
    it('should round MMR to integer', () => {
      const trackerData: TrackerData = {
        ones: 1200.7,
        twos: 1400.3,
      };
      const config: MmrCalculationConfig = {
        algorithm: 'WEIGHTED_AVERAGE',
        weights: {
          ones: 0.5,
          twos: 0.5,
        },
      };

      const result = service.calculateMmr(trackerData, config);
      // (1200.7 * 0.5) + (1400.3 * 0.5) = 600.35 + 700.15 = 1300.5 → 1301
      expect(result).toBe(1301);
      expect(Number.isInteger(result)).toBe(true);
    });

    // PROTECTION: Handle zero weights
    it('should handle zero weights correctly', () => {
      const trackerData: TrackerData = {
        ones: 1200,
        twos: 1400,
        threes: 1600,
      };
      const config: MmrCalculationConfig = {
        algorithm: 'WEIGHTED_AVERAGE',
        weights: {
          ones: 0,
          twos: 0.5,
          threes: 0.5,
        },
      };

      const result = service.calculateMmr(trackerData, config);
      // Should exclude ones (weight = 0): (1400 * 0.5) + (1600 * 0.5) = 1500
      expect(result).toBe(1500);
    });
  });
});

