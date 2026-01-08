import { Injectable, BadRequestException, Logger } from '@nestjs/common';

@Injectable()
export class RedirectUriValidationService {
  private readonly logger = new Logger(RedirectUriValidationService.name);

  /**
   * Validate redirect URI against whitelist
   * Returns the validated URI (normalized) or throws BadRequestException
   * @param redirectUri - Redirect URI from OAuth callback (optional)
   * @param allowedUris - Array of allowed redirect URIs
   * @param defaultUri - Default URI to use if redirectUri not provided
   * @returns Normalized validated URI
   * @throws BadRequestException if redirectUri is provided but not in whitelist
   */
  validateRedirectUri(
    redirectUri: string | undefined,
    allowedUris: string[],
    defaultUri: string,
  ): string {
    if (!redirectUri) {
      return this.normalizeUri(defaultUri);
    }

    const normalizedRedirectUri = this.normalizeUri(redirectUri);

    if (!this.isUriAllowed(normalizedRedirectUri, allowedUris)) {
      this.logger.warn(
        `OAuth callback received with invalid redirect URI - potential open redirect attack. URI: ${redirectUri}`,
      );
      throw new BadRequestException(
        'Invalid redirect URI. The provided redirect URI is not allowed.',
      );
    }

    return normalizedRedirectUri;
  }

  /**
   * Normalize URI for comparison (protocol, hostname, path, trailing slashes)
   * @param uri - URI to normalize
   * @returns Normalized URI
   */
  normalizeUri(uri: string): string {
    try {
      const url = new URL(uri);

      // Require HTTPS (except localhost for development)
      if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
        throw new BadRequestException(
          'Invalid redirect URI protocol. Only HTTPS is allowed (except localhost).',
        );
      }

      let normalizedPath = url.pathname;
      if (normalizedPath === '/') {
        normalizedPath = '';
      } else if (normalizedPath.endsWith('/')) {
        normalizedPath = normalizedPath.slice(0, -1);
      }

      const normalizedHostname = url.hostname.toLowerCase();

      let result = `${url.protocol}//${normalizedHostname}`;
      if (url.port) {
        result += `:${url.port}`;
      }
      result += normalizedPath;
      if (url.search) {
        result += url.search;
      }
      if (url.hash) {
        result += url.hash;
      }

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Invalid redirect URI format: ${uri}`);
    }
  }

  /**
   * Check if URI is in the allowed whitelist
   * Compares normalized URIs
   * @param uri - URI to check (should already be normalized)
   * @param allowedUris - Array of allowed URIs
   * @returns true if URI is allowed, false otherwise
   */
  isUriAllowed(uri: string, allowedUris: string[]): boolean {
    // Skip any invalid URIs in the whitelist (log warning but don't fail)
    const normalizedAllowedUris: string[] = [];
    for (const allowedUri of allowedUris) {
      try {
        normalizedAllowedUris.push(this.normalizeUri(allowedUri));
      } catch {
        this.logger.warn(
          `Invalid redirect URI in whitelist configuration: ${allowedUri}`,
        );
      }
    }

    return normalizedAllowedUris.includes(uri);
  }
}
