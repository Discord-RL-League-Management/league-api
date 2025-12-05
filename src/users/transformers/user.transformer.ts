import { Injectable } from '@nestjs/common';
import { EncryptionService } from '../../common/encryption.service';
import { User } from '@prisma/client';

/**
 * UserTransformer - Handles encryption/decryption of user data
 * Single Responsibility: Transform user entities for storage and retrieval
 *
 * This transformer separates encryption concerns from business logic,
 * preparing for repository pattern implementation
 */
@Injectable()
export class UserTransformer {
  constructor(private encryptionService: EncryptionService) {}

  /**
   * Transform user entity for database storage (encrypt sensitive fields)
   */
  transformForStorage(user: Partial<User>): Record<string, unknown> {
    if (!user) {
      return user as Record<string, unknown>;
    }

    const transformed = { ...user };

    // Encrypt refresh token if present
    if (transformed.refreshToken) {
      transformed.refreshToken = this.encryptionService.encrypt(
        transformed.refreshToken,
      );
    }

    return transformed as Record<string, unknown>;
  }

  /**
   * Transform user entity for retrieval (decrypt sensitive fields)
   */
  transformForRetrieval(user: User | null): User | null {
    if (!user) {
      return user;
    }

    const transformed = { ...user };

    // Decrypt refresh token if present
    if (transformed.refreshToken) {
      transformed.refreshToken = this.encryptionService.decrypt(
        transformed.refreshToken,
      );
    }

    return transformed;
  }

  /**
   * Transform array of user entities for retrieval
   */
  transformArrayForRetrieval(users: User[]): User[] {
    return users.map((user) => this.transformForRetrieval(user)!);
  }
}
