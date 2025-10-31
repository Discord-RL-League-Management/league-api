import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AuthLoggerMiddleware } from './auth-logger.middleware';
// Mock TestHelpers locally for unit tests
const TestHelpers = {
  createMockRequest: (overrides: Partial<any> = {}) => ({
    method: 'GET',
    path: '/test',
    url: '/test',
    headers: {},
    ...overrides,
  }),
  createMockResponse: () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  }),
  createMockNextFunction: () => jest.fn(),
};

describe('AuthLoggerMiddleware', () => {
  let middleware: AuthLoggerMiddleware;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthLoggerMiddleware],
    }).compile();

    middleware = module.get<AuthLoggerMiddleware>(AuthLoggerMiddleware);

    // Mock the logger
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('use', () => {
    it('should log bot request when API key matches', () => {
      // Arrange
      const mockRequest = TestHelpers.createMockRequest({
        headers: { authorization: `Bearer ${process.env.BOT_API_KEY}` },
        method: 'POST',
        path: '/internal/users',
      });
      const mockResponse = TestHelpers.createMockResponse();
      const mockNext = TestHelpers.createMockNextFunction();

      // Act
      middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        'Bot request: POST /internal/users',
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log user request when JWT token is provided', () => {
      // Arrange
      const mockRequest = TestHelpers.createMockRequest({
        headers: { authorization: 'Bearer jwt-token-here' },
        method: 'GET',
        path: '/api/profile',
      });
      const mockResponse = TestHelpers.createMockResponse();
      const mockNext = TestHelpers.createMockNextFunction();

      // Act
      middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('User request: GET /api/profile');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log unauthenticated request when no authorization header', () => {
      // Arrange
      const mockRequest = TestHelpers.createMockRequest({
        headers: {},
        method: 'GET',
        path: '/health',
      });
      const mockResponse = TestHelpers.createMockResponse();
      const mockNext = TestHelpers.createMockNextFunction();

      // Act
      middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        'Unauthenticated request: GET /health',
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log unauthenticated request when authorization header is empty', () => {
      // Arrange
      const mockRequest = TestHelpers.createMockRequest({
        headers: { authorization: '' },
        method: 'GET',
        path: '/health',
      });
      const mockResponse = TestHelpers.createMockResponse();
      const mockNext = TestHelpers.createMockNextFunction();

      // Act
      middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        'Unauthenticated request: GET /health',
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle different HTTP methods correctly', () => {
      // Arrange
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
      const mockResponse = TestHelpers.createMockResponse();
      const mockNext = TestHelpers.createMockNextFunction();

      methods.forEach((method) => {
        const mockRequest = TestHelpers.createMockRequest({
          headers: { authorization: 'Bearer jwt-token' },
          method,
          path: '/api/test',
        });

        // Act
        middleware.use(mockRequest, mockResponse, mockNext);

        // Assert
        expect(loggerSpy).toHaveBeenCalledWith(
          `User request: ${method} /api/test`,
        );
      });

      expect(mockNext).toHaveBeenCalledTimes(methods.length);
    });

    it('should handle different paths correctly', () => {
      // Arrange
      const paths = [
        '/api/profile',
        '/internal/users',
        '/auth/discord',
        '/health',
      ];
      const mockResponse = TestHelpers.createMockResponse();
      const mockNext = TestHelpers.createMockNextFunction();

      paths.forEach((path) => {
        const mockRequest = TestHelpers.createMockRequest({
          headers: { authorization: 'Bearer jwt-token' },
          method: 'GET',
          path,
        });

        // Act
        middleware.use(mockRequest, mockResponse, mockNext);

        // Assert
        expect(loggerSpy).toHaveBeenCalledWith(`User request: GET ${path}`);
      });

      expect(mockNext).toHaveBeenCalledTimes(paths.length);
    });
  });
});
