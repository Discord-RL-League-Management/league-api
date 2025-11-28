import { Injectable } from '@nestjs/common';
import { User, Tracker } from '@prisma/client';

export interface DiscordEmbed {
  title: string;
  description?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  timestamp?: string;
  footer?: {
    text: string;
  };
}

@Injectable()
export class NotificationBuilderService {
  /**
   * Build a Discord embed message for scraping completion notification
   */
  buildScrapingCompleteEmbed(
    tracker: Tracker & { seasons?: any[] },
    user: User,
    frontendUrl?: string,
    seasonsScraped?: number,
    seasonsFailed?: number,
  ): DiscordEmbed {
    const latestSeason =
      tracker.seasons && tracker.seasons.length > 0 ? tracker.seasons[0] : null;

    const embed: DiscordEmbed = {
      title: 'Tracker Data Scraped Successfully',
      description: `Your tracker data has been successfully collected and updated.`,
      color: 0x00ff00, // Green
      fields: [
        {
          name: 'Tracker',
          value: tracker.url,
          inline: false,
        },
        {
          name: 'Platform',
          value: tracker.platform,
          inline: true,
        },
        {
          name: 'Username',
          value: tracker.username,
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Tracker Management System',
      },
    };

    if (seasonsScraped !== undefined) {
      embed.fields!.push({
        name: 'Seasons Scraped',
        value: seasonsScraped.toString(),
        inline: true,
      });
    }

    if (seasonsFailed !== undefined && seasonsFailed > 0) {
      embed.fields!.push({
        name: 'Seasons Failed',
        value: seasonsFailed.toString(),
        inline: true,
      });
    }

    if (latestSeason) {
      embed.fields!.push({
        name: 'Latest Season',
        value: `Season ${latestSeason.seasonNumber}${latestSeason.seasonName ? ` (${latestSeason.seasonName})` : ''}`,
        inline: true,
      });
    }

    if (tracker.lastScrapedAt) {
      embed.fields!.push({
        name: 'Last Updated',
        value: new Date(tracker.lastScrapedAt).toLocaleString(),
        inline: true,
      });
    }

    if (frontendUrl) {
      embed.fields!.push({
        name: 'View Tracker',
        value: `[Click here to view](${frontendUrl}/dashboard/tracker/${tracker.id})`,
        inline: false,
      });
    }

    return embed;
  }

  /**
   * Build a Discord embed message for scraping failure notification
   */
  buildScrapingFailedEmbed(
    tracker: Tracker,
    user: User,
    error: string,
    frontendUrl?: string,
  ): DiscordEmbed {
    const embed: DiscordEmbed = {
      title: 'Tracker Scraping Failed',
      description: `We encountered an error while collecting your tracker data.`,
      color: 0xff0000, // Red
      fields: [
        {
          name: 'Tracker',
          value: tracker.url,
          inline: false,
        },
        {
          name: 'Error',
          value: error.substring(0, 1000), // Limit error message length
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Tracker Management System',
      },
    };

    if (frontendUrl) {
      embed.fields!.push({
        name: 'Try Again',
        value: `[Click here to retry](${frontendUrl}/dashboard/tracker/${tracker.id})`,
        inline: false,
      });
    }

    return embed;
  }
}
