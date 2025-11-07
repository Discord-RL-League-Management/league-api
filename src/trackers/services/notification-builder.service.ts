import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';

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
   * Build a Discord embed message for tracker registration notification
   * @param registrationId The registration ID
   * @param user The user who registered
   * @param url The tracker URL
   * @param frontendUrl Optional frontend URL for processing link
   * @returns Discord embed object
   */
  buildRegistrationNotificationEmbed(
    registrationId: string,
    user: User,
    url: string,
    frontendUrl?: string,
  ): DiscordEmbed {
    const embed: DiscordEmbed = {
      title: 'New Tracker Registration',
      description: `A new tracker registration is waiting for admin approval.`,
      color: 0x5865f2, // Discord blurple
      fields: [
        {
          name: 'User',
          value: user.username || user.globalName || 'Unknown',
          inline: true,
        },
        {
          name: 'Tracker URL',
          value: url,
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Tracker Management System',
      },
    };

    // Add processing form link if frontend URL is configured
    if (frontendUrl) {
      embed.fields!.push({
        name: 'Process Registration',
        value: `[Click here to process](${frontendUrl}/admin/trackers/process/${registrationId})`,
        inline: false,
      });
    }

    return embed;
  }
}






