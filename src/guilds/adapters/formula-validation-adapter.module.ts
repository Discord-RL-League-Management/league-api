import { Module, forwardRef } from '@nestjs/common';
import { FormulaValidationAdapter } from './formula-validation.adapter';
import { MmrCalculationModule } from '../../mmr-calculation/mmr-calculation.module';

/**
 * FormulaValidationAdapterModule - Provides FormulaValidationAdapter
 *
 * Breaks circular dependency between GuildsModule and MmrCalculationModule
 * by providing an adapter that wraps FormulaValidationService.
 */
@Module({
  imports: [forwardRef(() => MmrCalculationModule)],
  providers: [
    FormulaValidationAdapter,
    {
      provide: 'IFormulaValidationService',
      useExisting: FormulaValidationAdapter,
    },
  ],
  exports: [FormulaValidationAdapter, 'IFormulaValidationService'],
})
export class FormulaValidationAdapterModule {}
