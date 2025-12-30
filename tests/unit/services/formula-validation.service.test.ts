/**
 * FormulaValidationService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FormulaValidationService } from '@/mmr-calculation/services/formula-validation.service';

describe('FormulaValidationService', () => {
  let service: FormulaValidationService;

  beforeEach(() => {
    service = new FormulaValidationService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateFormula', () => {
    it('should_return_valid_for_simple_addition_formula', () => {
      const formula = '(ones + twos) / 2';

      const result = service.validateFormula(formula);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.parsedExpression).toBeDefined();
    });

    it('should_return_valid_for_weighted_average_formula', () => {
      const formula = '(ones * 0.2 + twos * 0.3 + threes * 0.5)';

      const result = service.validateFormula(formula);

      expect(result.valid).toBe(true);
    });

    it('should_return_valid_for_formula_with_games_played', () => {
      const formula = '(ones * onesGames + twos * twosGames) / totalGames';

      const result = service.validateFormula(formula);

      expect(result.valid).toBe(true);
    });

    it('should_return_invalid_when_formula_is_empty', () => {
      const formula = '';

      const result = service.validateFormula(formula);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Formula cannot be empty');
    });

    it('should_return_invalid_when_formula_is_whitespace_only', () => {
      const formula = '   ';

      const result = service.validateFormula(formula);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Formula cannot be empty');
    });

    it('should_return_invalid_when_formula_has_disallowed_variables', () => {
      const formula = 'ones + invalidVar';

      const result = service.validateFormula(formula);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Disallowed variables');
      expect(result.error).toContain('invalidVar');
    });

    it('should_return_invalid_when_formula_has_syntax_error', () => {
      // Use a formula that will definitely fail parsing
      const formula = 'ones ++ invalid syntax **';

      const result = service.validateFormula(formula);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should_return_invalid_when_formula_evaluates_to_non_finite_number', () => {
      const formula = 'ones / 0';

      const result = service.validateFormula(formula);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('finite number');
    });

    it.each([
      'ones',
      'twos',
      'threes',
      'fours',
      'onesGames',
      'twosGames',
      'threesGames',
      'foursGames',
      'totalGames',
    ])('should_return_valid_for_%s_variable', (variable) => {
      const formula = variable;

      const result = service.validateFormula(formula);

      expect(result.valid).toBe(true);
    });

    it('should_allow_math_functions', () => {
      const formula = 'max(ones, twos, threes)';

      const result = service.validateFormula(formula);

      expect(result.valid).toBe(true);
    });

    it('should_allow_complex_formulas_with_nested_expressions', () => {
      const formula =
        'sqrt((ones * onesGames + twos * twosGames) / totalGames)';

      const result = service.validateFormula(formula);

      expect(result.valid).toBe(true);
    });
  });
});
