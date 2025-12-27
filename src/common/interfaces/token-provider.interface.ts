/**
 * ITokenProvider - Interface for token management operations
 *
 * Abstracts TokenManagementService to enable dependency inversion.
 * This interface allows CommonModule to depend on abstractions rather than
 * concrete implementations, breaking cross-boundary coupling.
 */
export interface ITokenProvider {
  /**
   * Get a valid access token for a user
   * @param userId - Discord user ID
   * @returns Access token or null if not available
   */
  getValidAccessToken(userId: string): Promise<string | null>;
}
