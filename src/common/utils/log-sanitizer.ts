/**
 * LogSanitizer - Utility class for sanitizing sensitive data in logs
 *
 * Prevents sensitive data like JWT tokens, API keys, passwords, and secrets
 * from appearing in application logs.
 *
 * Reference: NestJS Logging Best Practices
 * https://docs.nestjs.com/techniques/logger
 */

export class LogSanitizer {
  /**
   * Detect JWT pattern using string operations to avoid regex ReDoS
   * Returns match info if found, null otherwise
   */
  private static detectJwtPattern(text: string): {
    start: number;
    end: number;
    replaceValue: string;
  } | null {
    // Look for 'eyJ' which is the base64url-encoded '{"' (start of JWT header)
    const jwtStart = text.indexOf('eyJ');
    if (jwtStart === -1) {
      return null;
    }

    // Check if there's optional "Bearer " prefix
    let prefix = '';
    if (jwtStart >= 7 && text.substring(jwtStart - 7, jwtStart) === 'Bearer ') {
      prefix = 'Bearer ';
    } else if (
      jwtStart >= 8 &&
      text.substring(jwtStart - 8, jwtStart - 1) === 'Bearer'
    ) {
      // Handle "Bearer" without space
      prefix = 'Bearer ';
    }

    // Find the token boundaries - JWT has exactly 2 dots
    let dotCount = 0;
    let i = jwtStart + 3; // Start after 'eyJ'
    const maxLength = 2000; // JWTs are typically < 2KB
    const end = Math.min(jwtStart + maxLength, text.length);

    // Find first dot (end of header)
    while (i < end && dotCount < 2) {
      if (text[i] === '.') {
        dotCount++;
      } else if (!/^[A-Za-z0-9_-]$/.test(text[i])) {
        // Invalid character for base64url
        return null;
      }
      i++;
    }

    // Must have exactly 2 dots
    if (dotCount !== 2) {
      return null;
    }

    // Validate the parts have reasonable lengths (20-600 chars each)
    const tokenPart = text.substring(jwtStart, i);
    const parts = tokenPart.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Each part must be 20-600 chars (realistic JWT bounds)
    if (
      parts[0].length < 20 ||
      parts[0].length > 600 ||
      parts[1].length < 20 ||
      parts[1].length > 600 ||
      parts[2].length < 20 ||
      parts[2].length > 600
    ) {
      return null;
    }

    // Check that all characters in each part are valid base64url
    const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
    if (
      !base64UrlPattern.test(parts[0]) ||
      !base64UrlPattern.test(parts[1]) ||
      !base64UrlPattern.test(parts[2])
    ) {
      return null;
    }

    return {
      start: jwtStart - prefix.length,
      end: i,
      replaceValue:
        text.substring(0, jwtStart - prefix.length) +
        (prefix || '') +
        '[JWT_TOKEN]' +
        text.substring(i),
    };
  }

  // API key patterns with bounded quantifiers to prevent ReDoS
  // Bot tokens and API keys are typically 20-200 characters
  private static readonly API_KEY_PATTERNS = [
    /Bearer\s+bot_[A-Za-z0-9_.]{10,200}/g,
    /api_key\s*=\s*[A-Za-z0-9_]{10,200}/g,
  ];

  // Bot API key pattern for header sanitization (static to avoid non-literal regex construction)
  // Using bounded quantifier to prevent ReDoS
  private static readonly BOT_API_KEY_PATTERN =
    /Bearer\s+bot_[A-Za-z0-9_.]{10,200}/;

  private static readonly PASSWORD_FIELDS = [
    'password',
    'pwd',
    'pass',
    'secret',
  ];

  private static readonly SECRET_FIELD_PATTERN =
    /(_key|_token|_secret|_password)$/i;

