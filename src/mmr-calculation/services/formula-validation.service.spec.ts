import { Test, TestingModule } from '@nestjs/testing';
import { FormulaValidationService } from './formula-validation.service';

describe('FormulaValidationService', () => {
  let service: FormulaValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FormulaValidationService],
    }).compile();

    service = module.get<FormulaValidationService>(FormulaValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateFormula', () => {
    it('should reject empty formula', () => {
      const result = service.validateFormula('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should validate simple weighted average formula', () => {
      const formula = '(ones * 0.1 + twos * 0.3 + threes * 0.5 + fours * 0.1)';
      const result = service.validateFormula(formula);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate formula with conditional', () => {
      const formula = '(onesGames >= 50 ? ones * 0.2 : 0) + (twosGames >= 50 ? twos * 0.3 : 0)';
      const result = service.validateFormula(formula);
      expect(result.valid).toBe(true);
    });

    it('should validate formula with max function', () => {
      // mathjs max function works with multiple arguments (not array syntax)
      const formula = 'max(ones, twos, threes, fours)';
      const result = service.validateFormula(formula);
      if (!result.valid) {
        console.log('Validation error:', result.error);
      }
      expect(result.valid).toBe(true);
    });

    it('should reject formula with disallowed variable', () => {
      const formula = 'ones + twos + invalidVar';
      const result = service.validateFormula(formula);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Disallowed variables');
    });

    it('should reject invalid syntax', () => {
      // Use a formula that will definitely fail parsing
      const formula = 'ones + * twos';
      const result = service.validateFormula(formula);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate formula with totalGames', () => {
      const formula = '(ones * 0.1 + twos * 0.3 + threes * 0.5 + fours * 0.1) * (totalGames >= 100 ? 1 : 0.8)';
      const result = service.validateFormula(formula);
      expect(result.valid).toBe(true);
    });

    it('should validate formula with games played variables', () => {
      const formula = '(onesGames >= 50 ? ones : 0) + (twosGames >= 50 ? twos : 0)';
      const result = service.validateFormula(formula);
      expect(result.valid).toBe(true);
    });

    // PROTECTION: Reject malicious code injection attempts
    it('should reject formula with function calls that could execute code', () => {
      const formula = 'eval("malicious code")';
      const result = service.validateFormula(formula);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject formula with require() calls', () => {
      const formula = 'require("fs")';
      const result = service.validateFormula(formula);
      expect(result.valid).toBe(false);
    });

    it('should reject formula with import statements', () => {
      const formula = 'import("module")';
      const result = service.validateFormula(formula);
      expect(result.valid).toBe(false);
    });

    // PROTECTION: Reject formulas that don't evaluate to numbers
    it('should reject formula that evaluates to non-number', () => {
      const formula = 'ones > twos'; // Boolean result
      const result = service.validateFormula(formula);
      // This might parse but should fail evaluation check
      // The test data evaluation should catch this
      expect(result.valid).toBe(false);
    });

    // INPUT: Test null/undefined inputs
    it('should reject null input', () => {
      const result = service.validateFormula(null as any);
      expect(result.valid).toBe(false);
    });

    it('should reject undefined input', () => {
      const result = service.validateFormula(undefined as any);
      expect(result.valid).toBe(false);
    });

    // PROTECTION: Reject formulas with only whitespace
    it('should reject formula with only whitespace', () => {
      const result = service.validateFormula('   \n\t   ');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });
  });
});

