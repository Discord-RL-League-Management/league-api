import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MmrCalculationService, TrackerData } from './mmr-calculation.service';
import { TrackerDataExtractionService } from './tracker-data-extraction.service';
import { SettingsDefaultsService } from '../../guilds/services/settings-defaults.service';
import { GuildSettingsService } from '../../guilds/guild-settings.service';
import { MmrCalculationConfig } from '../../guilds/interfaces/settings.interface';

/**
 * MmrCalculationIntegrationService - Single Responsibility: MMR calculation orchestration
 *
 * Orchestrates MMR calculation for users across guilds after tracker scraping.
 */
@Injectable()
export class MmrCalculationIntegrationService {
  private readonly logger = new Logger(MmrCalculationIntegrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mmrService: MmrCalculationService,
    private readonly trackerDataExtraction: TrackerDataExtractionService,
    private readonly settingsDefaults: SettingsDefaultsService,
    private readonly guildSettingsService: GuildSettingsService,
  ) {}

  /**
   * Calculate MMR for a user across all their guilds
   * Single Responsibility: MMR calculation orchestration
   *
   * @param userId - User ID
   * @param trackerId - Tracker ID that was just scraped
   */
  async calculateMmrForUser(userId: string, trackerId: string): Promise<void> {
    try {
      const trackerData =
        await this.trackerDataExtraction.extractTrackerData(trackerId);
      if (!trackerData) {
        this.logger.debug(
          `No tracker data available for tracker ${trackerId}, skipping MMR calculation`,
        );
        return;
      }

      const guildMemberships = await this.prisma.guildMember.findMany({
        where: { userId },
        select: { guildId: true },
      });

      if (guildMemberships.length === 0) {
        this.logger.debug(
          `User ${userId} has no guild memberships, skipping MMR calculation`,
        );
        return;
      }

      const calculations = await Promise.allSettled(
        guildMemberships.map((membership) =>
          this.calculateMmrForGuild(userId, membership.guildId, trackerData),
        ),
      );

      const successful = calculations.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      const failed = calculations.filter((r) => r.status === 'rejected').length;

      this.logger.log(
        `MMR calculation completed for user ${userId}: ${successful} successful, ${failed} failed`,
      );

      calculations.forEach((result, index) => {
        if (result.status === 'rejected') {
          this.logger.warn(
            `Failed to calculate MMR for guild ${guildMemberships[index].guildId}: ${result.reason}`,
          );
        }
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to calculate MMR for user ${userId}: ${errorMessage}`,
        error,
      );
    }
  }

  /**
   * Calculate MMR for a specific user-guild combination
   * Single Responsibility: Single guild MMR calculation
   *
   * @param userId - User ID
   * @param guildId - Guild ID
   * @param trackerData - Tracker data to use for calculation
   * @returns Calculated MMR value
   */
  private async calculateMmrForGuild(
    userId: string,
    guildId: string,
    trackerData: TrackerData,
  ): Promise<number> {
    let mmrConfig: MmrCalculationConfig;

    try {
      const settings = await this.guildSettingsService.getSettings(guildId);
      mmrConfig = settings.mmrCalculation || this.getDefaultMmrConfig();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to get settings for guild ${guildId}, using defaults: ${errorMessage}`,
      );
      mmrConfig = this.getDefaultMmrConfig();
    }

    const calculatedMmr = this.mmrService.calculateMmr(trackerData, mmrConfig);

    this.logger.debug(
      `Calculated MMR for user ${userId} in guild ${guildId}: ${calculatedMmr}`,
    );

    return calculatedMmr;
  }

  /**
   * Get default MMR configuration
   * Single Responsibility: Default config provision
   */
  private getDefaultMmrConfig(): MmrCalculationConfig {
    const defaults = this.settingsDefaults.getDefaults();
    return (
      defaults.mmrCalculation || {
        algorithm: 'WEIGHTED_AVERAGE',
        weights: {
          ones: 0.1,
          twos: 0.3,
          threes: 0.5,
          fours: 0.1,
        },
        minGamesPlayed: {
          ones: 50,
          twos: 50,
          threes: 50,
          fours: 50,
        },
      }
    );
  }
}
