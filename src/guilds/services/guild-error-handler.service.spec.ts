import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { GuildErrorHandlerService } from './guild-error-handler.service';

describe('GuildErrorHandlerService', () => {
  let service: GuildErrorHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GuildErrorHandlerService],
    }).compile();

    service = module.get<GuildErrorHandlerService>(GuildErrorHandlerService);
  });

  describe('extractErrorInfo', () => {
    it('should extract Prisma known request error', () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
        } as any,
      );
      prismaError.meta = { target: ['id'] };
      prismaError.cause = new Error('Cause');

      const result = service.extractErrorInfo(prismaError, 'guild123');

      expect(result.message).toBe('Unique constraint failed');
      expect(result.code).toBe('PRISMA_P2002');
      expect(result.details).toBeDefined();
      expect(result.details?.prismaCode).toBe('P2002');
      expect(result.details?.meta).toBeDefined();
      expect(result.details?.cause).toBeDefined();
    });

    it('should extract Prisma validation error', () => {
      const prismaError = new Prisma.PrismaClientValidationError(
        'Validation failed',
        {
          cause: new Error('Validation cause'),
        } as any,
      );
      prismaError.cause = new Error('Validation cause');

      const result = service.extractErrorInfo(prismaError, 'guild123');

      expect(result.message).toBe('Validation failed');
      expect(result.code).toBe('PRISMA_VALIDATION_ERROR');
      expect(result.details).toBeDefined();
      expect(result.details?.cause).toBeDefined();
    });

    it('should extract Prisma initialization error', () => {
      const prismaError = new Prisma.PrismaClientInitializationError(
        'Connection failed',
        {
          errorCode: 'P1001',
          clientVersion: '5.0.0',
        } as any,
      );
      prismaError.errorCode = 'P1001';
      prismaError.clientVersion = '5.0.0';

      const result = service.extractErrorInfo(prismaError, 'guild123');

      expect(result.message).toBe('Connection failed');
      expect(result.code).toBe('PRISMA_INITIALIZATION_ERROR');
      expect(result.details).toBeDefined();
      expect(result.details?.errorCode).toBe('P1001');
      expect(result.details?.clientVersion).toBe('5.0.0');
    });

    it('should extract Prisma rust panic error', () => {
      const prismaError = new Prisma.PrismaClientRustPanicError(
        'Rust panic occurred',
        {
          cause: new Error('Panic cause'),
        } as any,
      );
      prismaError.cause = new Error('Panic cause');

      const result = service.extractErrorInfo(prismaError, 'guild123');

      expect(result.message).toBe('Rust panic occurred');
      expect(result.code).toBe('PRISMA_RUST_PANIC_ERROR');
      expect(result.details).toBeDefined();
      expect(result.details?.cause).toBeDefined();
    });

    it('should extract generic Error', () => {
      const genericError = new Error('Generic error message');
      genericError.name = 'Error';
      genericError.stack = 'Error stack trace';

      const result = service.extractErrorInfo(genericError, 'guild123');

      expect(result.message).toBe('Generic error message');
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.details).toBeDefined();
      expect(result.details?.name).toBe('Error');
      expect(result.details?.stack).toBe('Error stack trace');
    });

    it('should extract unknown error types', () => {
      const unknownError = { someProperty: 'value' };

      const result = service.extractErrorInfo(unknownError, 'guild123');

      expect(result.message).toBe('Unknown error occurred during guild operation');
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.details).toBeDefined();
      expect(result.details?.errorType).toBe('object');
      expect(result.details?.contextId).toBe('guild123');
    });
  });
});

