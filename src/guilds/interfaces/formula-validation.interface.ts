import type { InjectionToken } from '@nestjs/common';

/**
 * IFormulaValidationService - Interface for formula validation
 *
 * Provides abstraction for validating custom MMR formulas.
 * Used to break circular dependency between GuildsModule and MmrCalculationModule.
 */
export interface IFormulaValidationService {
  /**
   * Validate formula syntax and safety
   *
   * @param formula - Formula string to validate
   * @returns Validation result with parsed expression if valid
   */
  validateFormula(formula: string): {
    valid: boolean;
    error?: string;
    parsedExpression?: unknown;
  };
}

export const IFormulaValidationService = Symbol(
  'IFormulaValidationService',
) as InjectionToken<IFormulaValidationService>;
