import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { IFormulaValidationService } from '../interfaces/formula-validation.interface';
import { FormulaValidationService } from '../../mmr-calculation/services/formula-validation.service';

/**
 * FormulaValidationAdapter - Adapter for FormulaValidationService
 *
 * Wraps FormulaValidationService to provide IFormulaValidationService interface.
 * Breaks circular dependency between GuildsModule and MmrCalculationModule.
 */
@Injectable()
export class FormulaValidationAdapter implements IFormulaValidationService {
  constructor(
    @Inject(forwardRef(() => FormulaValidationService))
    private readonly formulaValidationService: FormulaValidationService,
  ) {}

  validateFormula(formula: string): {
    valid: boolean;
    error?: string;
    parsedExpression?: unknown;
  } {
    return this.formulaValidationService.validateFormula(formula);
  }
}
