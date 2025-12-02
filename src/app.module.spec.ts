import { Test, TestingModule } from '@nestjs/testing';
import { APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { AppModule, VALIDATION_FAILED_MESSAGE } from './app.module';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateMatchParticipantDto } from './matches/dto/create-match-participant.dto';

// Type-safe helper to access ValidationPipe internal options for testing since the options property is not publicly exposed
function getValidationPipeOptions(pipe: ValidationPipe): {
  whitelist?: boolean;
  forbidNonWhitelisted?: boolean;
  transform?: boolean;
  transformOptions?: { enableImplicitConversion?: boolean };
  exceptionFactory?: (errors: any[]) => any;
  stopAtFirstError?: boolean;
  skipMissingProperties?: boolean;
  skipNullProperties?: boolean;
  skipUndefinedProperties?: boolean;
  disableErrorMessages?: boolean;
} {
  return (pipe as any).options;
}

describe('AppModule', () => {
  describe('ValidationPipe configuration', () => {
    it('should create ValidationPipe with whitelist enabled', async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue('development'),
      };

      const module = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(ConfigService)
        .useValue(mockConfigService)
        .compile();

      const pipe = module.get<ValidationPipe>(APP_PIPE);
      const pipeOptions = getValidationPipeOptions(pipe);

      expect(pipeOptions.whitelist).toBe(true);
      await module.close();
    });

    it('should create ValidationPipe with forbidNonWhitelisted enabled', async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue('development'),
      };

      const module = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(ConfigService)
        .useValue(mockConfigService)
        .compile();

      const pipe = module.get<ValidationPipe>(APP_PIPE);
      const pipeOptions = getValidationPipeOptions(pipe);

      expect(pipeOptions.forbidNonWhitelisted).toBe(true);
      await module.close();
    });

    it('should create ValidationPipe with transform enabled', async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue('development'),
      };

      const module = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(ConfigService)
        .useValue(mockConfigService)
        .compile();

      const pipe = module.get<ValidationPipe>(APP_PIPE);
      const pipeOptions = getValidationPipeOptions(pipe);

      expect(pipeOptions.transform).toBe(true);
      await module.close();
    });

    it('should disable error messages in production environment', async () => {
      const productionConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'app.nodeEnv') return 'production';
          return undefined;
        }),
      };

      const module = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(ConfigService)
        .useValue(productionConfigService)
        .compile();

      const pipe = module.get<ValidationPipe>(APP_PIPE);
      const pipeOptions = getValidationPipeOptions(pipe);
      expect(pipeOptions.disableErrorMessages).toBe(true);

      await module.close();
    });

    it('should enable error messages in non-production environment', async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue('development'),
      };

      const module = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(ConfigService)
        .useValue(mockConfigService)
        .compile();

      const pipe = module.get<ValidationPipe>(APP_PIPE);
      const pipeOptions = getValidationPipeOptions(pipe);
      expect(pipeOptions.disableErrorMessages).toBe(false);

      await module.close();
    });

    it('should create ValidationPipe with enableImplicitConversion enabled', async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue('development'),
      };

      const module = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(ConfigService)
        .useValue(mockConfigService)
        .compile();

      const pipe = module.get<ValidationPipe>(APP_PIPE);
      const pipeOptions = getValidationPipeOptions(pipe);

      expect(pipeOptions.transformOptions?.enableImplicitConversion).toBe(true);
      await module.close();
    });

    it('should create ValidationPipe with stopAtFirstError enabled', async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue('development'),
      };

      const module = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(ConfigService)
        .useValue(mockConfigService)
        .compile();

      const pipe = module.get<ValidationPipe>(APP_PIPE);
      const pipeOptions = getValidationPipeOptions(pipe);

      expect(pipeOptions.stopAtFirstError).toBe(true);
      await module.close();
    });

    it('should create ValidationPipe with skip properties set to false', async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue('development'),
      };

      const module = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(ConfigService)
        .useValue(mockConfigService)
        .compile();

      const pipe = module.get<ValidationPipe>(APP_PIPE);
      const pipeOptions = getValidationPipeOptions(pipe);

      expect(pipeOptions.skipMissingProperties).toBe(false);
      expect(pipeOptions.skipNullProperties).toBe(false);
      expect(pipeOptions.skipUndefinedProperties).toBe(false);
      await module.close();
    });

    it('should create ValidationPipe with custom exceptionFactory configured', async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue('development'),
      };

      const module = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(ConfigService)
        .useValue(mockConfigService)
        .compile();

      const pipe = module.get<ValidationPipe>(APP_PIPE);
      const pipeOptions = getValidationPipeOptions(pipe);

      expect(typeof pipeOptions.exceptionFactory).toBe('function');
      await module.close();
    });

    describe('exceptionFactory behavior', () => {
      it('should format errors correctly with property, constraints, and value', async () => {
        const mockConfigService = {
          get: jest.fn().mockReturnValue('development'),
        };

        const module = await Test.createTestingModule({
          imports: [AppModule],
        })
          .overrideProvider(ConfigService)
          .useValue(mockConfigService)
          .compile();

        const pipe = module.get<ValidationPipe>(APP_PIPE);
        const pipeOptions = getValidationPipeOptions(pipe);

        const mockErrors = [
          {
            property: 'email',
            constraints: {
              isEmail: 'email must be an email',
            },
            value: 'invalid-email',
          },
          {
            property: 'age',
            constraints: {
              isNumber: 'age must be a number',
            },
            value: 'not-a-number',
          },
        ];

        if (!pipeOptions.exceptionFactory) {
          throw new Error('exceptionFactory is not defined');
        }
        const exception = pipeOptions.exceptionFactory(mockErrors);

        expect(exception).toBeInstanceOf(BadRequestException);
        const response = exception.getResponse();
        expect(response.message).toBe(VALIDATION_FAILED_MESSAGE);
        expect(response.errors).toHaveLength(2);
        expect(response.errors[0]).toEqual({
          property: 'email',
          constraints: {
            isEmail: 'email must be an email',
          },
          value: 'invalid-email',
        });
        expect(response.errors[1]).toEqual({
          property: 'age',
          constraints: {
            isNumber: 'age must be a number',
          },
          value: 'not-a-number',
        });

        await module.close();
      });

      it('should return BadRequestException with expected structure', async () => {
        const mockConfigService = {
          get: jest.fn().mockReturnValue('development'),
        };

        const module = await Test.createTestingModule({
          imports: [AppModule],
        })
          .overrideProvider(ConfigService)
          .useValue(mockConfigService)
          .compile();

        const pipe = module.get<ValidationPipe>(APP_PIPE);
        const pipeOptions = getValidationPipeOptions(pipe);

        const mockErrors = [
          {
            property: 'username',
            constraints: {
              isNotEmpty: 'username should not be empty',
            },
            value: '',
          },
        ];

        if (!pipeOptions.exceptionFactory) {
          throw new Error('exceptionFactory is not defined');
        }
        const exception = pipeOptions.exceptionFactory(mockErrors);

        expect(exception).toBeInstanceOf(BadRequestException);
        expect(exception.getStatus()).toBe(400);
        const response = exception.getResponse();
        expect(response).toHaveProperty('message');
        expect(response).toHaveProperty('errors');
        expect(Array.isArray(response.errors)).toBe(true);

        await module.close();
      });

      it('should format error response with message and errors array', async () => {
        const mockConfigService = {
          get: jest.fn().mockReturnValue('development'),
        };

        const module = await Test.createTestingModule({
          imports: [AppModule],
        })
          .overrideProvider(ConfigService)
          .useValue(mockConfigService)
          .compile();

        const pipe = module.get<ValidationPipe>(APP_PIPE);
        const pipeOptions = getValidationPipeOptions(pipe);

        const mockErrors = [
          {
            property: 'password',
            constraints: {
              minLength:
                'password must be longer than or equal to 8 characters',
            },
            value: 'short',
          },
        ];

        if (!pipeOptions.exceptionFactory) {
          throw new Error('exceptionFactory is not defined');
        }
        const exception = pipeOptions.exceptionFactory(mockErrors);
        const response = exception.getResponse();

        expect(response).toEqual({
          message: VALIDATION_FAILED_MESSAGE,
          errors: [
            {
              property: 'password',
              constraints: {
                minLength:
                  'password must be longer than or equal to 8 characters',
              },
              value: 'short',
            },
          ],
        });

        await module.close();
      });
    });
  });

  describe('Type conversion integration tests', () => {
    let pipe: ValidationPipe;

    beforeAll(async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue('development'),
      };

      const module = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(ConfigService)
        .useValue(mockConfigService)
        .compile();

      pipe = module.get<ValidationPipe>(APP_PIPE);
      await module.close();
    });

    it('should automatically convert string numbers to numbers', async () => {
      const input = {
        playerId: 'player123',
        isWinner: 'true',
        score: '100',
        goals: '5',
        assists: '3',
        saves: '2',
        shots: '10',
      };

      const dto = plainToInstance(CreateMatchParticipantDto, input, {
        enableImplicitConversion: true,
      });
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
      expect(typeof dto.score).toBe('number');
      expect(dto.score).toBe(100);
      expect(typeof dto.goals).toBe('number');
      expect(dto.goals).toBe(5);
      expect(typeof dto.assists).toBe('number');
      expect(dto.assists).toBe(3);
      expect(typeof dto.saves).toBe('number');
      expect(dto.saves).toBe(2);
      expect(typeof dto.shots).toBe('number');
      expect(dto.shots).toBe(10);
    });

    it('should automatically convert string booleans to booleans', async () => {
      const input = {
        playerId: 'player123',
        isWinner: 'true',
        wasSubstitute: 'false',
      };

      const dto = plainToInstance(CreateMatchParticipantDto, input, {
        enableImplicitConversion: true,
      });
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
      expect(typeof dto.isWinner).toBe('boolean');
      expect(dto.isWinner).toBe(true);
      expect(typeof dto.wasSubstitute).toBe('boolean');
      expect(dto.wasSubstitute).toBe(false);
    });

    it('should convert both numbers and booleans in the same DTO', async () => {
      const input = {
        playerId: 'player123',
        isWinner: 'true',
        wasSubstitute: 'false',
        score: '150',
        goals: '7',
        assists: '4',
      };

      const dto = plainToInstance(CreateMatchParticipantDto, input, {
        enableImplicitConversion: true,
      });
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
      expect(typeof dto.isWinner).toBe('boolean');
      expect(dto.isWinner).toBe(true);
      expect(typeof dto.wasSubstitute).toBe('boolean');
      expect(dto.wasSubstitute).toBe(false);
      expect(typeof dto.score).toBe('number');
      expect(dto.score).toBe(150);
      expect(typeof dto.goals).toBe('number');
      expect(dto.goals).toBe(7);
      expect(typeof dto.assists).toBe('number');
      expect(dto.assists).toBe(4);
    });
  });
});
