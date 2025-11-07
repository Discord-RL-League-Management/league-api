import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SettingsService } from './services/settings.service';
import { SettingsRepository } from './repositories/settings.repository';

/**
 * SettingsModule - Infrastructure module for settings pattern
 * 
 * Provides generic settings management for any entity type.
 * Replaces domain-specific settings implementations.
 */
@Module({
  imports: [PrismaModule],
  providers: [SettingsService, SettingsRepository],
  exports: [SettingsService],
})
export class SettingsModule {}