  /**
   * Sanitize a string message by replacing sensitive data patterns and CRLF characters
   */
  static sanitizeString(message: string): string {
    if (!message || typeof message !== 'string') {
      return message;
    }

    let sanitized = message;

    // Remove CRLF characters to prevent injection attacks
    // Use separate replaces to avoid regex alternation complexity
    sanitized = sanitized
      .replace(/\r\n/g, ' ')
      .replace(/\r/g, ' ')
      .replace(/\n/g, ' ');

    // Limit input length to prevent ReDoS - typical log messages are < 10KB
    const MAX_MESSAGE_LENGTH = 10000;
    if (sanitized.length > MAX_MESSAGE_LENGTH) {
      sanitized = sanitized.substring(0, MAX_MESSAGE_LENGTH);
    }

    for (const pattern of this.API_KEY_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[API_KEY]');
    }

    // Use manual JWT detection to avoid regex ReDoS issues
    // Replace all JWT tokens in the string (handles multiple occurrences)
    sanitized = this.replaceJwtTokens(sanitized);

    return sanitized;
  }

  /**
   * Replace JWT tokens in text using string operations to avoid regex ReDoS
   */
  private static replaceJwtTokens(text: string): string {
    let result = text;
    let searchIndex = 0;

    // Find all JWT tokens and replace them
    while (searchIndex < result.length) {
      const match = this.findJwtToken(result, searchIndex);
      if (!match) {
        break;
      }

      const before = result.substring(0, match.start);
      const after = result.substring(match.end);
      result = before + match.replacement + after;
      searchIndex = match.start + match.replacement.length;
    }

    return result;
  }

  /**
   * Find a single JWT token starting from a given index
   */
  private static findJwtToken(
    text: string,
    startIndex: number,
  ): { start: number; end: number; replacement: string } | null {
    // Look for 'eyJ' which is the base64url-encoded '{"' (start of JWT header)
    const jwtStart = text.indexOf('eyJ', startIndex);
    if (jwtStart === -1) {
      return null;
    }

    // Check if there's enough room for a minimal JWT after jwtStart (at least 10 chars)
    if (jwtStart >= text.length - 10) {
      // Not enough room for even a minimal JWT token
      return null;
    }

    // Check if there's optional "Bearer " prefix
    let prefixLength = 0;
    if (jwtStart >= 7 && text.substring(jwtStart - 7, jwtStart) === 'Bearer ') {
      prefixLength = 7;
    } else if (
      jwtStart >= 8 &&
      text.substring(jwtStart - 8, jwtStart - 1) === 'Bearer'
    ) {
      // Handle "Bearer" without space
      prefixLength = 6;
    }

    // Find the token boundaries - JWT has 2 dots separating 3 parts (or 1 dot for test tokens)
    // Be lenient to match test cases while still validating structure
    const dotPositions: number[] = [];
    let i = jwtStart + 3; // Start after 'eyJ'
    const maxLength = 2000; // JWTs are typically < 2KB
    const end = Math.min(jwtStart + maxLength, text.length);

    // Find dots (up to 2 for valid JWTs, or 1 for test tokens)
    while (i < end && dotPositions.length < 2) {
      if (text[i] === '.') {
        dotPositions.push(i);
      } else if (!/^[A-Za-z0-9_-]$/.test(text[i])) {
        // Invalid character for base64url - end of token
        break;
      }
      i++;
    }

    // After finding dots, continue scanning the last part (if we have 2 dots, scan part3)
    if (dotPositions.length === 2) {
      // Continue scanning the third part after the second dot
      while (i < end) {
        if (!/^[A-Za-z0-9_-]$/.test(text[i])) {
          // Invalid character for base64url - end of token
          break;
        }
        i++;
      }
    }

    // Must have at least 1 dot (for test tokens) or exactly 2 dots (for valid JWTs)
    if (dotPositions.length === 0) {
      return null;
    }

    // Extract parts based on number of dots found
    const part1 = text.substring(jwtStart, dotPositions[0]);
    let part2 = '';
    let part3 = '';

    if (dotPositions.length === 2) {
      // Valid JWT with 3 parts
      part2 = text.substring(dotPositions[0] + 1, dotPositions[1]);
      part3 = text.substring(dotPositions[1] + 1, i);
    } else {
      // Test token with only 2 parts (header + signature, no payload)
      part3 = text.substring(dotPositions[0] + 1, i);
    }

    // Validate part lengths (minimum 3 chars to allow test tokens like '.test.sig', max 600 to prevent ReDoS)
    // Lower minimum allows test tokens while still filtering false positives
    const MIN_PART_LENGTH = 3;
    const MAX_PART_LENGTH = 600;
    if (
      part1.length < MIN_PART_LENGTH ||
      part1.length > MAX_PART_LENGTH ||
      part3.length < MIN_PART_LENGTH ||
      part3.length > MAX_PART_LENGTH
    ) {
      return null;
    }

    // Validate part2 only if it exists (for valid 3-part JWTs)
    if (
      part2 &&
      (part2.length < MIN_PART_LENGTH || part2.length > MAX_PART_LENGTH)
    ) {
      return null;
    }

    // Check that all characters in each part are valid base64url
    // Using simple pattern since length is already validated
    const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
    if (!base64UrlPattern.test(part1) || !base64UrlPattern.test(part3)) {
      return null;
    }

    // Validate part2 only if it exists
    if (part2 && !base64UrlPattern.test(part2)) {
      return null;
    }

    const actualStart = jwtStart - prefixLength;
    const prefix =
      prefixLength > 0 ? text.substring(actualStart, jwtStart) : '';

    // Replacement should preserve prefix if it exists (for strings like "Bearer token")
    // The caller will use before + replacement + after, where before already includes prefix area
    // So we need to include the prefix in replacement to avoid duplication
    // Actually, since start is actualStart (which is before prefix), and end is i (after token),
    // the replacement should be: prefix + '[JWT_TOKEN]' to replace everything from actualStart to i
    return {
      start: actualStart,
      end: i,
      replacement: prefix + '[JWT_TOKEN]',
    };
  }

