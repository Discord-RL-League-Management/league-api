import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../../users/users.service';

/**
 * TrackerUserOrchestratorService - User management for tracker operations
 *
 * Single Responsibility: Handles user creation and updates for tracker registration.
 * Extracted from TrackerService to reduce LCOM and improve separation of concerns.
 */
@Injectable()
export class TrackerUserOrchestratorService {
  private readonly logger = new Logger(TrackerUserOrchestratorService.name);

  constructor(private readonly usersService: UsersService) {}

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

    await this.usersService.upsert({
      id: userId,
      username,
      globalName,
      avatar,
    });

    this.logger.debug(`Ensured user exists: ${userId}`);
  }
}
