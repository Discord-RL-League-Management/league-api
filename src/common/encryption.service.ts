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
   * SECURITY: No fallback - ENCRYPTION_KEY is required via schema validation
   * Uses ConfigService.getOrThrow() which is the NestJS best practice for required config values
   */
  private getEncryptionKey(): Buffer {
    const key = this.configService.getOrThrow<string>('ENCRYPTION_KEY', {
      infer: true,
    });

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

      const encrypted = Buffer.concat([
        cipher.update(text, 'utf8'),
        cipher.final(),
      ]);

      const tag = cipher.getAuthTag();
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

      // Skip salt bytes (salt is stored but not used in decryption - key is derived from config)
      combined.subarray(0, this.saltLength);
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
      return buffer.length >= this.encryptedDataPosition;
    } catch {
      return false;
    }
  }
}
