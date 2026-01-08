/**
 * RedirectUriValidationService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { RedirectUriValidationService } from './redirect-uri-validation.service';

describe('RedirectUriValidationService', () => {
  let service: RedirectUriValidationService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [RedirectUriValidationService],
    }).compile();

    service = moduleRef.get<RedirectUriValidationService>(
      RedirectUriValidationService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('normalizeUri', () => {
    it('should_normalize_uri_with_trailing_slash', () => {
      const uri = 'https://example.com/';
      const result = service.normalizeUri(uri);

      expect(result).toBe('https://example.com');
    });

    it('should_normalize_uri_without_trailing_slash', () => {
      const uri = 'https://example.com';
      const result = service.normalizeUri(uri);

      expect(result).toBe('https://example.com');
    });

    it('should_normalize_uri_with_path_and_trailing_slash', () => {
      const uri = 'https://example.com/auth/callback/';
      const result = service.normalizeUri(uri);

      expect(result).toBe('https://example.com/auth/callback');
    });

    it('should_keep_root_path_as_slash', () => {
      const uri = 'https://example.com/';
      const result = service.normalizeUri(uri);

      expect(result).toBe('https://example.com');
    });

    it('should_lowercase_hostname', () => {
      const uri = 'https://EXAMPLE.COM';
      const result = service.normalizeUri(uri);

      expect(result).toBe('https://example.com');
    });

    it('should_preserve_query_parameters', () => {
      const uri = 'https://example.com?param=value';
      const result = service.normalizeUri(uri);

      expect(result).toBe('https://example.com?param=value');
    });

    it('should_allow_localhost_with_http', () => {
      const uri = 'http://localhost:3000';
      const result = service.normalizeUri(uri);

      expect(result).toBe('http://localhost:3000');
    });

    it('should_throw_BadRequestException_when_protocol_not_https_for_non_localhost', () => {
      const uri = 'http://example.com';

      expect(() => service.normalizeUri(uri)).toThrow(BadRequestException);
      expect(() => service.normalizeUri(uri)).toThrow(
        'Invalid redirect URI protocol',
      );
    });

    it('should_throw_BadRequestException_when_uri_format_invalid', () => {
      const uri = 'not-a-valid-uri';

      expect(() => service.normalizeUri(uri)).toThrow(BadRequestException);
      expect(() => service.normalizeUri(uri)).toThrow(
        'Invalid redirect URI format',
      );
    });
  });

  describe('isUriAllowed', () => {
    it('should_return_true_when_uri_matches_whitelist_exactly', () => {
      const uri = 'https://example.com';
      const allowedUris = ['https://example.com'];

      const result = service.isUriAllowed(uri, allowedUris);

      expect(result).toBe(true);
    });

    it('should_match_uri_regardless_of_trailing_slash', () => {
      const uri = 'https://example.com';
      const allowedUris = ['https://example.com/'];

      const normalizedUri = service.normalizeUri(uri);
      const result = service.isUriAllowed(normalizedUri, allowedUris);

      expect(result).toBe(true);
    });

    it('should_match_uri_with_trailing_slash_when_allowed_has_none', () => {
      const uri = 'https://example.com/';
      const allowedUris = ['https://example.com'];

      const normalizedUri = service.normalizeUri(uri);
      const result = service.isUriAllowed(normalizedUri, allowedUris);

      expect(result).toBe(true);
    });

    it('should_return_false_when_uri_not_in_whitelist', () => {
      const uri = 'https://example.com';
      const allowedUris = ['https://other.com'];

      const normalizedUri = service.normalizeUri(uri);
      const result = service.isUriAllowed(normalizedUri, allowedUris);

      expect(result).toBe(false);
    });

    it('should_match_uri_case_insensitively_by_hostname', () => {
      const uri = 'https://EXAMPLE.COM';
      const allowedUris = ['https://example.com'];

      const normalizedUri = service.normalizeUri(uri);
      const result = service.isUriAllowed(normalizedUri, allowedUris);

      expect(result).toBe(true);
    });

    it('should_return_true_when_uri_matches_one_of_multiple_allowed_uris', () => {
      const uri = 'https://example.com';
      const allowedUris = [
        'https://other.com',
        'https://example.com',
        'https://third.com',
      ];

      const normalizedUri = service.normalizeUri(uri);
      const result = service.isUriAllowed(normalizedUri, allowedUris);

      expect(result).toBe(true);
    });

    it('should_return_false_when_uri_has_different_path', () => {
      const uri = 'https://example.com/other';
      const allowedUris = ['https://example.com/path'];

      const normalizedUri = service.normalizeUri(uri);
      const result = service.isUriAllowed(normalizedUri, allowedUris);

      expect(result).toBe(false);
    });
  });

  describe('validateRedirectUri', () => {
    it('should_return_default_uri_when_redirect_uri_not_provided', () => {
      const redirectUri = undefined;
      const allowedUris = ['https://example.com'];
      const defaultUri = 'https://example.com';

      const result = service.validateRedirectUri(
        redirectUri,
        allowedUris,
        defaultUri,
      );

      expect(result).toBe('https://example.com');
    });

    it('should_return_validated_uri_when_provided_and_in_whitelist', () => {
      const redirectUri = 'https://example.com';
      const allowedUris = ['https://example.com'];
      const defaultUri = 'https://default.com';

      const result = service.validateRedirectUri(
        redirectUri,
        allowedUris,
        defaultUri,
      );

      expect(result).toBe('https://example.com');
    });

    it('should_normalize_uri_before_validating', () => {
      const redirectUri = 'https://example.com/';
      const allowedUris = ['https://example.com'];
      const defaultUri = 'https://default.com';

      const result = service.validateRedirectUri(
        redirectUri,
        allowedUris,
        defaultUri,
      );

      expect(result).toBe('https://example.com');
    });

    it('should_throw_BadRequestException_when_redirect_uri_not_in_whitelist', () => {
      const redirectUri = 'https://malicious.com';
      const allowedUris = ['https://example.com'];
      const defaultUri = 'https://default.com';

      expect(() =>
        service.validateRedirectUri(redirectUri, allowedUris, defaultUri),
      ).toThrow(BadRequestException);
      expect(() =>
        service.validateRedirectUri(redirectUri, allowedUris, defaultUri),
      ).toThrow('Invalid redirect URI');
    });

    it('should_match_uri_with_trailing_slash_against_whitelist', () => {
      const redirectUri = 'https://example.com/';
      const allowedUris = ['https://example.com'];
      const defaultUri = 'https://default.com';

      const result = service.validateRedirectUri(
        redirectUri,
        allowedUris,
        defaultUri,
      );

      expect(result).toBe('https://example.com');
    });

    it('should_reject_uri_with_different_protocol', () => {
      const redirectUri = 'http://example.com';
      const allowedUris = ['https://example.com'];
      const defaultUri = 'https://default.com';

      expect(() =>
        service.validateRedirectUri(redirectUri, allowedUris, defaultUri),
      ).toThrow(BadRequestException);
    });

    it('should_reject_uri_with_different_hostname', () => {
      const redirectUri = 'https://evil.com';
      const allowedUris = ['https://example.com'];
      const defaultUri = 'https://default.com';

      expect(() =>
        service.validateRedirectUri(redirectUri, allowedUris, defaultUri),
      ).toThrow(BadRequestException);
    });

    it('should_handle_localhost_in_whitelist', () => {
      const redirectUri = 'http://localhost:3000';
      const allowedUris = ['http://localhost:3000'];
      const defaultUri = 'https://default.com';

      const result = service.validateRedirectUri(
        redirectUri,
        allowedUris,
        defaultUri,
      );

      expect(result).toBe('http://localhost:3000');
    });
  });
});
