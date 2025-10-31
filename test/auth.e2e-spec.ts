import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { bootstrapTestApp } from './helpers/create-test-app';

describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await bootstrapTestApp(app);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  describe('GET /auth/discord', () => {
    it('should redirect to Discord OAuth', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/discord')
        .expect(302);

      expect(response.headers.location).toContain(
        'discord.com/api/oauth2/authorize',
      );
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user with valid JWT', async () => {
      // Create test user
      const user = await prisma.user.create({
        data: {
          id: 'test-user-id',
          username: 'testuser',
          globalName: 'Test User',
        },
      });

      // Generate valid JWT using the JWT service (should use the same secret as the strategy)
      const token = jwtService.sign({ sub: user.id, username: user.username });

      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: user.id,
        username: user.username,
      });
    });

    it('should return 401 with invalid JWT', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return 401 without JWT', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });
  });
});
