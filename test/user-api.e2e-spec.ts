import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { bootstrapTestApp } from './helpers/create-test-app';

describe('User API (e2e)', () => {
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

    const user = await prisma.user.create({
      data: {
        id: 'user-123',
        username: 'testuser',
        globalName: 'Test User',
      },
    });
    userId = user.id;
    validToken = jwtService.sign({ sub: user.id, username: user.username });
  });

  describe('GET /api/users/me', () => {
    it('should return own user data', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.id).toBe(userId);
    });

    it('should return 401 without JWT', async () => {
      await request(app.getHttpServer()).get('/api/users/me').expect(401);
    });
  });

  describe('PATCH /api/users/me', () => {
    it('should update own user data', async () => {
      const updateData = { username: 'newusername' };

      const response = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${validToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.username).toBe('newusername');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return own user data when :id matches JWT user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.id).toBe(userId);
    });

    it('should return 403 when :id does not match JWT user', async () => {
      const otherUser = await prisma.user.create({
        data: { id: 'other-user', username: 'other' },
      });

      await request(app.getHttpServer())
        .get(`/api/users/${otherUser.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403);
    });
  });
});
