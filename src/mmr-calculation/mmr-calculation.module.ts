import { Module } from '@nestjs/common';
import { MmrCalculationController } from './controllers/mmr-calculation.controller';
import { MMRCalculatorDemoController } from './controllers/mmr-calculator-demo.controller';
import { MmrCalculationService } from './services/mmr-calculation.service';
import { FormulaValidationService } from './services/formula-validation.service';
import { TrackerDataExtractionService } from './services/tracker-data-extraction.service';
import { MmrCalculationIntegrationService } from './services/mmr-calculation-integration.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GuildsModule } from '../guilds/guilds.module';
import { GuardsModule } from '../guards/guards.module';
import { GuildAccessAdapterModule } from '../guilds/adapters/guild-access-adapter.module';

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
 */
@Module({
  imports: [
    PrismaModule,
    GuildsModule, // No forwardRef needed - GuardsModule no longer depends on GuildsModule
    GuardsModule, // No forwardRef needed - GuardsModule no longer depends on GuildsModule
    GuildAccessAdapterModule, // No forwardRef needed - GuardsModule no longer depends on GuildsModule
  ],
  controllers: [MmrCalculationController, MMRCalculatorDemoController],
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
