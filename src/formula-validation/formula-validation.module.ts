import { Module } from '@nestjs/common';
import { FormulaValidationService } from './services/formula-validation/formula-validation.service';

/**
 * FormulaValidationModule - Single Responsibility: Formula validation utility
 *
 * Provides formula validation as a shared utility service.
 * This module has no dependencies on other domain modules to prevent circular dependencies.
 */
@Module({
  providers: [FormulaValidationService],
  exports: [FormulaValidationService],
})
export class FormulaValidationModule {}
