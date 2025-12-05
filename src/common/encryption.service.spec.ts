/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  const mockConfigService = {
    get: jest
      .fn<string, [string, unknown?]>()
      .mockReturnValue(
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  describe('encrypt', () => {
    it('should encrypt text data', () => {
      const plaintext = 'test-refresh-token';
      const encrypted = service.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64 encoded
    });

    it('should return empty string for empty input', () => {
      expect(service.encrypt('')).toBe('');
      expect(service.encrypt(null as any)).toBeNull();
      expect(service.encrypt(undefined as any)).toBeUndefined();
    });

    it('should encrypt different inputs to different outputs', () => {
      const token1 = 'token1';
      const token2 = 'token2';

      const encrypted1 = service.encrypt(token1);
      const encrypted2 = service.encrypt(token2);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should produce same output for same input (non-deterministic but stable format)', () => {
      const plaintext = 'test-token';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      // Should be different due to random IV, but should have same structure
      expect(encrypted1.length).toBe(encrypted2.length);
      expect(() => service.decrypt(encrypted1)).not.toThrow();
      expect(() => service.decrypt(encrypted2)).not.toThrow();
    });
  });

  describe('decrypt', () => {
    it('should decrypt encrypted data correctly', () => {
      const plaintext = 'test-refresh-token';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should return empty string for empty input', () => {
      expect(service.decrypt('')).toBe('');
      expect(service.decrypt(null as unknown as string)).toBeNull();
      expect(service.decrypt(undefined as unknown as string)).toBeUndefined();
    });

    it('should throw error for invalid encrypted data', () => {
      const invalidData = 'not-valid-base64';

      expect(() => service.decrypt(invalidData)).toThrow('Decryption failed');
    });

    it('should handle long tokens', () => {
      const longToken = 'a'.repeat(1000);
      const encrypted = service.encrypt(longToken);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(longToken);
    });

    it('should handle special characters', () => {
      const specialToken = 'token-with-special-!@#$%^&*()chars';
      const encrypted = service.encrypt(specialToken);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(specialToken);
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted data', () => {
      const plaintext = 'test-token';
      const encrypted = service.encrypt(plaintext);

      expect(service.isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plaintext', () => {
      const plaintext = 'plain-text-token';

      expect(service.isEncrypted(plaintext)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(service.isEncrypted('')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(service.isEncrypted(null as any)).toBe(false);
      expect(service.isEncrypted(undefined as any)).toBe(false);
    });
  });

  describe('encrypt-decrypt round trip', () => {
    it('should successfully encrypt and decrypt various tokens', () => {
      const testCases = [
        'simple-token',
        'token-with-special-chars-!@#$%',
        'very-long-token-' + 'a'.repeat(500),
        'token-with-unicode-🔑',
        'refresh_token_123456789',
      ];

      testCases.forEach((token) => {
        const encrypted = service.encrypt(token);
        const decrypted = service.decrypt(encrypted);
        expect(decrypted).toBe(token);
      });
    });

    it('should handle multiple encryption/decryption cycles', () => {
      const plaintext = 'test-token';
      let current = plaintext;

      for (let i = 0; i < 5; i++) {
        const encrypted = service.encrypt(current);
        current = service.decrypt(encrypted);
        expect(current).toBe(plaintext);
      }
    });
  });

  describe('encryption key handling', () => {
    it('should use encryption key from config', () => {
      const serviceWithKey = new EncryptionService(mockConfigService as any);
      const plaintext = 'test-token';
      const encrypted = serviceWithKey.encrypt(plaintext);
      const decrypted = serviceWithKey.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should work when ENCRYPTION_KEY is not set (development mode)', () => {
      const devConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      };
      const serviceDev = new EncryptionService(devConfigService as any);

      const plaintext = 'test-token';
      const encrypted = serviceDev.encrypt(plaintext);
      const decrypted = serviceDev.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('error handling', () => {
    it('should throw error when decrypting tampered data', () => {
      const plaintext = 'test-token';
      const encrypted = service.encrypt(plaintext);
      const tampered = encrypted.slice(0, -10) + 'tampered=='; // Tamper with data

      expect(() => service.decrypt(tampered)).toThrow('Decryption failed');
    });
  });
});
