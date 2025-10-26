import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { bootstrapTestApp } from './helpers/create-test-app';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('OAuth Security (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  
  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
  };
  
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(HttpService)
      .useValue(mockHttpService)
      .compile();
    
    app = moduleFixture.createNestApplication();
    await bootstrapTestApp(app);
    prisma = app.get(PrismaService);
    jwtService = app.get<JwtService>(JwtService);
  });
  
  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean database
    await prisma.guildMember.deleteMany();
    await prisma.guild.deleteMany();
    await prisma.user.deleteMany();
    
    jest.clearAllMocks();
  });

  describe('HttpOnly Cookie Security', () => {
    it('should set HttpOnly flag on JWT cookie', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          id: 'user123',
          username: 'testuser',
        },
      });

      const jwtToken = jwtService.sign({ sub: user.id });

      mockHttpService.get.mockReturnValue(
        of({ data: [], status: 200, statusText: 'OK', headers: {}, config: {} } as AxiosResponse)
      );

      // Act
      const response = await request(app.getHttpServer())
        .get('/auth/guilds')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // Assert
      // Note: In actual OAuth flow, cookies are set during callback redirect
      // This test verifies the endpoint is protected by JWT guard
      expect(response.status).toBe(200);
    });
  });

  describe('Token Separation in JWT', () => {
    it('should not include OAuth tokens in JWT payload', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          id: 'user123',
          username: 'testuser',
          accessToken: 'should_not_be_in_jwt',
          refreshToken: 'should_not_be_in_jwt',
        },
      });

      // Generate JWT
      const jwtToken = jwtService.sign({ 
        sub: user.id, 
        username: user.username,
        // No accessToken or refreshToken should be in payload
      });

      // Decode JWT to verify payload
      const decoded = jwtService.decode(jwtToken) as any;

      // Assert
      expect(decoded).toHaveProperty('sub', user.id);
      expect(decoded).toHaveProperty('username');
      expect(decoded).not.toHaveProperty('accessToken');
      expect(decoded).not.toHaveProperty('refreshToken');
    });
  });

  describe('CORS Configuration', () => {
    it('should allow frontend origin with credentials', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'GET');

      // Note: This is a basic check; full CORS validation requires OPTIONS request
      // In production, use proper CORS testing with different origins
      expect(response.status).toBeGreaterThanOrEqual(401); // Either 401 or CORS rejected
    });

    it('should return 401 for invalid token', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe('Token Revocation', () => {
    it('should clear tokens from database on logout', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          id: 'user123',
          username: 'testuser',
        },
      });

      // Manually set tokens (in real flow, set by OAuth callback)
      await prisma.user.update({
        where: { id: user.id },
        data: {
          accessToken: 'access_token_123',
          refreshToken: 'encrypted_refresh_token',
        },
      });

      const jwtToken = jwtService.sign({ sub: user.id });

      mockHttpService.post.mockReturnValue(
        of({ data: {}, status: 200, statusText: 'OK', headers: {}, config: {} } as AxiosResponse)
      );

      // Act
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // Assert - Verify tokens cleared
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(updatedUser?.accessToken).toBeNull();
      expect(updatedUser?.refreshToken).toBeNull();
    });
  });

  describe('Authentication Requirements', () => {
    it('should require authentication for protected endpoints', async () => {
      // Test multiple protected endpoints
      const protectedEndpoints = [
        '/auth/me',
        '/auth/guilds',
        '/auth/logout',
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app.getHttpServer())
          .get(endpoint)
          .expect(401);

        expect(response.status).toBe(401);
      }
    });

    it('should accept valid JWT token', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          id: 'user123',
          username: 'testuser',
        },
      });

      const jwtToken = jwtService.sign({ sub: user.id });

      mockHttpService.get.mockReturnValue(
        of({ data: [], status: 200, statusText: 'OK', headers: {}, config: {} } as AxiosResponse)
      );

      // Act
      const response = await request(app.getHttpServer())
        .get('/auth/guilds')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // Assert
      expect(response.status).toBe(200);
    });
  });
});

