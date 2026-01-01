/**
 * IGuildAccessValidationService - Interface for guild access validation operations
 *
 * Abstracts guild access validation to enable dependency inversion.
 * This interface allows other modules to depend on abstractions rather than
 * concrete implementations, reducing coupling and improving testability.
 */
export interface IGuildAccessValidationService {
  /**
   * Validate user has access to guild (both user and bot are members)
   * @param userId - User ID to validate
   * @param guildId - Guild ID to check access for
   * @throws NotFoundException if guild doesn't exist or bot isn't a member
   * @throws ForbiddenException if user isn't a member of the guild
   */
  validateUserGuildAccess(userId: string, guildId: string): Promise<void>;
}
