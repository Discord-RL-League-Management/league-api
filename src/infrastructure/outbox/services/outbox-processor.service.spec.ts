import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OutboxProcessorService } from './outbox-processor.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { OutboxService } from './outbox.service';
import { OutboxEventDispatcher } from './outbox-event-dispatcher.service';

describe('OutboxProcessorService', () => {
  let service: OutboxProcessorService;
  let mockPrismaService: jest.Mocked<PrismaService>;
  let mockOutboxService: jest.Mocked<OutboxService>;
  let mockEventDispatcher: jest.Mocked<OutboxEventDispatcher>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockPrismaService = {} as any;
    mockOutboxService = {
      findPendingEvents: jest.fn().mockResolvedValue([]),
      updateStatus: jest.fn(),
    } as any;
    mockEventDispatcher = {
      dispatchEvent: jest.fn(),
    } as any;
    mockConfigService = {
      get: jest.fn().mockReturnValue(5000),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxProcessorService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: OutboxService,
          useValue: mockOutboxService,
        },
        {
          provide: OutboxEventDispatcher,
          useValue: mockEventDispatcher,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OutboxProcessorService>(OutboxProcessorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should start polling', () => {
      jest.useFakeTimers();
      const logSpy = jest.spyOn(service['logger'], 'log');
      service.onModuleInit();
      expect(logSpy).toHaveBeenCalledWith(
        'Starting outbox processor with interval 5000ms',
      );
      expect(service['pollInterval']).not.toBeNull();
      jest.useRealTimers();
    });
  });

  describe('onModuleDestroy', () => {
    it('should stop polling', () => {
      jest.useFakeTimers();
      service.onModuleInit();
      const intervalId = service['pollInterval'];
      service.onModuleDestroy();
      expect(service['pollInterval']).toBeNull();
      jest.useRealTimers();
    });
  });

  describe('onApplicationShutdown', () => {
    it('should stop polling on shutdown', async () => {
      jest.useFakeTimers();
      service.onModuleInit();
      const intervalId = service['pollInterval'];
      await service.onApplicationShutdown('SIGTERM');
      expect(service['pollInterval']).toBeNull();
      jest.useRealTimers();
    });

    it('should log shutdown signal', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log');
      await service.onApplicationShutdown('SIGTERM');
      expect(logSpy).toHaveBeenCalledWith('Application shutting down: SIGTERM');
    });

    it('should handle unknown signal', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log');
      await service.onApplicationShutdown();
      expect(logSpy).toHaveBeenCalledWith(
        'Application shutting down: unknown signal',
      );
    });

    it('should log successful shutdown', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log');
      await service.onApplicationShutdown('SIGINT');
      expect(logSpy).toHaveBeenCalledWith('✅ Outbox processor stopped');
    });

    it('should wait for in-flight processing to complete', async () => {
      jest.useFakeTimers();
      // Set isProcessing to true to simulate in-flight processing
      service['isProcessing'] = true;

      const shutdownPromise = service.onApplicationShutdown('SIGTERM');

      // Fast-forward time to allow the while loop to check
      jest.advanceTimersByTime(100);

      // Set isProcessing to false to allow shutdown to complete
      service['isProcessing'] = false;

      // Fast-forward time again to allow the loop to exit
      jest.advanceTimersByTime(100);

      await shutdownPromise;

      expect(service['isProcessing']).toBe(false);
      jest.useRealTimers();
    });

    it('should handle case when not processing', async () => {
      jest.useFakeTimers();
      service['isProcessing'] = false;
      const shutdownPromise = service.onApplicationShutdown('SIGTERM');
      jest.advanceTimersByTime(100);
      await shutdownPromise;
      expect(service['isProcessing']).toBe(false);
      jest.useRealTimers();
    });

    it('should timeout and force stop if processing takes too long', async () => {
      jest.useFakeTimers();
      service['isProcessing'] = true;
      const logSpy = jest.spyOn(service['logger'], 'warn');
      const shutdownPromise = service.onApplicationShutdown('SIGTERM');

      // Fast-forward past the 5 second timeout
      jest.advanceTimersByTime(5100);

      await shutdownPromise;

      expect(service['isProcessing']).toBe(false);
      expect(logSpy).toHaveBeenCalledWith(
        'Shutdown timeout reached, forcing stop of outbox processor',
      );
      jest.useRealTimers();
    });

    it('should still work with onModuleDestroy', async () => {
      jest.useFakeTimers();
      service.onModuleInit();
      service.onModuleDestroy();
      await service.onApplicationShutdown('SIGTERM');
      expect(service['pollInterval']).toBeNull();
      jest.useRealTimers();
    });
  });
});
