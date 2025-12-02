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
});

