/**
 * TrackerUrlConverterService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { TrackerUrlConverterService } from './tracker-url-converter.service';

describe('TrackerUrlConverterService', () => {
  let service: TrackerUrlConverterService;

  beforeEach(() => {
    service = new TrackerUrlConverterService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('convertTrnUrlToApiUrl', () => {
    it('should_convert_trn_url_to_api_url_when_url_is_valid_steam_platform', () => {
      const trnUrl =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';
      const expectedApiUrl =
        'https://api.tracker.gg/api/v2/rocket-league/standard/profile/steam/testuser';

      const result = service.convertTrnUrlToApiUrl(trnUrl);

      expect(result).toBe(expectedApiUrl);
    });

    it('should_convert_trn_url_to_api_url_when_url_is_valid_epic_platform', () => {
      const trnUrl =
        'https://rocketleague.tracker.network/rocket-league/profile/epic/EpicUser123/overview';
      const expectedApiUrl =
        'https://api.tracker.gg/api/v2/rocket-league/standard/profile/epic/EpicUser123';

      const result = service.convertTrnUrlToApiUrl(trnUrl);

      expect(result).toBe(expectedApiUrl);
    });

    it('should_convert_trn_url_to_api_url_when_url_is_valid_xbl_platform', () => {
      const trnUrl =
        'https://rocketleague.tracker.network/rocket-league/profile/xbl/XboxGamer/overview';
      const expectedApiUrl =
        'https://api.tracker.gg/api/v2/rocket-league/standard/profile/xbl/XboxGamer';

      const result = service.convertTrnUrlToApiUrl(trnUrl);

      expect(result).toBe(expectedApiUrl);
    });

    it('should_convert_trn_url_to_api_url_when_url_is_valid_psn_platform', () => {
      const trnUrl =
        'https://rocketleague.tracker.network/rocket-league/profile/psn/PSNPlayer/overview';
      const expectedApiUrl =
        'https://api.tracker.gg/api/v2/rocket-league/standard/profile/psn/PSNPlayer';

      const result = service.convertTrnUrlToApiUrl(trnUrl);

      expect(result).toBe(expectedApiUrl);
    });

    it('should_convert_trn_url_to_api_url_when_url_is_valid_switch_platform', () => {
      const trnUrl =
        'https://rocketleague.tracker.network/rocket-league/profile/switch/SwitchUser/overview';
      const expectedApiUrl =
        'https://api.tracker.gg/api/v2/rocket-league/standard/profile/switch/SwitchUser';

      const result = service.convertTrnUrlToApiUrl(trnUrl);

      expect(result).toBe(expectedApiUrl);
    });

    it('should_url_encode_username_when_username_contains_special_characters', () => {
      const trnUrl =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/user%20name/overview';
      const expectedApiUrl =
        'https://api.tracker.gg/api/v2/rocket-league/standard/profile/steam/user%2520name';

      const result = service.convertTrnUrlToApiUrl(trnUrl);

      expect(result).toBe(expectedApiUrl);
    });

    it('should_handle_uppercase_platform_names', () => {
      const trnUrl =
        'https://rocketleague.tracker.network/rocket-league/profile/STEAM/testuser/overview';
      const expectedApiUrl =
        'https://api.tracker.gg/api/v2/rocket-league/standard/profile/steam/testuser';

      const result = service.convertTrnUrlToApiUrl(trnUrl);

      expect(result).toBe(expectedApiUrl);
    });

    it('should_throw_bad_request_exception_when_url_format_is_invalid', () => {
      const invalidUrl = 'https://invalid-url.com/profile';

      expect(() => service.convertTrnUrlToApiUrl(invalidUrl)).toThrow(
        BadRequestException,
      );

      expect(() => service.convertTrnUrlToApiUrl(invalidUrl)).toThrow(
        'Invalid TRN URL format',
      );
    });

    it('should_throw_bad_request_exception_when_url_missing_platform', () => {
      const invalidUrl =
        'https://rocketleague.tracker.network/rocket-league/profile//username/overview';

      expect(() => service.convertTrnUrlToApiUrl(invalidUrl)).toThrow(
        BadRequestException,
      );
    });

    it('should_throw_bad_request_exception_when_url_missing_username', () => {
      const invalidUrl =
        'https://rocketleague.tracker.network/rocket-league/profile/steam//overview';

      expect(() => service.convertTrnUrlToApiUrl(invalidUrl)).toThrow(
        BadRequestException,
      );
    });

    it('should_throw_bad_request_exception_when_platform_is_unsupported', () => {
      const invalidUrl =
        'https://rocketleague.tracker.network/rocket-league/profile/unsupported/testuser/overview';

      expect(() => service.convertTrnUrlToApiUrl(invalidUrl)).toThrow(
        BadRequestException,
      );

      expect(() => service.convertTrnUrlToApiUrl(invalidUrl)).toThrow(
        'Unsupported platform',
      );
    });

    it('should_throw_bad_request_exception_when_url_is_not_https', () => {
      const invalidUrl =
        'http://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';

      expect(() => service.convertTrnUrlToApiUrl(invalidUrl)).toThrow(
        BadRequestException,
      );
    });

    it('should_throw_bad_request_exception_when_error_occurs_during_conversion', () => {
      const invalidUrl = null as unknown as string;

      expect(() => service.convertTrnUrlToApiUrl(invalidUrl)).toThrow(
        BadRequestException,
      );

      expect(() => service.convertTrnUrlToApiUrl(invalidUrl)).toThrow(
        'Failed to convert tracker URL to API URL',
      );
    });

    it('should_handle_url_with_trailing_slash', () => {
      const trnUrl =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview/';
      const expectedApiUrl =
        'https://api.tracker.gg/api/v2/rocket-league/standard/profile/steam/testuser';

      const result = service.convertTrnUrlToApiUrl(trnUrl);

      expect(result).toBe(expectedApiUrl);
    });
  });

  describe('isValidTrnUrl', () => {
    it('should_return_true_when_url_is_valid_trn_format', () => {
      const validUrl =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';

      const result = service.isValidTrnUrl(validUrl);

      expect(result).toBe(true);
    });

    it('should_return_false_when_url_is_not_https', () => {
      const invalidUrl =
        'http://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';

      const result = service.isValidTrnUrl(invalidUrl);

      expect(result).toBe(false);
    });

    it('should_return_false_when_hostname_is_incorrect', () => {
      const invalidUrl =
        'https://tracker.gg/rocket-league/profile/steam/testuser/overview';

      const result = service.isValidTrnUrl(invalidUrl);

      expect(result).toBe(false);
    });

    it('should_return_false_when_url_format_does_not_match_regex', () => {
      const invalidUrl = 'https://rocketleague.tracker.network/invalid/path';

      const result = service.isValidTrnUrl(invalidUrl);

      expect(result).toBe(false);
    });

    it('should_return_false_when_url_is_invalid_format', () => {
      const invalidUrl = 'not-a-url';

      const result = service.isValidTrnUrl(invalidUrl);

      expect(result).toBe(false);
    });

    it('should_return_false_when_url_is_null', () => {
      const invalidUrl = null as unknown as string;

      const result = service.isValidTrnUrl(invalidUrl);

      expect(result).toBe(false);
    });

    it('should_return_false_when_url_is_empty_string', () => {
      const invalidUrl = '';

      const result = service.isValidTrnUrl(invalidUrl);

      expect(result).toBe(false);
    });
  });
});
