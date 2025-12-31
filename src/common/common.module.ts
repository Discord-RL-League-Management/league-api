import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { EncryptionService } from './encryption.service';

/**
 * CommonModule - Shared utilities
 *
 * Exports:
 * - EncryptionService: Utility for encrypting/decrypting sensitive data
 *
 * Note: Guards have been moved to GuardsModule to break circular dependencies.
 * Import GuardsModule if you need guards (AdminGuard, SystemAdminGuard, etc.).
 */
@Module({
  imports: [ConfigModule, InfrastructureModule],
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class CommonModule {}
