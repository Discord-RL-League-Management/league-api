import { Injectable } from '@nestjs/common';
import { ITokenProvider } from '../../common/interfaces/token-provider.interface';
import { TokenManagementService } from '../services/token-management.service';

/**
 * TokenProviderAdapter - Adapter implementing ITokenProvider
 *
 * Implements the ITokenProvider interface using TokenManagementService.
 * This adapter enables dependency inversion by allowing CommonModule to depend
 * on the interface rather than concrete services.
 */
@Injectable()
export class TokenProviderAdapter implements ITokenProvider {
  constructor(
    private readonly tokenManagementService: TokenManagementService,
  ) {}

  /**
   * Get a valid access token for a user
   * Delegates to TokenManagementService.getValidAccessToken()
   */
  async getValidAccessToken(userId: string): Promise<string | null> {
    return this.tokenManagementService.getValidAccessToken(userId);
  }
}
