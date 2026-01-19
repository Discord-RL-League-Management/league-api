import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { create, all, MathJsInstance } from 'mathjs';
import { FormulaValidationService } from '../../formula-validation/services/formula-validation/formula-validation.service';
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
  onesPeak?: number;
  twosPeak?: number;
  threesPeak?: number;
  foursPeak?: number;
}

/**
 * AscendancyData - Data structure for ASCENDANCY MMR calculation
 */
export interface AscendancyData {
  mmr2sCurrent: number;
  mmr2sPeak: number;
  games2sCurrSeason: number;
  games2sPrevSeason: number;
  mmr3sCurrent: number;
  mmr3sPeak: number;
  games3sCurrSeason: number;
  games3sPrevSeason: number;
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
      return 0;
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
    const weights = config.ascendancyWeights || { current: 0.25, peak: 0.75 };
    const Q = weights.current;
    const R = weights.peak;

    const twosCurrent = trackerData.twos || 0;
    const twosPeak = (trackerData.twosPeak ?? trackerData.twos) || 0;
    const twosScore =
      Q + R > 0 ? (twosCurrent * Q + twosPeak * R) / (Q + R) : 0;

    const threesCurrent = trackerData.threes || 0;
    const threesPeak = (trackerData.threesPeak ?? trackerData.threes) || 0;
    const threesScore =
      Q + R > 0 ? (threesCurrent * Q + threesPeak * R) / (Q + R) : 0;

    const totalGames =
      (trackerData.onesGamesPlayed || 0) +
      (trackerData.twosGamesPlayed || 0) +
      (trackerData.threesGamesPlayed || 0) +
      (trackerData.foursGamesPlayed || 0);

    const twosPercent =
      totalGames > 0 ? (trackerData.twosGamesPlayed || 0) / totalGames : 0;

    const threesPercent =
      totalGames > 0 ? (trackerData.threesGamesPlayed || 0) / totalGames : 0;

    // Weighted average of 2s Score and 3s Score using percentages as weights
    const totalPercent = twosPercent + threesPercent;
    if (totalPercent === 0) {
      return 0;
    }

    const finalScore =
      (twosScore * twosPercent + threesScore * threesPercent) / totalPercent;

    return Math.round(finalScore);
  }

  /**
   * Calculate Ascendancy MMR using weighted average pattern
   * Single Responsibility: ASCENDANCY algorithm calculation with previous season data
   *
   * Replicates Google Sheets AVERAGE.WEIGHTED logic:
   * 1. Calculate total games (current + previous seasons)
   * 2. Calculate 2s Score and 3s Score using weighted average of Current and Peak
   * 3. Calculate bracket percentages
   * 4. Final Score = weighted average of 2s Score and 3s Score using percentages
   *
   * @param data - Ascendancy data with current/peak MMRs and games from current/previous seasons
   * @param config - Guild MMR calculation configuration
   * @returns Calculated MMR value (rounded integer)
   */
  calculateAscendancyMmr(
    data: AscendancyData,
    config: MmrCalculationConfig,
  ): number {
    const weights = config.ascendancyWeights || { current: 0.25, peak: 0.75 };
    const WEIGHT_CURRENT = weights.current;
    const WEIGHT_PEAK = weights.peak;

    // Replicates Google Sheets AVERAGE.WEIGHTED logic
    const weightedAverage = (values: number[], weights: number[]): number => {
      const sumWeights = weights.reduce((acc, w) => acc + w, 0);
      if (sumWeights === 0) return 0;

      // Calculate weighted sum by pairing values and weights
      // Create pairs upfront with explicit bounds to ensure safe access
      const length = Math.min(values.length, weights.length);
      const pairs: Array<{ value: number; weight: number }> = [];
      for (const [index, value] of values.entries()) {
        if (index >= length) break;
        // Index comes from Array.entries() and is bounded by length check above
        // eslint-disable-next-line security/detect-object-injection
        const weight = weights[index];
        pairs.push({ value, weight });
      }

      const weightedSum = pairs.reduce(
        (acc, pair) => acc + pair.value * pair.weight,
        0,
      );
      return weightedSum / sumWeights;
    };

    // 1. Total Games = SUM(current + previous)
    const total2sGames = data.games2sCurrSeason + data.games2sPrevSeason;
    const total3sGames = data.games3sCurrSeason + data.games3sPrevSeason;
    const totalGames = total2sGames + total3sGames;

    // Handle division by zero if player has no games
    if (totalGames === 0) return 0;

    // 2. 2s Score & 3s Score = AVERAGE.WEIGHTED(current, peak)
    const score2s = weightedAverage(
      [data.mmr2sCurrent, data.mmr2sPeak],
      [WEIGHT_CURRENT, WEIGHT_PEAK],
    );

    const score3s = weightedAverage(
      [data.mmr3sCurrent, data.mmr3sPeak],
      [WEIGHT_CURRENT, WEIGHT_PEAK],
    );

    // 3. Bracket Percentages (%)
    const pct2s = total2sGames / totalGames;
    const pct3s = total3sGames / totalGames;

    // 4. Raw Score = AVERAGE.WEIGHTED(2s Score:3s Score, 2s %:3s %)
    const finalRawScore = weightedAverage([score2s, score3s], [pct2s, pct3s]);

    return Math.round(finalRawScore);
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

    const validation = this.formulaValidation.validateFormula(
      config.customFormula,
    );
    if (!validation.valid) {
      throw new BadRequestException(`Invalid formula: ${validation.error}`);
    }

    try {
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
        onesPeak: trackerData.onesPeak || 0,
        twosPeak: trackerData.twosPeak || 0,
        threesPeak: trackerData.threesPeak || 0,
        foursPeak: trackerData.foursPeak || 0,
      };

      const expr = this.math.parse(config.customFormula);
      const result = expr.evaluate(formulaData) as unknown;

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
      onesPeak: 1300,
      twosPeak: 1500,
      threesPeak: 1700,
      foursPeak: 1100,
    };
  }
}
