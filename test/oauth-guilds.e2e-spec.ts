import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { bootstrapTestApp } from './helpers/create-test-app';
import { of } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';
import { DiscordFactory } from './factories/discord.factory';
import { GuildFactory } from './factories/guild.factory';

describe('OAuth Guilds Integration (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let httpService: HttpService;
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
    httpService = app.get<HttpService>(HttpService);
    jwtService = app.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await prisma.guildMember.deleteMany();
    await prisma.guild.deleteMany();
    await prisma.user.deleteMany();

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('GET /auth/guilds', () => {
    it('should return filtered mutual guilds for authenticated user', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          id: 'user123',
          username: 'testuser',
          accessToken: 'valid_token',
        },
      });

      const guild = await prisma.guild.create({
        data: {
          id: 'guild123',
          name: 'Test Guild',
          ownerId: 'owner123',
        },
      });

      await prisma.guildMember.create({
        data: {
          userId: user.id,
          guildId: guild.id,
          username: 'testuser',
        },
      });

      const jwtToken = jwtService.sign({ sub: user.id });

      const mockDiscordGuilds = [
        { id: 'guild123', name: 'Test Guild', owner: false, permissions: '0' },
        { id: 'guild456', name: 'Other Guild', owner: false, permissions: '0' },
      ];

      mockHttpService.get.mockReturnValue(
        of({
          data: mockDiscordGuilds,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        } as AxiosResponse),
      );

      // Act
      const response = await request(app.getHttpServer())
        .get('/auth/guilds')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe('guild123');
    });

    it('should return 401 for unauthenticated request', async () => {
      // Act & Assert
      await request(app.getHttpServer()).get('/auth/guilds').expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('should return user without guild data', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          id: 'user123',
          username: 'testuser',
          accessToken: 'valid_token',
        },
      });

      const guild = await prisma.guild.create({
        data: {
          id: 'guild123',
          name: 'Test Guild',
          ownerId: 'owner123',
        },
      });

      await prisma.guildMember.create({
        data: {
          userId: user.id,
          guildId: guild.id,
          username: 'testuser',
        },
      });

      const jwtToken = jwtService.sign({ sub: user.id });

      // Act
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('id', user.id);
      expect(response.body).toHaveProperty('username', user.username);
      // Verify guilds are NOT included in response
      expect(response.body).not.toHaveProperty('guilds');
    });

    it('should return 401 for invalid token', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should clear cookies and revoke tokens', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          id: 'user123',
          username: 'testuser',
        },
      });

      const jwtToken = jwtService.sign({ sub: user.id });

      mockHttpService.post.mockReturnValue(
        of({
          data: {},
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        } as AxiosResponse),
      );

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty(
        'message',
        'Logged out successfully',
      );
    });

    it('should return 401 for unauthenticated logout', async () => {
      // Act & Assert
      await request(app.getHttpServer()).post('/auth/logout').expect(401);
    });
  });
});
