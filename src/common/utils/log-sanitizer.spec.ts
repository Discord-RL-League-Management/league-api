import { describe, it, expect } from 'vitest';
import { LogSanitizer } from './log-sanitizer';

describe('LogSanitizer', () => {
  describe('sanitizeString', () => {
    it('should_replace_jwt_token_with_redacted_when_bearer_token_present', () => {
      const message =
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const sanitized = LogSanitizer.sanitizeString(message);
      expect(sanitized).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(sanitized).toContain('[JWT_TOKEN]');
    });

    it('should_replace_jwt_token_without_bearer_prefix_when_token_present', () => {
      const message =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const sanitized = LogSanitizer.sanitizeString(message);
      expect(sanitized).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(sanitized).toContain('[JWT_TOKEN]');
    });

    it('should_replace_api_key_when_bearer_bot_pattern_detected_in_string', () => {
      const message =
        'Bearer bot_FAKE_TEST_TOKEN_1234567890.ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const sanitized = LogSanitizer.sanitizeString(message);
      expect(sanitized).not.toContain('bot_FAKE_TEST_TOKEN_1234567890');
      expect(sanitized).toContain('[API_KEY]');
    });

    it('should_replace_api_key_when_bearer_bot_pattern_detected', () => {
      const message =
        'Bearer bot_1234567890abcdef1234567890.ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const sanitized = LogSanitizer.sanitizeString(message);
      expect(sanitized).not.toContain('bot_1234567890abcdef1234567890');
      expect(sanitized).toContain('[API_KEY]');
    });

    it('should_replace_api_key_when_api_key_equals_pattern_detected', () => {
      const message = 'api_key=FAKE_BOT_API_KEY_1234567890abcdef1234567890';
      const sanitized = LogSanitizer.sanitizeString(message);
      expect(sanitized).not.toContain(
        'FAKE_BOT_API_KEY_1234567890abcdef1234567890',
      );
      expect(sanitized).toContain('[API_KEY]');
    });

    it('should_preserve_safe_content_when_no_sensitive_data_present', () => {
      const message = 'User request: GET /api/users';
      const sanitized = LogSanitizer.sanitizeString(message);
      expect(sanitized).toBe(message);
    });

    it('should_return_empty_string_when_empty_string_provided', () => {
      const sanitized = LogSanitizer.sanitizeString('');
      expect(sanitized).toBe('');
    });

    it('should_handle_multiple_sensitive_patterns_in_same_string', () => {
      const message =
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test and api_key=FAKE_BOT_API_KEY_123';
      const sanitized = LogSanitizer.sanitizeString(message);
      expect(sanitized).toContain('[JWT_TOKEN]');
      expect(sanitized).toContain('[API_KEY]');
      expect(sanitized).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(sanitized).not.toContain('FAKE_BOT_API_KEY_123');
    });
  });

  describe('sanitizeObject', () => {
    it('should_redact_password_field_when_password_present', () => {
      const obj = { username: 'testuser', password: 'secret123' };
      const sanitized = LogSanitizer.sanitizeObject(obj);
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.username).toBe('testuser');
    });

    it('should_redact_pwd_field_when_pwd_present', () => {
      const obj = { user: 'test', pwd: 'secret123' };
      const sanitized = LogSanitizer.sanitizeObject(obj);
      expect(sanitized.pwd).toBe('[REDACTED]');
    });

    it('should_redact_pass_field_when_pass_present', () => {
      const obj = { user: 'test', pass: 'secret123' };
      const sanitized = LogSanitizer.sanitizeObject(obj);
      expect(sanitized.pass).toBe('[REDACTED]');
    });

    it('should_redact_secret_field_when_secret_present', () => {
      const obj = { name: 'test', secret: 'mysecret' };
      const sanitized = LogSanitizer.sanitizeObject(obj);
      expect(sanitized.secret).toBe('[REDACTED]');
    });

    it('should_redact_fields_ending_with_key_when_secret_pattern_detected', () => {
      const obj = { name: 'test', api_key: 'FAKE_BOT_API_KEY_123' };
      const sanitized = LogSanitizer.sanitizeObject(obj);
      expect(sanitized.api_key).toBe('[REDACTED]');
    });

    it('should_redact_fields_ending_with_token_when_secret_pattern_detected', () => {
      const obj = {
        name: 'test',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
      };
      const sanitized = LogSanitizer.sanitizeObject(obj);
      expect(sanitized.refresh_token).toBe('[REDACTED]');
    });

    it('should_redact_fields_ending_with_secret_when_secret_pattern_detected', () => {
      const obj = { name: 'test', client_secret: 'secret123' };
      const sanitized = LogSanitizer.sanitizeObject(obj);
      expect(sanitized.client_secret).toBe('[REDACTED]');
    });

    it('should_redact_fields_ending_with_password_when_secret_pattern_detected', () => {
      const obj = { name: 'test', db_password: 'dbpass123' };
      const sanitized = LogSanitizer.sanitizeObject(obj);
      expect(sanitized.db_password).toBe('[REDACTED]');
    });

    it('should_sanitize_nested_objects_recursively', () => {
      const obj = {
        user: { username: 'test', password: 'secret123' },
        config: { api_key: 'FAKE_BOT_API_KEY_123' },
      };
      const sanitized = LogSanitizer.sanitizeObject(obj);
      expect(sanitized.user.password).toBe('[REDACTED]');
      expect(sanitized.config.api_key).toBe('[REDACTED]');
      expect(sanitized.user.username).toBe('test');
    });

    it('should_sanitize_arrays_of_objects', () => {
      const obj = {
        users: [
          { username: 'user1', password: 'pass1' },
          { username: 'user2', password: 'pass2' },
        ],
      };
      const sanitized = LogSanitizer.sanitizeObject(obj);
      expect(sanitized.users[0].password).toBe('[REDACTED]');
      expect(sanitized.users[1].password).toBe('[REDACTED]');
    });

    it('should_preserve_safe_fields_when_no_sensitive_data_present', () => {
      const obj = { username: 'test', email: 'test@example.com', age: 30 };
      const sanitized = LogSanitizer.sanitizeObject(obj);
      expect(sanitized).toEqual(obj);
    });

    it('should_handle_null_values', () => {
      const obj = { username: 'test', password: null };
      const sanitized = LogSanitizer.sanitizeObject(obj);
      expect(sanitized.password).toBe('[REDACTED]');
    });

    it('should_handle_undefined_values', () => {
      const obj = { username: 'test', password: undefined };
      const sanitized = LogSanitizer.sanitizeObject(obj);
      expect(sanitized.password).toBe('[REDACTED]');
    });

    it('should_sanitize_string_values_in_objects_that_contain_tokens', () => {
      const obj = {
        authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
        message: 'Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.other',
      };
      const sanitized = LogSanitizer.sanitizeObject(obj);
      expect(sanitized.authorization).toContain('[JWT_TOKEN]');
      expect(sanitized.message).toContain('[JWT_TOKEN]');
    });
  });

  describe('sanitizeHeaders', () => {
    it('should_redact_authorization_header_when_jwt_token_present', () => {
      const headers = {
        authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
        'user-agent': 'Mozilla/5.0',
      };
      const sanitized = LogSanitizer.sanitizeHeaders(headers);
      expect(sanitized.authorization).toBe('[JWT_TOKEN]');
      expect(sanitized['user-agent']).toBe('Mozilla/5.0');
    });

    it('should_redact_authorization_header_when_api_key_present', () => {
      const headers = {
        authorization:
          'Bearer bot_FAKE_TEST_TOKEN_1234567890.ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'content-type': 'application/json',
      };
      const sanitized = LogSanitizer.sanitizeHeaders(headers);
      expect(sanitized.authorization).toBe('[API_KEY]');
      expect(sanitized['content-type']).toBe('application/json');
    });

    it('should_sanitize_cookie_header_when_sensitive_data_present', () => {
      const headers = {
        cookie: 'session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
        'content-type': 'application/json',
      };
      const sanitized = LogSanitizer.sanitizeHeaders(headers);
      expect(sanitized.cookie).toContain('[JWT_TOKEN]');
    });

    it('should_preserve_safe_headers_when_no_sensitive_data_present', () => {
      const headers = {
        'user-agent': 'Mozilla/5.0',
        'content-type': 'application/json',
        accept: 'application/json',
      };
      const sanitized = LogSanitizer.sanitizeHeaders(headers);
      expect(sanitized).toEqual(headers);
    });

    it('should_handle_case_insensitive_authorization_header', () => {
      const headers = {
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
      };
      const sanitized = LogSanitizer.sanitizeHeaders(headers);
      expect(sanitized.Authorization).toBe('[JWT_TOKEN]');
    });
  });
});
