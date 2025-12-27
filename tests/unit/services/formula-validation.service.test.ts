/**
 * FormulaValidationService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FormulaValidationService } from '@/mmr-calculation/services/formula-validation.service';

describe('FormulaValidationService', () => {
  let service: FormulaValidationService;

  beforeEach(() => {
    // ARRANGE: Setup test dependencies
    service = new FormulaValidationService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateFormula', () => {
    it('should_return_valid_for_simple_addition_formula', () => {
      // ARRANGE
      const formula = '(ones + twos) / 2';

      // ACT
      const result = service.validateFormula(formula);

      // ASSERT
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.parsedExpression).toBeDefined();
    });

    it('should_return_valid_for_weighted_average_formula', () => {
      // ARRANGE
      const formula = '(ones * 0.2 + twos * 0.3 + threes * 0.5)';

      // ACT
      const result = service.validateFormula(formula);

      // ASSERT
      expect(result.valid).toBe(true);
    });

    it('should_return_valid_for_formula_with_games_played', () => {
      // ARRANGE
      const formula = '(ones * onesGames + twos * twosGames) / totalGames';

      // ACT
      const result = service.validateFormula(formula);

      // ASSERT
      expect(result.valid).toBe(true);
    });

    it('should_return_invalid_when_formula_is_empty', () => {
      // ARRANGE
      const formula = '';

      // ACT
      const result = service.validateFormula(formula);

      // ASSERT
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Formula cannot be empty');
    });

    it('should_return_invalid_when_formula_is_whitespace_only', () => {
      // ARRANGE
      const formula = '   ';

      // ACT
      const result = service.validateFormula(formula);

      // ASSERT
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Formula cannot be empty');
    });

    it('should_return_invalid_when_formula_has_disallowed_variables', () => {
      // ARRANGE
      const formula = 'ones + invalidVar';

      // ACT
      const result = service.validateFormula(formula);

      // ASSERT
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Disallowed variables');
      expect(result.error).toContain('invalidVar');
    });

    it('should_return_invalid_when_formula_has_syntax_error', () => {
      // ARRANGE
      // Use a formula that will definitely fail parsing
      const formula = 'ones ++ invalid syntax **';

      // ACT
      const result = service.validateFormula(formula);

      // ASSERT
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should_return_invalid_when_formula_evaluates_to_non_finite_number', () => {
      // ARRANGE
      const formula = 'ones / 0';

      // ACT
      const result = service.validateFormula(formula);

      // ASSERT
      expect(result.valid).toBe(false);
      expect(result.error).toContain('finite number');
    });

    it('should_allow_all_valid_variables', () => {
      // ARRANGE
      const validVariables = [
        'ones',
        'twos',
        'threes',
        'fours',
        'onesGames',
        'twosGames',
        'threesGames',
        'foursGames',
        'totalGames',
      ];

      for (const variable of validVariables) {
        const formula = variable;

        // ACT
        const result = service.validateFormula(formula);

        // ASSERT
        expect(result.valid).toBe(true);
      }
    });

    it('should_allow_math_functions', () => {
      // ARRANGE
      const formula = 'max(ones, twos, threes)';

      // ACT
      const result = service.validateFormula(formula);

      // ASSERT
      expect(result.valid).toBe(true);
    });

    it('should_allow_complex_formulas_with_nested_expressions', () => {
      // ARRANGE
      const formula =
        'sqrt((ones * onesGames + twos * twosGames) / totalGames)';

      // ACT
      const result = service.validateFormula(formula);

      // ASSERT
      expect(result.valid).toBe(true);
    });
  });
});
