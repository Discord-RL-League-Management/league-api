import { Module } from '@nestjs/common';
import { MmrCalculationController } from './controllers/mmr-calculation.controller';
import { MmrCalculationService } from './services/mmr-calculation.service';
import { FormulaValidationService } from './services/formula-validation.service';

/**
 * MmrCalculationModule - Single Responsibility: MMR calculation module
 *
 * Provides MMR calculation services and API endpoints for guild-specific
 * internal MMR calculation with custom formula support.
 */
@Module({
  controllers: [MmrCalculationController],
  providers: [MmrCalculationService, FormulaValidationService],
  exports: [MmrCalculationService, FormulaValidationService],
})
export class MmrCalculationModule {}

