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
   * Accepts DTOs (with string dates) and converts them to Prisma-compatible format
   */
  transformForStorage(user: unknown): Record<string, unknown> {
    if (!user || typeof user !== 'object') {
      return user as Record<string, unknown>;
    }

    const transformed: Record<string, unknown> = {
      ...(user as Record<string, unknown>),
    };

    // Encrypt refresh token if present
    if (
      transformed.refreshToken &&
      typeof transformed.refreshToken === 'string'
    ) {
      transformed.refreshToken = this.encryptionService.encrypt(
        transformed.refreshToken,
      );
    }

    // Convert lastLoginAt from ISO string to Date for Prisma
    if (
      transformed.lastLoginAt &&
      typeof transformed.lastLoginAt === 'string'
    ) {
      transformed.lastLoginAt = new Date(transformed.lastLoginAt);
    }

    return transformed;
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
