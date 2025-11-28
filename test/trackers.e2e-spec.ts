import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { bootstrapTestApp } from './helpers/create-test-app';

describe('Trackers API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const validApiKey =
    process.env.BOT_API_KEY ||
    '2b2b3d4b5ca4d61eb461886d4cd65d1a9b6000fd2c23bacf727056d38ecb6e32';
  const validTrackerUrl =
    'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser123/overview';

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
    // Clean database before each test
    await prisma.tracker.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('POST /internal/trackers/register-multiple (Bot API)', () => {
    it('should create user and register trackers when user does not exist', async () => {
      // Arrange
      const userId = '123456789012345678';
      const requestBody = {
        userId,
        urls: [validTrackerUrl],
        userData: {
          username: 'testuser',
          globalName: 'Test User',
          avatar: 'avatar_hash',
        },
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/internal/trackers/register-multiple')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(requestBody)
        .expect(201);

      // Assert - Verify user was created
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      expect(user).toBeTruthy();
      expect(user?.username).toBe('testuser');
      expect(user?.globalName).toBe('Test User');
      expect(user?.avatar).toBe('avatar_hash');

      // Assert - Verify tracker was created
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toMatchObject({
        url: validTrackerUrl,
        userId,
        platform: 'STEAM',
        username: 'testuser123',
      });

      // Verify tracker exists in database
      const tracker = await prisma.tracker.findUnique({
        where: { url: validTrackerUrl },
      });
      expect(tracker).toBeTruthy();
      expect(tracker?.userId).toBe(userId);
    });

    it('should register trackers when user exists', async () => {
      // Arrange - Create user first
      const userId = '123456789012345679';
      await prisma.user.create({
        data: {
          id: userId,
          username: 'existinguser',
          globalName: 'Existing User',
        },
      });

      const requestBody = {
        userId,
        urls: [validTrackerUrl],
        userData: {
          username: 'updateduser',
          globalName: 'Updated User',
          avatar: 'new_avatar',
        },
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/internal/trackers/register-multiple')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(requestBody)
        .expect(201);

      // Assert - Verify user was updated
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      expect(user?.username).toBe('updateduser');
      expect(user?.globalName).toBe('Updated User');
      expect(user?.avatar).toBe('new_avatar');

      // Assert - Verify tracker was created
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
    });

    it('should create minimal user when userData is not provided', async () => {
      // Arrange
      const userId = '123456789012345680';
      const requestBody = {
        userId,
        urls: [validTrackerUrl],
        // No userData provided
      };

      // Act
      await request(app.getHttpServer())
        .post('/internal/trackers/register-multiple')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(requestBody)
        .expect(201);

      // Assert - Verify user was created with userId as username
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      expect(user).toBeTruthy();
      expect(user?.username).toBe(userId);
      expect(user?.globalName).toBeNull();
      expect(user?.avatar).toBeNull();
    });

    it('should return 401 without API key', async () => {
      const requestBody = {
        userId: '123456789012345681',
        urls: [validTrackerUrl],
      };

      await request(app.getHttpServer())
        .post('/internal/trackers/register-multiple')
        .send(requestBody)
        .expect(401);
    });
  });

  describe('POST /api/trackers/register (JWT Auth)', () => {
    it('should create/update user and register trackers', async () => {
      // Arrange
      const userId = '123456789012345682';
      const username = 'jwttestuser';

      // Create user first (simulating OAuth flow)
      await prisma.user.create({
        data: {
          id: userId,
          username,
          globalName: 'JWT Test User',
          avatar: 'jwt_avatar',
        },
      });

      // Generate JWT token
      const token = jwtService.sign({ sub: userId, username });

      const requestBody = {
        urls: [validTrackerUrl],
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/trackers/register')
        .set('Authorization', `Bearer ${token}`)
        .send(requestBody)
        .expect(201);

      // Assert - Verify tracker was created
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toMatchObject({
        url: validTrackerUrl,
        userId,
      });

      // Verify user still exists with updated info
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      expect(user).toBeTruthy();
      expect(user?.username).toBe(username);
    });

    it('should return 401 without JWT token', async () => {
      const requestBody = {
        urls: [validTrackerUrl],
      };

      await request(app.getHttpServer())
        .post('/api/trackers/register')
        .send(requestBody)
        .expect(401);
    });
  });

  describe('POST /api/trackers/add (JWT Auth)', () => {
    it('should create/update user and add tracker', async () => {
      // Arrange
      const userId = '123456789012345683';
      const username = 'addtrackeruser';

      // Create user first
      await prisma.user.create({
        data: {
          id: userId,
          username,
        },
      });

      // Generate JWT token
      const token = jwtService.sign({ sub: userId, username });

      const requestBody = {
        url: validTrackerUrl,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/trackers/add')
        .set('Authorization', `Bearer ${token}`)
        .send(requestBody)
        .expect(201);

      // Assert - Verify tracker was created
      expect(response.body).toMatchObject({
        url: validTrackerUrl,
        userId,
      });

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      expect(user).toBeTruthy();
    });

    it('should return 401 without JWT token', async () => {
      const requestBody = {
        url: validTrackerUrl,
      };

      await request(app.getHttpServer())
        .post('/api/trackers/add')
        .send(requestBody)
        .expect(401);
    });
  });
});
