import { Module, forwardRef } from '@nestjs/common';
import { MmrCalculationController } from './controllers/mmr-calculation.controller';
import { MMRCalculatorDemoController } from './controllers/mmr-calculator-demo.controller';
import { MmrCalculationService } from './services/mmr-calculation.service';
import { FormulaValidationService } from './services/formula-validation.service';
import { TrackerDataExtractionService } from './services/tracker-data-extraction.service';
import { MmrCalculationIntegrationService } from './services/mmr-calculation-integration.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GuildsModule } from '../guilds/guilds.module';
import { CommonModule } from '../common/common.module';

/**
 * MmrCalculationModule - Single Responsibility: MMR calculation module
 *
 * Provides MMR calculation services and API endpoints for guild-specific
 * internal MMR calculation with custom formula support.
 *
 * Dependencies:
 * - PrismaModule: Data access
 * - GuildsModule: Provides GuildSettingsService (needed for MMR calculation logic)
 * - CommonModule: Provides AdminGuard for controller authentication
 *
 * Note: Since AdminGuard now uses dependency inversion with interfaces,
 * we no longer need to import all AdminGuard dependencies directly.
 * CommonModule handles all AdminGuard dependencies via adapters.
 */
@Module({
  imports: [
    PrismaModule,
    forwardRef(() => GuildsModule),
    forwardRef(() => CommonModule),
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
