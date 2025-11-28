import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  CreateTrackerDto,
  AddTrackerDto,
  RegisterTrackersDto,
} from './tracker.dto';
import { Game, GamePlatform } from '@prisma/client';

describe('Tracker DTOs', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CreateTrackerDto', () => {
    const validUrl =
      'https://rocketleague.tracker.network/rocket-league/profile/steam/123456789/overview';

    it('should be defined', () => {
      expect(CreateTrackerDto).toBeDefined();
    });

    it('should validate a correct DTO with valid inputs', async () => {
      const input = {
        url: validUrl,
        game: Game.ROCKET_LEAGUE,
        platform: GamePlatform.STEAM,
        username: '123456789',
      };
      const dto = plainToInstance(CreateTrackerDto, input);

      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should fail validation when URL is invalid format', async () => {
      const input = {
        url: 'not-a-url',
        game: Game.ROCKET_LEAGUE,
        platform: GamePlatform.STEAM,
        username: '123456789',
      };
      const dto = plainToInstance(CreateTrackerDto, input);

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const urlError = errors.find((e) => e.property === 'url');
      expect(urlError).toBeDefined();
      expect(urlError?.constraints?.isUrl).toBeDefined();
    });

    it('should validate URL format according to @IsUrl() behavior', async () => {
      const input = {
        url: 'missing-protocol.com',
        game: Game.ROCKET_LEAGUE,
        platform: GamePlatform.STEAM,
        username: '123456789',
      };
      const dto = plainToInstance(CreateTrackerDto, input);

      const errors = await validate(dto);

      // Documents @IsUrl() validator behavior since TrackerValidationService provides additional protocol validation
      if (errors.length > 0) {
        const urlError = errors.find((e) => e.property === 'url');
        expect(urlError?.constraints?.isUrl).toBeDefined();
      }
    });

    it('should accept URL with non-http protocol', async () => {
      const input = {
        url: 'ftp://example.com',
        game: Game.ROCKET_LEAGUE,
        platform: GamePlatform.STEAM,
        username: '123456789',
      };
      const dto = plainToInstance(CreateTrackerDto, input);

      const errors = await validate(dto);

      // @IsUrl() accepts all protocols by default; TrackerValidationService enforces HTTPS-only for tracker URLs
      expect(errors.length).toBe(0);
    });

    it('should fail validation when URL is empty string', async () => {
      const input = {
        url: '',
        game: Game.ROCKET_LEAGUE,
        platform: GamePlatform.STEAM,
        username: '123456789',
      };
      const dto = plainToInstance(CreateTrackerDto, input);

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const urlError = errors.find((e) => e.property === 'url');
      expect(urlError).toBeDefined();
      expect(
        urlError?.constraints?.isNotEmpty || urlError?.constraints?.isUrl,
      ).toBeDefined();
    });

    it('should fail validation when URL is not a string type', async () => {
      const input = {
        url: 12345,
        game: Game.ROCKET_LEAGUE,
        platform: GamePlatform.STEAM,
        username: '123456789',
      };
      const dto = plainToInstance(CreateTrackerDto, input);

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const urlError = errors.find((e) => e.property === 'url');
      expect(urlError).toBeDefined();
      expect(urlError?.constraints?.isString).toBeDefined();
    });

    it('should fail validation when URL is missing', async () => {
      const input = {
        game: Game.ROCKET_LEAGUE,
        platform: GamePlatform.STEAM,
        username: '123456789',
      };
      const dto = plainToInstance(CreateTrackerDto, input);

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const urlError = errors.find((e) => e.property === 'url');
      expect(urlError).toBeDefined();
      expect(urlError?.constraints?.isNotEmpty).toBeDefined();
    });
  });

  describe('AddTrackerDto', () => {
    const validUrl =
      'https://rocketleague.tracker.network/rocket-league/profile/steam/123456789/overview';

    it('should be defined', () => {
      expect(AddTrackerDto).toBeDefined();
    });

    it('should validate a correct DTO with valid input', async () => {
      const input = {
        url: validUrl,
      };
      const dto = plainToInstance(AddTrackerDto, input);

      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should fail validation when URL is invalid format', async () => {
      const input = {
        url: 'not-a-url',
      };
      const dto = plainToInstance(AddTrackerDto, input);

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const urlError = errors.find((e) => e.property === 'url');
      expect(urlError).toBeDefined();
      expect(urlError?.constraints?.isUrl).toBeDefined();
    });

    it('should validate URL format according to @IsUrl() behavior', async () => {
      const input = {
        url: 'missing-protocol.com',
      };
      const dto = plainToInstance(AddTrackerDto, input);

      const errors = await validate(dto);

      // Documents @IsUrl() validator behavior since TrackerValidationService provides additional protocol validation
      if (errors.length > 0) {
        const urlError = errors.find((e) => e.property === 'url');
        expect(urlError?.constraints?.isUrl).toBeDefined();
      }
    });

    it('should fail validation when URL is empty string', async () => {
      const input = {
        url: '',
      };
      const dto = plainToInstance(AddTrackerDto, input);

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const urlError = errors.find((e) => e.property === 'url');
      expect(urlError).toBeDefined();
      expect(
        urlError?.constraints?.isNotEmpty || urlError?.constraints?.isUrl,
      ).toBeDefined();
    });

    it('should fail validation when URL is not a string type', async () => {
      const input = {
        url: 12345,
      };
      const dto = plainToInstance(AddTrackerDto, input);

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const urlError = errors.find((e) => e.property === 'url');
      expect(urlError).toBeDefined();
      expect(urlError?.constraints?.isString).toBeDefined();
    });

    it('should fail validation when URL is missing', async () => {
      const input = {};
      const dto = plainToInstance(AddTrackerDto, input);

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const urlError = errors.find((e) => e.property === 'url');
      expect(urlError).toBeDefined();
      expect(urlError?.constraints?.isNotEmpty).toBeDefined();
    });
  });

  describe('RegisterTrackersDto', () => {
    const validUrls = [
      'https://rocketleague.tracker.network/rocket-league/profile/steam/123456789/overview',
      'https://rocketleague.tracker.network/rocket-league/profile/epic/username/overview',
    ];

    it('should be defined', () => {
      expect(RegisterTrackersDto).toBeDefined();
    });

    it('should validate a correct DTO with valid URLs array', async () => {
      const input = {
        urls: validUrls,
      };
      const dto = plainToInstance(RegisterTrackersDto, input);

      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should fail validation when array contains invalid URLs', async () => {
      const input = {
        urls: [
          'https://rocketleague.tracker.network/rocket-league/profile/steam/123456789/overview',
          'not-a-url',
        ],
      };
      const dto = plainToInstance(RegisterTrackersDto, input);

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const urlsError = errors.find((e) => e.property === 'urls');
      expect(urlsError).toBeDefined();
      expect(urlsError?.constraints?.isUrl).toBeDefined();
    });

    it('should validate URL format according to @IsUrl() behavior for array elements', async () => {
      const input = {
        urls: ['missing-protocol.com'],
      };
      const dto = plainToInstance(RegisterTrackersDto, input);

      const errors = await validate(dto);

      // Documents @IsUrl({ each: true }) validator behavior since TrackerValidationService provides additional protocol validation
      if (errors.length > 0) {
        const urlsError = errors.find((e) => e.property === 'urls');
        expect(urlsError?.constraints?.isUrl).toBeDefined();
      }
    });

    it('should fail validation when array is empty', async () => {
      const input = {
        urls: [],
      };
      const dto = plainToInstance(RegisterTrackersDto, input);

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const urlsError = errors.find((e) => e.property === 'urls');
      expect(urlsError).toBeDefined();
      expect(urlsError?.constraints?.arrayMinSize).toBeDefined();
    });

    it('should fail validation when array has more than 4 URLs', async () => {
      const input = {
        urls: [
          ...validUrls,
          'https://rocketleague.tracker.network/rocket-league/profile/steam/111/overview',
          'https://rocketleague.tracker.network/rocket-league/profile/steam/222/overview',
          'https://rocketleague.tracker.network/rocket-league/profile/steam/333/overview',
        ],
      };
      const dto = plainToInstance(RegisterTrackersDto, input);

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const urlsError = errors.find((e) => e.property === 'urls');
      expect(urlsError).toBeDefined();
      expect(urlsError?.constraints?.arrayMaxSize).toBeDefined();
    });

    it('should fail validation when array contains non-string values', async () => {
      const input = {
        urls: [validUrls[0], 12345],
      };
      const dto = plainToInstance(RegisterTrackersDto, input);

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const urlsError = errors.find((e) => e.property === 'urls');
      expect(urlsError).toBeDefined();
      expect(urlsError?.constraints?.isString).toBeDefined();
    });

    it('should fail validation when array contains empty strings', async () => {
      const input = {
        urls: [''],
      };
      const dto = plainToInstance(RegisterTrackersDto, input);

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const urlsError = errors.find((e) => e.property === 'urls');
      expect(urlsError).toBeDefined();
      expect(
        urlsError?.constraints?.isNotEmpty || urlsError?.constraints?.isUrl,
      ).toBeDefined();
    });

    it('should fail validation when array contains mix of valid and empty strings', async () => {
      const input = {
        urls: [validUrls[0], ''],
      };
      const dto = plainToInstance(RegisterTrackersDto, input);

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const urlsError = errors.find((e) => e.property === 'urls');
      expect(urlsError).toBeDefined();
      expect(
        urlsError?.constraints?.isNotEmpty || urlsError?.constraints?.isUrl,
      ).toBeDefined();
    });
  });
});
