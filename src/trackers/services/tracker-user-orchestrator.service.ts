import { Injectable, Inject } from '@nestjs/common';
import type { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * TrackerUserOrchestratorService - User management for tracker operations
 *
 * Single Responsibility: Handles user creation and updates for tracker registration.
 * Extracted from TrackerService to reduce LCOM and improve separation of concerns.
 */
@Injectable()
export class TrackerUserOrchestratorService {
  private readonly serviceName = TrackerUserOrchestratorService.name;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('ILoggingService')
    private readonly loggingService: ILoggingService,
  ) {}

  /**
   * Ensure user exists in database, creating or updating as needed
   * Single Responsibility: User upsert logic
   *
   * @param userId - Discord user ID
   * @param userData - Optional user data (username, globalName, avatar)
   */
  async ensureUserExists(
    userId: string,
    userData?: { username: string; globalName?: string; avatar?: string },
  ): Promise<void> {
    const username = userData?.username || userId;
    const globalName = userData?.globalName ?? null;
    const avatar = userData?.avatar ?? null;

    await this.prisma.user.upsert({
      where: { id: userId },
      update: {
        username,
        globalName,
        avatar,
      },
      create: {
        id: userId,
        username,
        globalName,
        avatar,
      },
    });

    this.loggingService.debug(
      `Ensured user exists: ${userId}`,
      this.serviceName,
    );
  }
}