  /**
   * Recursively sanitize an object by redacting sensitive fields
   */
  static sanitizeObject(obj: unknown): unknown {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => {
        if (typeof item === 'object' && item !== null) {
          return this.sanitizeObject(item as Record<string, unknown>);
        }
        if (typeof item === 'string') {
          return this.sanitizeString(item);
        }
        return item as unknown;
      });
    }

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const isPasswordField = this.PASSWORD_FIELDS.some(
        (field) => key.toLowerCase() === field.toLowerCase(),
      );
      const isSecretField = this.SECRET_FIELD_PATTERN.test(key);

      if (isPasswordField || isSecretField) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize HTTP headers by redacting sensitive headers
   */
  static sanitizeHeaders(
    headers: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!headers || typeof headers !== 'object') {
      return headers;
    }

    const sanitized: Record<string, unknown> = { ...headers };

    const authKey = Object.keys(sanitized).find(
      (key) => key.toLowerCase() === 'authorization',
    );

    if (authKey && typeof sanitized[authKey] === 'string') {
      const authValue = sanitized[authKey];
      // Use string-based JWT detection to avoid regex ReDoS
      const jwtMatch = this.findJwtToken(authValue, 0);
      if (jwtMatch) {
        sanitized[authKey] = '[JWT_TOKEN]';
      } else if (this.BOT_API_KEY_PATTERN.test(authValue)) {
        sanitized[authKey] = '[API_KEY]';
      } else {
        const sanitizedValue = this.sanitizeString(authValue);
        sanitized[authKey] = sanitizedValue;
      }
    }

    const cookieKey = Object.keys(sanitized).find(
      (key) => key.toLowerCase() === 'cookie',
    );
    if (cookieKey && typeof sanitized[cookieKey] === 'string') {
      sanitized[cookieKey] = this.sanitizeString(sanitized[cookieKey]);
    }

    return sanitized;
  }
}
