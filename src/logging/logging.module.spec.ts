import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LoggingModule } from './logging.module';
import { pinoConfig } from './pino.config';

describe('LoggingModule', () => {
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

  describe('pinoConfig', () => {
    it('should return development configuration when NODE_ENV is development', () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        const values: Record<string, any> = {
          'app.nodeEnv': 'development',
          'logging.level': 'debug',
          'logging.fileEnabled': true,
          'logging.filePath': 'logs',
        };
        return values[key];
      });

      const result = pinoConfig(configService);

      expect(result).toEqual({
        pinoHttp: {
          level: 'debug',
          formatters: {
            level: expect.any(Function),
          },
          timestamp: expect.any(Function),
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: false,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          },
        },
      });
    });

    it('should return production configuration when NODE_ENV is production', () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        const values: Record<string, any> = {
          'app.nodeEnv': 'production',
          'logging.level': 'info',
          'logging.fileEnabled': true,
          'logging.filePath': 'logs',
        };
        return values[key];
      });

      const result = pinoConfig(configService);

      expect(result).toEqual({
        pinoHttp: {
          level: 'info',
          formatters: {
            level: expect.any(Function),
          },
          timestamp: expect.any(Function),
          transport: {
            target: 'pino/file',
            options: {
              destination: 'logs/combined.log',
              mkdir: true,
            },
          },
        },
      });
    });

    it('should return production configuration without file transport when fileEnabled is false', () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        const values: Record<string, any> = {
          'app.nodeEnv': 'production',
          'logging.level': 'warn',
          'logging.fileEnabled': false,
          'logging.filePath': 'logs',
        };
        return values[key];
      });

      const result = pinoConfig(configService);

      expect(result).toEqual({
        pinoHttp: {
          level: 'warn',
          formatters: {
            level: expect.any(Function),
          },
          timestamp: expect.any(Function),
          transport: undefined,
        },
      });
    });

    it('should use custom file path when provided', () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        const values: Record<string, any> = {
          'app.nodeEnv': 'production',
          'logging.level': 'error',
          'logging.fileEnabled': true,
          'logging.filePath': 'custom-logs',
        };
        return values[key];
      });

      const result = pinoConfig(configService);

      expect(result.pinoHttp?.transport).toEqual({
        target: 'pino/file',
        options: {
          destination: 'custom-logs/combined.log',
          mkdir: true,
        },
      });
    });

    it('should call configService.get with correct keys', () => {
      (configService.get as jest.Mock).mockReturnValue('development');

      pinoConfig(configService);

      expect(configService.get).toHaveBeenCalledWith('app.nodeEnv');
      expect(configService.get).toHaveBeenCalledWith('logging.level');
      expect(configService.get).toHaveBeenCalledWith('logging.fileEnabled');
      expect(configService.get).toHaveBeenCalledWith('logging.filePath');
    });
  });

  describe('LoggingModule', () => {
    it('should be defined', () => {
      expect(LoggingModule).toBeDefined();
    });

    it('should have correct imports', () => {
      const moduleMetadata = Reflect.getMetadata('imports', LoggingModule);
      expect(moduleMetadata).toBeDefined();
      expect(moduleMetadata).toHaveLength(2);
    });
  });
});
