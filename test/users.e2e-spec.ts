import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { bootstrapTestApp } from './helpers/create-test-app';

describe('Users API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await bootstrapTestApp(app);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await prisma.user.deleteMany();
  });

  const validApiKey =
    '2b2b3d4b5ca4d61eb461886d4cd65d1a9b6000fd2c23bacf727056d38ecb6e32';
  const invalidApiKey = 'invalid-key';

  describe('POST /internal/users', () => {
    it('should create user with valid data and API key', async () => {
      const userData = {
        id: '123456789',
        username: 'testuser',
        globalName: 'Test User',
        avatar: 'avatar123',
        email: 'test@example.com',
      };

      const response = await request(app.getHttpServer())
        .post('/internal/users')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: userData.id,
        username: userData.username,
        globalName: userData.globalName,
        avatar: userData.avatar,
        email: userData.email,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        lastLoginAt: expect.any(String),
      });
    });

    it('should reject request without API key', async () => {
      const userData = {
        id: '123456789',
        username: 'testuser',
      };

      await request(app.getHttpServer())
        .post('/internal/users')
        .send(userData)
        .expect(401);
    });

    it('should reject request with invalid API key', async () => {
      const userData = {
        id: '123456789',
        username: 'testuser',
      };

      await request(app.getHttpServer())
        .post('/internal/users')
        .set('Authorization', `Bearer ${invalidApiKey}`)
        .send(userData)
        .expect(401);
    });

    it('should reject request with missing required fields', async () => {
      const userData = {
        username: 'testuser',
        // Missing required 'id' field
      };

      await request(app.getHttpServer())
        .post('/internal/users')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(userData)
        .expect(400);
    });
  });

  describe('GET /internal/users', () => {
    beforeEach(async () => {
      // Create test users
      await prisma.user.createMany({
        data: [
          {
            id: 'user1',
            username: 'user1',
            globalName: 'User One',
            createdAt: new Date('2023-01-01'),
          },
          {
            id: 'user2',
            username: 'user2',
            globalName: 'User Two',
            createdAt: new Date('2023-01-02'),
          },
        ],
      });
    });

    it('should return all users with valid API key', async () => {
      const response = await request(app.getHttpServer())
        .get('/internal/users')
        .set('Authorization', `Bearer ${validApiKey}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toMatchObject({
        id: expect.any(String),
        username: expect.any(String),
        globalName: expect.any(String),
        createdAt: expect.any(String),
      });
    });

    it('should return users in descending order by creation date', async () => {
      const response = await request(app.getHttpServer())
        .get('/internal/users')
        .set('Authorization', `Bearer ${validApiKey}`)
        .expect(200);

      expect(response.body[0].id).toBe('user2'); // More recent
      expect(response.body[1].id).toBe('user1'); // Older
    });

    it('should reject request without API key', async () => {
      await request(app.getHttpServer()).get('/internal/users').expect(401);
    });
  });

  describe('GET /internal/users/:id', () => {
    beforeEach(async () => {
      await prisma.user.create({
        data: {
          id: 'user123',
          username: 'testuser',
          globalName: 'Test User',
        },
      });
    });

    it('should return user by id with valid API key', async () => {
      const response = await request(app.getHttpServer())
        .get('/internal/users/user123')
        .set('Authorization', `Bearer ${validApiKey}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'user123',
        username: 'testuser',
        globalName: 'Test User',
      });
    });

    it('should return 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .get('/internal/users/nonexistent')
        .set('Authorization', `Bearer ${validApiKey}`)
        .expect(404);
    });

    it('should reject request without API key', async () => {
      await request(app.getHttpServer())
        .get('/internal/users/user123')
        .expect(401);
    });
  });

  describe('PATCH /internal/users/:id', () => {
    beforeEach(async () => {
      await prisma.user.create({
        data: {
          id: 'user123',
          username: 'testuser',
          globalName: 'Test User',
        },
      });
    });

    it('should update user with valid data and API key', async () => {
      const updateData = {
        username: 'updateduser',
        globalName: 'Updated User',
      };

      const response = await request(app.getHttpServer())
        .patch('/internal/users/user123')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'user123',
        username: 'updateduser',
        globalName: 'Updated User',
        updatedAt: expect.any(String),
      });
    });

    it('should reject request without API key', async () => {
      await request(app.getHttpServer())
        .patch('/internal/users/user123')
        .send({ username: 'updateduser' })
        .expect(401);
    });
  });

  describe('DELETE /internal/users/:id', () => {
    beforeEach(async () => {
      await prisma.user.create({
        data: {
          id: 'user123',
          username: 'testuser',
          globalName: 'Test User',
        },
      });
    });

    it('should delete user with valid API key', async () => {
      await request(app.getHttpServer())
        .delete('/internal/users/user123')
        .set('Authorization', `Bearer ${validApiKey}`)
        .expect(200);

      // Verify user is deleted
      const user = await prisma.user.findUnique({ where: { id: 'user123' } });
      expect(user).toBeNull();
    });

    it('should return 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .delete('/internal/users/nonexistent')
        .set('Authorization', `Bearer ${validApiKey}`)
        .expect(404);
    });

    it('should reject request without API key', async () => {
      await request(app.getHttpServer())
        .delete('/internal/users/user123')
        .expect(401);
    });
  });
});
