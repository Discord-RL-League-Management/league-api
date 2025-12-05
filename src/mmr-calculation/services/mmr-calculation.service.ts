import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { create, all, MathJsInstance } from 'mathjs';
import { FormulaValidationService } from './formula-validation.service';
import { MmrCalculationConfig } from '../../guilds/interfaces/settings.interface';

/**
 * TrackerData - Data structure for MMR calculation
 */
export interface TrackerData {
  ones?: number;
  twos?: number;
  threes?: number;
  fours?: number;
  onesGamesPlayed?: number;
  twosGamesPlayed?: number;
  threesGamesPlayed?: number;
  foursGamesPlayed?: number;
}

/**
 * MmrCalculationService - Single Responsibility: MMR calculation orchestration
 *
 * Calculates internal MMR based on guild configuration and tracker data.
 * Supports multiple algorithms: WEIGHTED_AVERAGE, PEAK_MMR, and CUSTOM formula.
 */
@Injectable()
export class MmrCalculationService {
  private readonly logger = new Logger(MmrCalculationService.name);
  private readonly math: MathJsInstance;

  constructor(private readonly formulaValidation: FormulaValidationService) {
    // Create sandboxed math.js instance (same as validation service)
    // Use all functions but validation ensures only safe variables are used
    this.math = create(all);
  }

  /**
   * Calculate internal MMR based on guild configuration
   * Single Responsibility: MMR calculation orchestration
   *
   * @param trackerData - Tracker data with MMR and games played
   * @param config - Guild MMR calculation configuration
   * @returns Calculated MMR value (rounded integer)
   */
  calculateMmr(trackerData: TrackerData, config: MmrCalculationConfig): number {
    if (!config || !config.algorithm) {
      throw new BadRequestException(
        'MMR calculation configuration is required',
      );
    }

    switch (config.algorithm) {
      case 'WEIGHTED_AVERAGE':
        return this.calculateWeightedAverage(trackerData, config);
      case 'PEAK_MMR':
        return this.calculatePeakMmr(trackerData, config);
      case 'CUSTOM':
        return this.calculateCustomFormula(trackerData, config);
      case 'ASCENDANCY':
        return this.calculateAscendancy(trackerData, config);
      default:
        throw new BadRequestException(
          `Unknown algorithm: ${String(config.algorithm)}`,
        );
    }
  }

  /**
   * Calculate weighted average MMR
   * Single Responsibility: Weighted average calculation
   */
  private calculateWeightedAverage(
    trackerData: TrackerData,
    config: MmrCalculationConfig,
  ): number {
    const weights = config.weights || {};
    const minGames = config.minGamesPlayed || {};

    let totalWeight = 0;
    let weightedSum = 0;

    const playlists = [
      {
        mmr: trackerData.ones,
        games: trackerData.onesGamesPlayed || 0,
        weight: weights.ones || 0,
        minGames: minGames.ones || 0,
      },
      {
        mmr: trackerData.twos,
        games: trackerData.twosGamesPlayed || 0,
        weight: weights.twos || 0,
        minGames: minGames.twos || 0,
      },
      {
        mmr: trackerData.threes,
        games: trackerData.threesGamesPlayed || 0,
        weight: weights.threes || 0,
        minGames: minGames.threes || 0,
      },
      {
        mmr: trackerData.fours,
        games: trackerData.foursGamesPlayed || 0,
        weight: weights.fours || 0,
        minGames: minGames.fours || 0,
      },
    ];

    for (const playlist of playlists) {
      if (
        playlist.mmr !== undefined &&
        playlist.mmr !== null &&
        playlist.games >= playlist.minGames &&
        playlist.weight > 0
      ) {
        weightedSum += playlist.mmr * playlist.weight;
        totalWeight += playlist.weight;
      }
    }

    if (totalWeight === 0) {
      return 0; // No valid playlists
    }

    return Math.round(weightedSum / totalWeight);
  }

  /**
   * Calculate Ascendancy MMR using 5-step process
   * Single Responsibility: Ascendancy algorithm calculation
   *
   * Steps:
   * 1. Calculate 2s Score = weighted average of Current and Peak (using Q and R)
   * 2. Calculate 3s Score = weighted average of Current and Peak (using Q and R)
   * 3. Calculate 2s% = percentage of games in 2s
   * 4. Calculate 3s% = percentage of games in 3s
   * 5. Final Score = weighted average of 2s Score and 3s Score (using percentages)
   */
  private calculateAscendancy(
    trackerData: TrackerData,
    config: MmrCalculationConfig,
  ): number {
    // Step 1: Get weights (Q and R) - defaults to 0.25 and 0.75
    const weights = config.ascendancyWeights || { current: 0.25, peak: 0.75 };
    const Q = weights.current;
    const R = weights.peak;

    // Step 2: Calculate 2s Score (L)
    // Note: Peak data not available in tracker data structure, using current as both
    const twosCurrent = trackerData.twos || 0;
    const twosPeak = trackerData.twos || 0;
    const twosScore =
      Q + R > 0 ? (twosCurrent * Q + twosPeak * R) / (Q + R) : 0;

    // Step 3: Calculate 3s Score (M)
    // Note: Peak data not available in tracker data structure, using current as both
    const threesCurrent = trackerData.threes || 0;
    const threesPeak = trackerData.threes || 0;
    const threesScore =
      Q + R > 0 ? (threesCurrent * Q + threesPeak * R) / (Q + R) : 0;

    // Step 4: Calculate total games
    const totalGames =
      (trackerData.onesGamesPlayed || 0) +
      (trackerData.twosGamesPlayed || 0) +
      (trackerData.threesGamesPlayed || 0) +
      (trackerData.foursGamesPlayed || 0);

    // Step 5: Calculate 2s% (N)
    const twosPercent =
      totalGames > 0 ? (trackerData.twosGamesPlayed || 0) / totalGames : 0;

    // Step 6: Calculate 3s% (O)
    const threesPercent =
      totalGames > 0 ? (trackerData.threesGamesPlayed || 0) / totalGames : 0;

    // Step 7: Calculate Final Score (P)
    // Weighted average of 2s Score and 3s Score using percentages as weights
    const totalPercent = twosPercent + threesPercent;
    if (totalPercent === 0) {
      // No games in 2s or 3s, return 0
      return 0;
    }

    const finalScore =
      (twosScore * twosPercent + threesScore * threesPercent) / totalPercent;

    return Math.round(finalScore);
  }

