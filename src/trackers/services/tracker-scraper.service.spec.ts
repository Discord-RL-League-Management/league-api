import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { TrackerScraperService } from './tracker-scraper.service';
import { TrackerUrlConverterService } from './tracker-url-converter.service';
import { TrackerSegment } from '../interfaces/scraper.interfaces';
import { PlaylistData } from '../interfaces/scraper.interfaces';

// Mock dependencies
const mockHttpService = {
  get: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, any> = {
      zyte: {
        apiKey: 'test-api-key',
        proxyHost: 'proxy.test.com',
        proxyPort: 8000,
        timeoutMs: 30000,
        retryAttempts: 3,
        retryDelayMs: 1000,
        rateLimitPerMinute: 60,
      },
    };
    return config[key];
  }),
};

const mockUrlConverter = {
  convertTrnUrlToApiUrl: jest.fn(),
  isValidTrnUrl: jest.fn(),
};

describe('TrackerScraperService', () => {
  let service: TrackerScraperService;

  beforeEach(async () => {
    // ARRANGE: Setup the testing module
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackerScraperService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: TrackerUrlConverterService,
          useValue: mockUrlConverter,
        },
      ],
    }).compile();

    service = module.get<TrackerScraperService>(TrackerScraperService);
  });

  afterEach(() => {
    // Cleanup: Clear all mock usage data
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractPlaylistData', () => {
    it('should return PlaylistData when segment has valid stats structure', () => {
      // ARRANGE
      const segment: TrackerSegment = {
        type: 'playlist',
        attributes: {
          playlistId: 1,
          season: 10,
        },
        metadata: {
          name: 'Ranked Duel 1v1',
        },
        stats: {
          tier: {
            value: 15,
            displayValue: '15',
            metadata: {
              name: 'Champion',
            },
          },
          division: {
            value: 3,
            displayValue: 'III',
            metadata: {
              name: 'Division III',
            },
          },
          rating: {
            value: 1250,
            displayValue: '1250',
          },
          matchesPlayed: {
            value: 150,
            displayValue: '150',
          },
          winStreak: {
            value: 5,
            displayValue: '5',
          },
        },
        expiryDate: '2024-12-31T23:59:59Z',
      };
      const expected: PlaylistData = {
        rank: 'Champion',
        rankValue: 15,
        division: 'Division III',
        divisionValue: 3,
        rating: 1250,
        matchesPlayed: 150,
        winStreak: 5,
      };

      // ACT
      const result = (service as any).extractPlaylistData(segment);

      // ASSERT
      expect(result).toEqual(expected);
    });

    it('should return PlaylistData with null values when stat fields are missing', () => {
      // ARRANGE
      const segment: TrackerSegment = {
        type: 'playlist',
        attributes: {
          playlistId: 2,
        },
        metadata: {
          name: 'Ranked Doubles 2v2',
        },
        stats: {},
        expiryDate: '2024-12-31T23:59:59Z',
      };
      const expected: PlaylistData = {
        rank: null,
        rankValue: null,
        division: null,
        divisionValue: null,
        rating: null,
        matchesPlayed: null,
        winStreak: null,
      };

      // ACT
      const result = (service as any).extractPlaylistData(segment);

      // ASSERT
      expect(result).toEqual(expected);
    });

    it('should return PlaylistData with null values when stat fields are null', () => {
      // ARRANGE
      const segment: TrackerSegment = {
        type: 'playlist',
        attributes: {
          playlistId: 3,
        },
        metadata: {
          name: 'Ranked Standard 3v3',
        },
        stats: {
          tier: null,
          division: null,
          rating: null,
          matchesPlayed: null,
          winStreak: null,
        },
        expiryDate: '2024-12-31T23:59:59Z',
      };
      const expected: PlaylistData = {
        rank: null,
        rankValue: null,
        division: null,
        divisionValue: null,
        rating: null,
        matchesPlayed: null,
        winStreak: null,
      };

      // ACT
      const result = (service as any).extractPlaylistData(segment);

      // ASSERT
      expect(result).toEqual(expected);
    });

    it('should return PlaylistData when metadata.name is missing', () => {
      // ARRANGE
      const segment: TrackerSegment = {
        type: 'playlist',
        attributes: {
          playlistId: 1,
        },
        metadata: {
          name: 'Ranked Duel 1v1',
        },
        stats: {
          tier: {
            value: 10,
            displayValue: '10',
            metadata: {},
          },
          division: {
            value: 2,
            displayValue: 'II',
          },
          rating: {
            value: 1000,
            displayValue: '1000',
          },
          matchesPlayed: {
            value: 50,
            displayValue: '50',
          },
          winStreak: {
            value: 0,
            displayValue: '0',
          },
        },
        expiryDate: '2024-12-31T23:59:59Z',
      };
      const expected: PlaylistData = {
        rank: null,
        rankValue: 10,
        division: null,
        divisionValue: 2,
        rating: 1000,
        matchesPlayed: 50,
        winStreak: 0,
      };

      // ACT
      const result = (service as any).extractPlaylistData(segment);

      // ASSERT
      expect(result).toEqual(expected);
    });

    it('should return null and log warning when stat value is not a number or null', () => {
      // ARRANGE
      const segment: TrackerSegment = {
        type: 'playlist',
        attributes: {
          playlistId: 1,
        },
        metadata: {
          name: 'Ranked Duel 1v1',
        },
        stats: {
          tier: {
            value: 'invalid',
            displayValue: 'invalid',
            metadata: {
              name: 'Champion',
            },
          },
          rating: {
            value: 1200,
            displayValue: '1200',
          },
          matchesPlayed: {
            value: 'not-a-number',
            displayValue: '100',
          },
          winStreak: {
            value: 3,
            displayValue: '3',
          },
        },
        expiryDate: '2024-12-31T23:59:59Z',
      };
      const loggerSpy = jest.spyOn((service as any).logger, 'warn');

      // ACT
      const result = (service as any).extractPlaylistData(segment);

      // ASSERT
      expect(result).toBeNull();
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid stats structure'),
      );
    });

    it('should return null and log warning when stats structure is invalid (stats is not an object)', () => {
      // ARRANGE
      const segment: TrackerSegment = {
        type: 'playlist',
        attributes: {
          playlistId: 1,
        },
        metadata: {
          name: 'Ranked Duel 1v1',
        },
        stats: 'invalid' as any,
        expiryDate: '2024-12-31T23:59:59Z',
      };
      const loggerSpy = jest.spyOn((service as any).logger, 'warn');

      // ACT
      const result = (service as any).extractPlaylistData(segment);

      // ASSERT
      expect(result).toBeNull();
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid stats structure'),
      );
    });

    it('should return null and log warning when stat field has invalid structure', () => {
      // ARRANGE
      const segment: TrackerSegment = {
        type: 'playlist',
        attributes: {
          playlistId: 2,
        },
        metadata: {
          name: 'Ranked Doubles 2v2',
        },
        stats: {
          tier: {
            value: { nested: 'object' } as any,
            displayValue: 'invalid',
            metadata: {
              name: 'Champion',
            },
          },
        },
        expiryDate: '2024-12-31T23:59:59Z',
      };
      const loggerSpy = jest.spyOn((service as any).logger, 'warn');

      // ACT
      const result = (service as any).extractPlaylistData(segment);

      // ASSERT
      expect(result).toBeNull();
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid stats structure'),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('playlistId: 2'),
      );
    });

    it('should log segment type and playlistId when validation fails', () => {
      // ARRANGE
      const segment: TrackerSegment = {
        type: 'playlist',
        attributes: {
          playlistId: 3,
        },
        metadata: {
          name: 'Ranked Standard 3v3',
        },
        stats: {
          tier: 'invalid' as any,
        },
        expiryDate: '2024-12-31T23:59:59Z',
      };
      const loggerSpy = jest.spyOn((service as any).logger, 'warn');

      // ACT
      const result = (service as any).extractPlaylistData(segment);

      // ASSERT
      expect(result).toBeNull();
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('type: playlist'),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('playlistId: 3'),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'tracker.gg API response structure has changed',
        ),
      );
    });

    it('should handle segment with missing type attribute', () => {
      // ARRANGE
      const segment: TrackerSegment = {
        type: '',
        attributes: {
          playlistId: 1,
        },
        metadata: {
          name: 'Ranked Duel 1v1',
        },
        stats: {
          tier: 'invalid' as any,
        },
        expiryDate: '2024-12-31T23:59:59Z',
      };
      const loggerSpy = jest.spyOn((service as any).logger, 'warn');

      // ACT
      const result = (service as any).extractPlaylistData(segment);

      // ASSERT
      expect(result).toBeNull();
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('type: '));
    });

    it('should handle segment with missing playlistId', () => {
      // ARRANGE
      const segment: TrackerSegment = {
        type: 'playlist',
        attributes: {},
        metadata: {
          name: 'Ranked Duel 1v1',
        },
        stats: {
          tier: 'invalid' as any,
        },
        expiryDate: '2024-12-31T23:59:59Z',
      };
      const loggerSpy = jest.spyOn((service as any).logger, 'warn');

      // ACT
      const result = (service as any).extractPlaylistData(segment);

      // ASSERT
      expect(result).toBeNull();
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('playlistId: undefined'),
      );
    });

    it('should return null and log error when exception is thrown during extraction', () => {
      // ARRANGE
      const segment: TrackerSegment = {
        type: 'playlist',
        attributes: {
          playlistId: 1,
        },
        metadata: {
          name: 'Ranked Duel 1v1',
        },
        stats: null as any,
        expiryDate: '2024-12-31T23:59:59Z',
      };
      const loggerSpy = jest.spyOn((service as any).logger, 'warn');

      // ACT
      const result = (service as any).extractPlaylistData(segment);

      // ASSERT
      expect(result).toBeNull();
      expect(loggerSpy).toHaveBeenCalled();
    });
  });
});
