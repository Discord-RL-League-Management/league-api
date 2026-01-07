/**
 * EncryptionService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';
import * as crypto from 'crypto';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let mockConfigService: ConfigService;

  // Valid 32-byte (256-bit) key for AES-256
  const validEncryptionKey = crypto.randomBytes(32).toString('hex');

  beforeEach(async () => {
    mockConfigService = {
      getOrThrow: vi.fn().mockReturnValue(validEncryptionKey),
    } as unknown as ConfigService;

    const moduleRef = await Test.createTestingModule({
      providers: [
        EncryptionService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = moduleRef.get<EncryptionService>(EncryptionService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('encrypt', () => {
    it('should_return_encrypted_string_when_valid_text_provided', () => {
      const plainText = 'sensitive-data-to-encrypt';

      const encrypted = service.encrypt(plainText);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plainText);
      expect(typeof encrypted).toBe('string');
    });

    it('should_return_empty_string_when_empty_text_provided', () => {
      const result = service.encrypt('');

      expect(result).toBe('');
    });

    it('should_produce_different_ciphertext_for_same_plaintext', () => {
      const plainText = 'same-text';

      const encrypted1 = service.encrypt(plainText);
      const encrypted2 = service.encrypt(plainText);

      // Due to random IV and salt, same plaintext produces different ciphertext
      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('decrypt', () => {
    it('should_return_original_text_when_valid_ciphertext_provided', () => {
      const originalText = 'sensitive-data-to-encrypt';
      const encrypted = service.encrypt(originalText);

      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(originalText);
    });

    it('should_return_empty_string_when_empty_ciphertext_provided', () => {
      const result = service.decrypt('');

      expect(result).toBe('');
    });

    it('should_throw_error_when_invalid_ciphertext_provided', () => {
      const invalidCiphertext = 'not-valid-base64-encrypted-data!!!';

      expect(() => service.decrypt(invalidCiphertext)).toThrow(
        'Decryption failed',
      );
    });
  });

  describe('isEncrypted', () => {
    it('should_return_true_when_data_appears_encrypted', () => {
      const plainText = 'test-data';
      const encrypted = service.encrypt(plainText);

      const result = service.isEncrypted(encrypted);

      expect(result).toBe(true);
    });

    it('should_return_false_when_data_is_not_encrypted', () => {
      const plainText = 'short';

      const result = service.isEncrypted(plainText);

      expect(result).toBe(false);
    });

    it('should_return_false_when_data_is_empty', () => {
      const result = service.isEncrypted('');

      expect(result).toBe(false);
    });
  });

  describe('encrypt-decrypt roundtrip', () => {
    it('should_preserve_special_characters_through_roundtrip', () => {
      const specialText = 'Test!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const encrypted = service.encrypt(specialText);

      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(specialText);
    });

    it('should_preserve_unicode_through_roundtrip', () => {
      const unicodeText = '日本語テスト 🔐 émojis';
      const encrypted = service.encrypt(unicodeText);

      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(unicodeText);
    });
  });
});
