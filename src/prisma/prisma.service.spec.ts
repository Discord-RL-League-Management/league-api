import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);

    // Mock the PrismaClient methods
    service.$connect = jest.fn().mockResolvedValue(undefined);
    service.$disconnect = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to database', async () => {
      await service.onModuleInit();
      expect(service.$connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from database', async () => {
      await service.onModuleDestroy();
      expect(service.$disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('onApplicationShutdown', () => {
    it('should disconnect from database on shutdown', async () => {
      await service.onApplicationShutdown('SIGTERM');
      expect(service.$disconnect).toHaveBeenCalledTimes(1);
    });

    it('should log shutdown signal', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log');
      await service.onApplicationShutdown('SIGTERM');
      expect(logSpy).toHaveBeenCalledWith(
        'Application shutting down: SIGTERM',
      );
    });

    it('should handle unknown signal', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log');
      await service.onApplicationShutdown();
      expect(logSpy).toHaveBeenCalledWith(
        'Application shutting down: unknown signal',
      );
    });

    it('should log successful disconnection', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log');
      await service.onApplicationShutdown('SIGINT');
      expect(logSpy).toHaveBeenCalledWith(
        '✅ Database disconnected on shutdown',
      );
    });

    it('should still work with onModuleDestroy', async () => {
      await service.onModuleDestroy();
      await service.onApplicationShutdown('SIGTERM');
      expect(service.$disconnect).toHaveBeenCalledTimes(2);
    });
  });
});