  /**
   * Calculate peak MMR (highest MMR across all playlists)
   * Single Responsibility: Peak MMR calculation
   */
  private calculatePeakMmr(
    trackerData: TrackerData,
    config: MmrCalculationConfig,
  ): number {
    const minGames = config.minGamesPlayed || {};

    const mmrs: number[] = [];

    if (
      trackerData.ones !== undefined &&
      trackerData.ones !== null &&
      (trackerData.onesGamesPlayed || 0) >= (minGames.ones || 0)
    ) {
      mmrs.push(trackerData.ones);
    }

    if (
      trackerData.twos !== undefined &&
      trackerData.twos !== null &&
      (trackerData.twosGamesPlayed || 0) >= (minGames.twos || 0)
    ) {
      mmrs.push(trackerData.twos);
    }

    if (
      trackerData.threes !== undefined &&
      trackerData.threes !== null &&
      (trackerData.threesGamesPlayed || 0) >= (minGames.threes || 0)
    ) {
      mmrs.push(trackerData.threes);
    }

    if (
      trackerData.fours !== undefined &&
      trackerData.fours !== null &&
      (trackerData.foursGamesPlayed || 0) >= (minGames.fours || 0)
    ) {
      mmrs.push(trackerData.fours);
    }

    if (mmrs.length === 0) {
      return 0;
    }

    return Math.max(...mmrs);
  }

  /**
   * Calculate MMR using custom formula
   * Single Responsibility: Custom formula evaluation
   */
  private calculateCustomFormula(
    trackerData: TrackerData,
    config: MmrCalculationConfig,
  ): number {
    if (!config.customFormula) {
      throw new BadRequestException(
        'Custom formula is required for CUSTOM algorithm',
      );
    }

    // Validate formula if not already validated
    const validation = this.formulaValidation.validateFormula(
      config.customFormula,
    );
    if (!validation.valid) {
      throw new BadRequestException(`Invalid formula: ${validation.error}`);
    }

    try {
      // Prepare data for formula evaluation
      const formulaData = {
        ones: trackerData.ones || 0,
        twos: trackerData.twos || 0,
        threes: trackerData.threes || 0,
        fours: trackerData.fours || 0,
        onesGames: trackerData.onesGamesPlayed || 0,
        twosGames: trackerData.twosGamesPlayed || 0,
        threesGames: trackerData.threesGamesPlayed || 0,
        foursGames: trackerData.foursGamesPlayed || 0,
        totalGames:
          (trackerData.onesGamesPlayed || 0) +
          (trackerData.twosGamesPlayed || 0) +
          (trackerData.threesGamesPlayed || 0) +
          (trackerData.foursGamesPlayed || 0),
      };

      // Parse and evaluate formula using math.js
      const expr = this.math.parse(config.customFormula);
      const result = expr.evaluate(formulaData) as unknown;

      // Ensure result is a valid number
      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('Formula evaluated to invalid number');
      }

      return Math.round(result);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to evaluate custom formula: ${errorMessage}`,
        error,
      );
      throw new BadRequestException(
        `Formula evaluation failed: ${errorMessage}`,
      );
    }
  }

  /**
   * Test formula with sample data
   * Single Responsibility: Formula testing
   *
   * @param formula - Formula to test
   * @param testData - Optional test data, uses defaults if not provided
   * @returns Test result with calculated MMR
   */
  testFormula(
    formula: string,
    testData?: TrackerData,
  ): {
    result: number;
    testData: TrackerData;
    valid: boolean;
    error?: string;
  } {
    const validation = this.formulaValidation.validateFormula(formula);
    if (!validation.valid) {
      return {
        result: 0,
        testData: testData || this.getDefaultTestData(),
        valid: false,
        error: validation.error,
      };
    }

    const data = testData || this.getDefaultTestData();
    try {
      const result = this.calculateCustomFormula(data, {
        algorithm: 'CUSTOM',
        customFormula: formula,
      });
      return {
        result,
        testData: data,
        valid: true,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        result: 0,
        testData: data,
        valid: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get default test data
   * Single Responsibility: Test data provision
   */
  private getDefaultTestData(): TrackerData {
    return {
      ones: 1200,
      twos: 1400,
      threes: 1600,
      fours: 1000,
      onesGamesPlayed: 150,
      twosGamesPlayed: 300,
      threesGamesPlayed: 500,
      foursGamesPlayed: 50,
    };
  }
}
