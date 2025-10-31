import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import request from 'supertest';
import { validApiKey } from '../fixtures/users.fixture';
import { JwtService } from '@nestjs/jwt';

/**
 * Test Helpers - Reusable test utilities to reduce boilerplate
 *
 * Provides common test operations and reduces duplication across test files
 */
export class TestHelpers {
  constructor(
    private app: INestApplication,
    private prisma: PrismaService,
    private jwtService?: JwtService,
  ) {}

  /**
   * Create a user in the test database
   */
  async createUser(userData: any) {
    return this.prisma.user.create({ data: userData });
  }

  /**
   * Clean up all users from the test database
   */
  async cleanupUsers() {
    await this.prisma.user.deleteMany();
  }

  /**
   * Get authentication headers for bot requests
   */
  getBotAuthHeaders(apiKey: string = validApiKey) {
    return { Authorization: `Bearer ${apiKey}` };
  }

  /**
   * Generate JWT token for a user
   */
  generateJwtToken(userId: string, username: string): string {
    if (!this.jwtService) {
      throw new Error('JwtService not provided to TestHelpers');
    }
    return this.jwtService.sign({ sub: userId, username });
  }

  /**
   * Get authentication headers for user requests
   */
  getUserAuthHeaders(jwtToken: string) {
    return { Authorization: `Bearer ${jwtToken}` };
  }

  /**
   * Make an authenticated bot request
   */
  async makeBotRequest(method: string, url: string, data?: any) {
    const headers = this.getBotAuthHeaders();
    const req = request(this.app.getHttpServer());

    switch (method.toLowerCase()) {
      case 'get':
        return req.get(url).set(headers).send(data);
      case 'post':
        return req.post(url).set(headers).send(data);
      case 'put':
        return req.put(url).set(headers).send(data);
      case 'patch':
        return req.patch(url).set(headers).send(data);
      case 'delete':
        return req.delete(url).set(headers).send(data);
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }

  /**
   * Make an authenticated user request
   */
  async makeUserRequest(
    method: string,
    url: string,
    jwtToken: string,
    data?: any,
  ) {
    const headers = this.getUserAuthHeaders(jwtToken);
    const req = request(this.app.getHttpServer());

    switch (method.toLowerCase()) {
      case 'get':
        return req.get(url).set(headers).send(data);
      case 'post':
        return req.post(url).set(headers).send(data);
      case 'put':
        return req.put(url).set(headers).send(data);
      case 'patch':
        return req.patch(url).set(headers).send(data);
      case 'delete':
        return req.delete(url).set(headers).send(data);
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }

  /**
   * Make an unauthenticated request
   */
  async makeUnauthenticatedRequest(method: string, url: string, data?: any) {
    const req = request(this.app.getHttpServer());

    switch (method.toLowerCase()) {
      case 'get':
        return req.get(url).send(data);
      case 'post':
        return req.post(url).send(data);
      case 'put':
        return req.put(url).send(data);
      case 'patch':
        return req.patch(url).send(data);
      case 'delete':
        return req.delete(url).send(data);
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }

  /**
   * Create a testing module with mocked PrismaService
   */
  static async createTestingModule(providers: any[], controllers: any[] = []) {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers,
      providers: [
        ...providers,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    return { module, mockPrismaService };
  }

  /**
   * Mock PrismaService for unit tests
   */
  static createMockPrismaService() {
    return {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
  }

  /**
   * Mock Request object for middleware testing
   */
  static createMockRequest(overrides: Partial<any> = {}) {
    return {
      method: 'GET',
      path: '/test',
      url: '/test',
      headers: {},
      ...overrides,
    };
  }

  /**
   * Mock Response object for middleware testing
   */
  static createMockResponse() {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  }

  /**
   * Mock NextFunction for middleware testing
   */
  static createMockNextFunction() {
    return jest.fn();
  }

  /**
   * Wait for a specified amount of time (useful for testing timeouts)
   */
  static async wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate a random Discord snowflake ID
   */
  static generateDiscordId(): string {
    return Math.floor(
      Math.random() * 900000000000000000 + 100000000000000000,
    ).toString();
  }

  /**
   * Generate a random username
   */
  static generateUsername(): string {
    return `testuser${Math.floor(Math.random() * 10000)}`;
  }

  /**
   * Generate a random email
   */
  static generateEmail(): string {
    return `test${Math.floor(Math.random() * 10000)}@example.com`;
  }
}
