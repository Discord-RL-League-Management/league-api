import { Test, TestingModule } from '@nestjs/testing';
import { RequestContextService } from './request-context.service';
import { Request } from 'express';

describe('RequestContextService', () => {
  let service: RequestContextService;

  beforeEach(async () => {
    // ARRANGE: Setup the testing module
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequestContextService],
    }).compile();

    service = module.get<RequestContextService>(RequestContextService);
  });

  afterEach(() => {
    // Cleanup: Clear all mock usage data
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getIpAddress', () => {
    it('should return IP from x-forwarded-for header when present', () => {
      // ARRANGE
      const mockRequest = {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
        ip: '127.0.0.1',
        socket: {
          remoteAddress: '127.0.0.1',
        },
      } as unknown as Request;

      // ACT
      const result = service.getIpAddress(mockRequest);

      // ASSERT
      expect(result).toBe('192.168.1.1');
    });

    it('should return first IP from comma-separated x-forwarded-for header', () => {
      // ARRANGE
      const mockRequest = {
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1, 192.0.2.1',
        },
        ip: '127.0.0.1',
        socket: {
          remoteAddress: '127.0.0.1',
        },
      } as unknown as Request;

      // ACT
      const result = service.getIpAddress(mockRequest);

      // ASSERT
      expect(result).toBe('203.0.113.1');
    });

    it('should trim whitespace from x-forwarded-for IP', () => {
      // ARRANGE
      const mockRequest = {
        headers: {
          'x-forwarded-for': '  192.168.1.1  , 10.0.0.1',
        },
        ip: '127.0.0.1',
        socket: {
          remoteAddress: '127.0.0.1',
        },
      } as unknown as Request;

      // ACT
      const result = service.getIpAddress(mockRequest);

      // ASSERT
      expect(result).toBe('192.168.1.1');
    });

    it('should return request.ip when x-forwarded-for is not present', () => {
      // ARRANGE
      const mockRequest = {
        headers: {},
        ip: '192.168.1.100',
        socket: {
          remoteAddress: '127.0.0.1',
        },
      } as unknown as Request;

      // ACT
      const result = service.getIpAddress(mockRequest);

      // ASSERT
      expect(result).toBe('192.168.1.100');
    });

    it('should return socket.remoteAddress when request.ip is not available', () => {
      // ARRANGE
      const mockRequest = {
        headers: {},
        ip: undefined,
        socket: {
          remoteAddress: '10.0.0.5',
        },
      } as unknown as Request;

      // ACT
      const result = service.getIpAddress(mockRequest);

      // ASSERT
      expect(result).toBe('10.0.0.5');
    });

    it('should return "unknown" when no IP information is available', () => {
      // ARRANGE
      const mockRequest = {
        headers: {},
        ip: undefined,
        socket: {
          remoteAddress: undefined,
        },
      } as unknown as Request;

      // ACT
      const result = service.getIpAddress(mockRequest);

      // ASSERT
      expect(result).toBe('unknown');
    });

    it('should handle x-forwarded-for as array (NestJS/Express can convert to array)', () => {
      // ARRANGE
      const mockRequest = {
        headers: {
          'x-forwarded-for': ['192.168.1.1', '10.0.0.1'],
        },
        ip: '127.0.0.1',
        socket: {
          remoteAddress: '127.0.0.1',
        },
      } as unknown as Request;

      // ACT
      const result = service.getIpAddress(mockRequest);

      // ASSERT
      // Should fall back to request.ip since forwarded is an array, not a string
      expect(result).toBe('127.0.0.1');
    });
  });

  describe('getUserAgent', () => {
    it('should return user-agent header when present', () => {
      // ARRANGE
      const mockRequest = {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      } as unknown as Request;

      // ACT
      const result = service.getUserAgent(mockRequest);

      // ASSERT
      expect(result).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    });

    it('should return "unknown" when user-agent header is not present', () => {
      // ARRANGE
      const mockRequest = {
        headers: {},
      } as unknown as Request;

      // ACT
      const result = service.getUserAgent(mockRequest);

      // ASSERT
      expect(result).toBe('unknown');
    });

    it('should return "unknown" when user-agent header is undefined', () => {
      // ARRANGE
      const mockRequest = {
        headers: {
          'user-agent': undefined,
        },
      } as unknown as Request;

      // ACT
      const result = service.getUserAgent(mockRequest);

      // ASSERT
      expect(result).toBe('unknown');
    });

    it('should handle empty string user-agent', () => {
      // ARRANGE
      const mockRequest = {
        headers: {
          'user-agent': '',
        },
      } as unknown as Request;

      // ACT
      const result = service.getUserAgent(mockRequest);

      // ASSERT
      // Empty string is falsy, so should return 'unknown'
      expect(result).toBe('unknown');
    });
  });

  describe('getRequestId', () => {
    it('should return existing requestId when already present', () => {
      // ARRANGE
      const existingRequestId = 'existing-id-123';
      const mockRequest = {
        requestId: existingRequestId,
      } as Request & { requestId?: string };

      // ACT
      const result = service.getRequestId(mockRequest);

      // ASSERT
      expect(result).toBe(existingRequestId);
      expect(mockRequest.requestId).toBe(existingRequestId);
    });

    it('should generate and store new requestId when not present', () => {
      // ARRANGE
      const mockRequest = {} as Request & { requestId?: string };

      // ACT
      const result = service.getRequestId(mockRequest);

      // ASSERT
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(mockRequest.requestId).toBe(result);
    });

    it('should generate unique requestIds for multiple calls', () => {
      // ARRANGE
      const mockRequest1 = {} as Request & { requestId?: string };
      const mockRequest2 = {} as Request & { requestId?: string };

      // ACT
      const result1 = service.getRequestId(mockRequest1);
      const result2 = service.getRequestId(mockRequest2);

      // ASSERT
      expect(result1).not.toBe(result2);
      expect(mockRequest1.requestId).toBe(result1);
      expect(mockRequest2.requestId).toBe(result2);
    });

    it('should generate UUID format requestId', () => {
      // ARRANGE
      const mockRequest = {} as Request & { requestId?: string };
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      // ACT
      const result = service.getRequestId(mockRequest);

      // ASSERT
      expect(result).toMatch(uuidRegex);
    });

    it('should not regenerate requestId on subsequent calls', () => {
      // ARRANGE
      const mockRequest = {} as Request & { requestId?: string };

      // ACT
      const firstResult = service.getRequestId(mockRequest);
      const secondResult = service.getRequestId(mockRequest);
      const thirdResult = service.getRequestId(mockRequest);

      // ASSERT
      expect(firstResult).toBe(secondResult);
      expect(secondResult).toBe(thirdResult);
      expect(mockRequest.requestId).toBe(firstResult);
    });
  });
});
