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
  private static readonly JWT_PATTERN =
    /(Bearer\s+)?(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*)/g;

  private static readonly API_KEY_PATTERNS = [
    /Bearer\s+bot_[A-Za-z0-9_.]+/g,
    /api_key\s*=\s*[A-Za-z0-9_]+/g,
  ];

  private static readonly PASSWORD_FIELDS = [
    'password',
    'pwd',
    'pass',
    'secret',
  ];

  private static readonly SECRET_FIELD_PATTERN =
    /(_key|_token|_secret|_password)$/i;

  /**
   * Sanitize a string message by replacing sensitive data patterns
   */
  static sanitizeString(message: string): string {
    if (!message || typeof message !== 'string') {
      return message;
    }

    let sanitized = message;

    for (const pattern of this.API_KEY_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[API_KEY]');
    }

    const jwtPattern = /(Bearer\s+)?(eyJ[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)+)/g;
    sanitized = sanitized.replace(
      jwtPattern,
      (match, bearer) => (bearer ? 'Bearer ' : '') + '[JWT_TOKEN]',
    );

    return sanitized;
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
      const jwtPattern = /(Bearer\s+)?(eyJ[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)+)/;
      if (jwtPattern.test(authValue)) {
        sanitized[authKey] = '[JWT_TOKEN]';
      } else {
        let isApiKey = false;
        for (const patternStr of ['Bearer\\s+bot_[A-Za-z0-9_\\.]+']) {
          const pattern = new RegExp(patternStr);
          if (pattern.test(authValue)) {
            sanitized[authKey] = '[API_KEY]';
            isApiKey = true;
            break;
          }
        }
        if (!isApiKey) {
          const sanitizedValue = this.sanitizeString(authValue);
          sanitized[authKey] = sanitizedValue;
        }
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
