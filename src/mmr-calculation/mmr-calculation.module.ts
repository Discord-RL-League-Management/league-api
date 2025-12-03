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
import { PermissionCheckModule } from '../permissions/modules/permission-check/permission-check.module';
import { AuditModule } from '../audit/audit.module';
import { GuildMembersModule } from '../guild-members/guild-members.module';
import { DiscordModule } from '../discord/discord.module';
import { TokenManagementModule } from '../auth/services/token-management.module';

/**
 * MmrCalculationModule - Single Responsibility: MMR calculation module
 *
 * Provides MMR calculation services and API endpoints for guild-specific
 * internal MMR calculation with custom formula support.
 *
 * Imports CommonModule to access AdminGuard for controller authentication.
 * Also imports all AdminGuard dependencies directly (as done in AuditModule)
 * to ensure proper dependency resolution:
 * - PermissionCheckModule: Provides PermissionCheckService
 * - AuditModule: Provides AuditLogService
 * - GuildsModule: Provides GuildSettingsService
 * - GuildMembersModule: Provides GuildMembersService
 * - DiscordModule: Provides DiscordApiService
 * - TokenManagementModule: Provides TokenManagementService
 */
@Module({
  imports: [
    PrismaModule,
    forwardRef(() => GuildsModule),
    forwardRef(() => CommonModule),
    forwardRef(() => PermissionCheckModule),
    forwardRef(() => AuditModule),
    forwardRef(() => GuildMembersModule),
    DiscordModule,
    TokenManagementModule,
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
