import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { bootstrapTestApp } from './helpers/create-test-app';

describe('Profile API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let validToken: string;
  let userId: string;

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

    // Create test user and generate token
    const user = await prisma.user.create({
      data: {
        id: 'test-user-123',
        username: 'testuser',
        globalName: 'Test User',
      },
    });
    userId = user.id;
    validToken = jwtService.sign({ sub: user.id, username: user.username });
  });

  describe('GET /api/profile', () => {
    it('should return user profile with valid JWT', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(
        response.body as { id: string; username: string; globalName: string },
      ).toMatchObject({
        id: userId,
        username: 'testuser',
        globalName: 'Test User',
      });
    });

    it('should return 401 without JWT', async () => {
      await request(app.getHttpServer()).get('/api/profile').expect(401);
    });
  });

  describe('GET /api/profile/stats', () => {
    it('should return user stats', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/profile/stats')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      const body = response.body as Record<string, unknown>;
      expect(body).toHaveProperty('userId');
      expect(body).toHaveProperty('gamesPlayed');
      expect(body).toHaveProperty('wins');
      expect(body).toHaveProperty('losses');
    });

    it('should return 401 without JWT', async () => {
      await request(app.getHttpServer()).get('/api/profile/stats').expect(401);
    });
  });

  describe('PATCH /api/profile/settings', () => {
    it('should update user settings', async () => {
      const settings = { theme: 'dark', notifications: true };

      const response = await request(app.getHttpServer())
        .patch('/api/profile/settings')
        .set('Authorization', `Bearer ${validToken}`)
        .send(settings)
        .expect(200);

      expect((response.body as { settings: unknown }).settings).toEqual(
        settings,
      );
    });

    it('should return 401 without JWT', async () => {
      await request(app.getHttpServer())
        .patch('/api/profile/settings')
        .send({ theme: 'dark' })
        .expect(401);
    });
  });
});
