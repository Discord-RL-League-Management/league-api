import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16; // 128 bits
  private readonly saltLength = 64; // 64 bytes
  private readonly tagLength = 16; // 128 bits
  private readonly tagPosition = this.saltLength + this.ivLength;
  private readonly encryptedDataPosition = this.tagPosition + this.tagLength;

  constructor(private configService: ConfigService) {}

  /**
   * Get encryption key from environment
   * Falls back to generated key in development
   */
  private getEncryptionKey(): Buffer {
    const key = this.configService.get<string>('ENCRYPTION_KEY');

    if (!key) {
      this.logger.warn(
        'ENCRYPTION_KEY not set. Using default key for development only!',
      );
      // For development only - in production this should throw an error
      return crypto.scryptSync('default-key-for-development', 'salt', 32);
    }

    // Convert hex string to buffer
    return Buffer.from(key, 'hex');
  }

  /**
   * Encrypt sensitive data (refresh tokens)
   * Single Responsibility: Data encryption
   */
  encrypt(text: string): string {
    if (!text) {
      return text;
    }

    try {
      const iv = crypto.randomBytes(this.ivLength);
      const salt = crypto.randomBytes(this.saltLength);
      const key = this.getEncryptionKey();

      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      // Encrypt data
      const encrypted = Buffer.concat([
        cipher.update(text, 'utf8'),
        cipher.final(),
      ]);

      // Get authentication tag
      const tag = cipher.getAuthTag();

      // Combine: salt + iv + tag + encrypted data
      const combined = Buffer.concat([salt, iv, tag, encrypted]);

      return combined.toString('base64');
    } catch (error) {
      this.logger.error('Failed to encrypt data:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt sensitive data (refresh tokens)
   * Single Responsibility: Data decryption
   */
  decrypt(encryptedText: string): string {
    if (!encryptedText) {
      return encryptedText;
    }

    try {
      const combined = Buffer.from(encryptedText, 'base64');

      // Extract components
      const salt = combined.subarray(0, this.saltLength);
      const iv = combined.subarray(
        this.saltLength,
        this.saltLength + this.ivLength,
      );
      const tag = combined.subarray(
        this.saltLength + this.ivLength,
        this.tagPosition + this.tagLength,
      );
      const encrypted = combined.subarray(this.encryptedDataPosition);

      const key = this.getEncryptionKey();

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);

      // Decrypt data
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      this.logger.error('Failed to decrypt data:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Check if data is encrypted
   * Single Responsibility: Encryption state detection
   */
  isEncrypted(data: string): boolean {
    if (!data) {
      return false;
    }

    try {
      const buffer = Buffer.from(data, 'base64');
      // Check if buffer has minimum size for encrypted data
      return buffer.length >= this.encryptedDataPosition;
    } catch {
      return false;
    }
  }
}
