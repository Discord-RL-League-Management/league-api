import { Module, forwardRef } from '@nestjs/common';
import { MmrCalculationController } from './controllers/mmr-calculation.controller';
import { MmrCalculationService } from './services/mmr-calculation.service';
import { FormulaValidationService } from './services/formula-validation.service';
import { TrackerDataExtractionService } from './services/tracker-data-extraction.service';
import { MmrCalculationIntegrationService } from './services/mmr-calculation-integration.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GuildsModule } from '../guilds/guilds.module';

/**
 * MmrCalculationModule - Single Responsibility: MMR calculation module
 *
 * Provides MMR calculation services and API endpoints for guild-specific
 * internal MMR calculation with custom formula support.
 */
@Module({
  imports: [PrismaModule, forwardRef(() => GuildsModule)],
  controllers: [MmrCalculationController],
  providers: [
    MmrCalculationService,
    FormulaValidationService,
    TrackerDataExtractionService,
    MmrCalculationIntegrationService,
  ],
  exports: [
    MmrCalculationService,
    FormulaValidationService,
    MmrCalculationIntegrationService,
  ],
})
export class MmrCalculationModule {}
