import { Module } from '@nestjs/common';
import { MmrCalculationController } from './mmr-calculation.controller';
import { MMRCalculatorDemoController } from './mmr-calculator-demo.controller';
import { MmrCalculationService } from './services/mmr-calculation.service';
import { TrackerDataExtractionService } from './services/tracker-data-extraction.service';
import { MmrCalculationIntegrationService } from './services/mmr-calculation-integration.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GuildsModule } from '../guilds/guilds.module';
import { FormulaValidationModule } from '../formula-validation/formula-validation.module';

/**
 * MmrCalculationModule - Single Responsibility: MMR calculation module
 *
 * Provides MMR calculation services and API endpoints for guild-specific
 * internal MMR calculation with custom formula support.
 *
 * Dependencies:
 * - PrismaModule: Data access
 * - GuildsModule: Provides GuildSettingsService (needed for MMR calculation logic)
 * - GuardsModule: Provides AdminGuard for controller authentication
 * - FormulaValidationModule: Provides FormulaValidationService (shared utility)
 */
@Module({
  imports: [
    PrismaModule,
    GuildsModule, // GuardsModule is now global, breaking the cycle
    FormulaValidationModule,
  ],
  controllers: [MmrCalculationController, MMRCalculatorDemoController],
  providers: [
    MmrCalculationService,
    TrackerDataExtractionService,
    MmrCalculationIntegrationService,
  ],
  exports: [MmrCalculationService, MmrCalculationIntegrationService],
})
export class MmrCalculationModule {}
