import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { throttlerConfig } from './throttler.config';

describe('ThrottlerConfig', () => {
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
  });

  describe('throttlerConfig', () => {
    it('should return throttler configuration with default values', () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        const values: Record<string, unknown> = {
          'throttler.ttl': 60000,
          'throttler.limit': 100,
        };
        return values[key];
      });

      const result = throttlerConfig(configService);

      expect(result).toEqual({
        throttlers: [
          {
            ttl: 60000,
            limit: 100,
          },
        ],
      });
    });

    it('should return throttler configuration with custom values', () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        const values: Record<string, unknown> = {
          'throttler.ttl': 30000,
          'throttler.limit': 50,
        };
        return values[key];
      });

      const result = throttlerConfig(configService);

      expect(result).toEqual({
        throttlers: [
          {
            ttl: 30000,
            limit: 50,
          },
        ],
      });
    });

    it('should handle undefined values by using defaults', () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        const values: Record<string, unknown> = {
          'throttler.ttl': undefined,
          'throttler.limit': undefined,
        };
        return values[key];
      });

      const result = throttlerConfig(configService);

      expect(result).toEqual({
        throttlers: [
          {
            ttl: 60000,
            limit: 100,
          },
        ],
      });
    });

    it('should call configService.get with correct keys', () => {
      (configService.get as jest.Mock).mockReturnValue(60000);

      throttlerConfig(configService);

      expect(configService.get).toHaveBeenCalledWith('throttler.ttl');
      expect(configService.get).toHaveBeenCalledWith('throttler.limit');
    });
  });
});
