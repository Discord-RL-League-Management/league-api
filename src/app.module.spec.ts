import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe, APP_PIPE } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

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
      const pipeOptions = (pipe as any).options;

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
      const pipeOptions = (pipe as any).options;

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
      const pipeOptions = (pipe as any).options;

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
      const pipeOptions = (pipe as any).options;
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
      const pipeOptions = (pipe as any).options;
      expect(pipeOptions.disableErrorMessages).toBe(false);

      await module.close();
    });
  });
});

