import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MmrCalculationService } from './mmr-calculation.service';
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
      // Extract tracker data
      const trackerData =
        await this.trackerDataExtraction.extractTrackerData(trackerId);
      if (!trackerData) {
        this.logger.debug(
          `No tracker data available for tracker ${trackerId}, skipping MMR calculation`,
        );
        return;
      }

      // Get user's guild memberships
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

      // Calculate MMR for each guild
      const calculations = await Promise.allSettled(
        guildMemberships.map((membership) =>
          this.calculateMmrForGuild(userId, membership.guildId, trackerData),
        ),
      );

      // Log results
      const successful = calculations.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      const failed = calculations.filter((r) => r.status === 'rejected').length;

      this.logger.log(
        `MMR calculation completed for user ${userId}: ${successful} successful, ${failed} failed`,
      );

      // Log failures
      calculations.forEach((result, index) => {
        if (result.status === 'rejected') {
          this.logger.warn(
            `Failed to calculate MMR for guild ${guildMemberships[index].guildId}: ${result.reason}`,
          );
        }
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to calculate MMR for user ${userId}: ${error.message}`,
        error,
      );
      // Don't throw - we don't want to break the scraping process
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
    trackerData: any,
  ): Promise<number> {
    // Get guild settings (or use defaults)
    let mmrConfig: MmrCalculationConfig;

    try {
      const settings = await this.guildSettingsService.getSettings(guildId);
      const settingsTyped = settings as any;
      mmrConfig = settingsTyped.mmrCalculation || this.getDefaultMmrConfig();
    } catch (error: any) {
      this.logger.warn(
        `Failed to get settings for guild ${guildId}, using defaults: ${error.message}`,
      );
      mmrConfig = this.getDefaultMmrConfig();
    }

    // Calculate MMR
    const calculatedMmr = this.mmrService.calculateMmr(trackerData, mmrConfig);

    this.logger.debug(
      `Calculated MMR for user ${userId} in guild ${guildId}: ${calculatedMmr}`,
    );

    // TODO: Store calculated MMR if needed (currently just logging)
    // For now, we calculate on-demand. Storage can be added later if needed.

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
