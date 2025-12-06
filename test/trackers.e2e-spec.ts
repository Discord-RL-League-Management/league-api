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
    await prisma.guildMember.deleteMany();
    await prisma.settings.deleteMany({ where: { ownerType: 'guild' } });
    await prisma.guild.deleteMany();
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
      const body = response.body as Array<{
        url: string;
        userId: string;
        platform: string;
        username: string;
      }>;
      expect(body).toBeInstanceOf(Array);
      expect(body.length).toBe(1);
      expect(body[0]).toMatchObject({
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
      const body = response.body as Array<unknown>;
      expect(body).toBeInstanceOf(Array);
      expect(body.length).toBe(1);
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
      const body = response.body as Array<{ url: string; userId: string }>;
      expect(body).toBeInstanceOf(Array);
      expect(body.length).toBe(1);
      expect(body[0]).toMatchObject({
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
      expect(response.body as { url: string; userId: string }).toMatchObject({
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

  describe('Tracker Processing Guard (Guild Settings)', () => {
    it('should create tracker but skip processing when guild has processing disabled', async () => {
      // Arrange - Create guild with processing disabled
      const guildId = '987654321098765432';
      const userId = '123456789012345690';
      const username = 'guildtestuser';

      // Create guild
      await prisma.guild.create({
        data: {
          id: guildId,
          name: 'Test Guild',
          ownerId: '111111111111111111',
          memberCount: 1,
        },
      });

      // Create guild settings with processing disabled
      await prisma.settings.create({
        data: {
          ownerType: 'guild',
          ownerId: guildId,
          settings: {
            bot_command_channels: [],
            trackerProcessing: {
              enabled: false,
            },
          },
          schemaVersion: 1,
        },
      });

      // Create user and guild membership
      await prisma.user.create({
        data: {
          id: userId,
          username,
        },
      });

      await prisma.guildMember.create({
        data: {
          userId,
          guildId,
          username,
          roles: [],
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
      const body = response.body as Array<{ id: string; url: string }>;
      expect(body).toBeInstanceOf(Array);
      expect(body.length).toBe(1);

      // Verify tracker exists in database
      const tracker = await prisma.tracker.findUnique({
        where: { id: body[0].id },
      });
      expect(tracker).toBeTruthy();

      // Verify tracker status is FAILED with appropriate error message
      expect(tracker?.scrapingStatus).toBe('FAILED');
      expect(tracker?.scrapingError).toBe(
        'Tracker processing disabled by guild settings',
      );
    });

    it('should process tracker when guild has processing enabled', async () => {
      // Arrange - Create guild with processing enabled (default)
      const guildId = '987654321098765433';
      const userId = '123456789012345691';
      const username = 'guildtestuser2';

      // Create guild
      await prisma.guild.create({
        data: {
          id: guildId,
          name: 'Test Guild 2',
          ownerId: '111111111111111112',
          memberCount: 1,
        },
      });

      // Create guild settings with processing enabled (default)
      await prisma.settings.create({
        data: {
          ownerType: 'guild',
          ownerId: guildId,
          settings: {
            bot_command_channels: [],
            trackerProcessing: {
              enabled: true,
            },
          },
          schemaVersion: 1,
        },
      });

      // Create user and guild membership
      await prisma.user.create({
        data: {
          id: userId,
          username,
        },
      });

      await prisma.guildMember.create({
        data: {
          userId,
          guildId,
          username,
          roles: [],
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
      const body = response.body as Array<{ id: string; url: string }>;
      expect(body).toBeInstanceOf(Array);
      expect(body.length).toBe(1);

      // Verify tracker exists in database
      const tracker = await prisma.tracker.findUnique({
        where: { id: body[0].id },
      });
      expect(tracker).toBeTruthy();

      // Verify tracker is not in FAILED state due to processing guard
      // (it may be PENDING or have other status, but not FAILED with processing disabled message)
      expect(tracker?.scrapingError).not.toBe(
        'Tracker processing disabled by guild settings',
      );
    });

    it('should throw ForbiddenException on manual refresh when processing disabled', async () => {
      // Arrange - Create guild with processing disabled
      const guildId = '987654321098765434';
      const userId = '123456789012345692';
      const username = 'guildtestuser3';

      // Create guild
      await prisma.guild.create({
        data: {
          id: guildId,
          name: 'Test Guild 3',
          ownerId: '111111111111111113',
          memberCount: 1,
        },
      });

      // Create guild settings with processing disabled
      await prisma.settings.create({
        data: {
          ownerType: 'guild',
          ownerId: guildId,
          settings: {
            bot_command_channels: [],
            trackerProcessing: {
              enabled: false,
            },
          },
          schemaVersion: 1,
        },
      });

      // Create user and guild membership
      await prisma.user.create({
        data: {
          id: userId,
          username,
        },
      });

      await prisma.guildMember.create({
        data: {
          userId,
          guildId,
          username,
          roles: [],
        },
      });

      // Create tracker
      const tracker = await prisma.tracker.create({
        data: {
          url: validTrackerUrl,
          game: 'ROCKET_LEAGUE',
          platform: 'STEAM',
          username: 'testuser123',
          userId,
        },
      });

      // Generate JWT token
      const token = jwtService.sign({ sub: userId, username });

      // Act & Assert - Manual refresh should throw ForbiddenException
      await request(app.getHttpServer())
        .post(`/api/trackers/${tracker.id}/refresh`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toBe(
            'Tracker processing is disabled by guild settings',
          );
        });
    });

    it('should allow manual refresh when processing enabled', async () => {
      // Arrange - Create guild with processing enabled
      const guildId = '987654321098765435';
      const userId = '123456789012345693';
      const username = 'guildtestuser4';

      // Create guild
      await prisma.guild.create({
        data: {
          id: guildId,
          name: 'Test Guild 4',
          ownerId: '111111111111111114',
          memberCount: 1,
        },
      });

      // Create guild settings with processing enabled
      await prisma.settings.create({
        data: {
          ownerType: 'guild',
          ownerId: guildId,
          settings: {
            bot_command_channels: [],
            trackerProcessing: {
              enabled: true,
            },
          },
          schemaVersion: 1,
        },
      });

      // Create user and guild membership
      await prisma.user.create({
        data: {
          id: userId,
          username,
        },
      });

      await prisma.guildMember.create({
        data: {
          userId,
          guildId,
          username,
          roles: [],
        },
      });

      // Create tracker
      const tracker = await prisma.tracker.create({
        data: {
          url: validTrackerUrl,
          game: 'ROCKET_LEAGUE',
          platform: 'STEAM',
          username: 'testuser123',
          userId,
        },
      });

      // Generate JWT token
      const token = jwtService.sign({ sub: userId, username });

      // Act & Assert - Manual refresh should succeed
      await request(app.getHttpServer())
        .post(`/api/trackers/${tracker.id}/refresh`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('should process tracker when user has multiple guilds and at least one has processing enabled', async () => {
      // Arrange - Create two guilds, one with processing disabled, one enabled
      const guildId1 = '987654321098765436';
      const guildId2 = '987654321098765437';
      const userId = '123456789012345694';
      const username = 'guildtestuser5';

      // Create guilds
      await prisma.guild.createMany({
        data: [
          {
            id: guildId1,
            name: 'Test Guild 5a',
            ownerId: '111111111111111115',
            memberCount: 1,
          },
          {
            id: guildId2,
            name: 'Test Guild 5b',
            ownerId: '111111111111111116',
            memberCount: 1,
          },
        ],
      });

      // Create guild settings - first disabled, second enabled
      await prisma.settings.createMany({
        data: [
          {
            ownerType: 'guild',
            ownerId: guildId1,
            settings: {
              bot_command_channels: [],
              trackerProcessing: {
                enabled: false,
              },
            },
            schemaVersion: 1,
          },
          {
            ownerType: 'guild',
            ownerId: guildId2,
            settings: {
              bot_command_channels: [],
              trackerProcessing: {
                enabled: true,
              },
            },
            schemaVersion: 1,
          },
        ],
      });

      // Create user and guild memberships
      await prisma.user.create({
        data: {
          id: userId,
          username,
        },
      });

      await prisma.guildMember.createMany({
        data: [
          {
            userId,
            guildId: guildId1,
            username,
            roles: [],
          },
          {
            userId,
            guildId: guildId2,
            username,
            roles: [],
          },
        ],
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
      const body = response.body as Array<{ id: string; url: string }>;
      expect(body).toBeInstanceOf(Array);
      expect(body.length).toBe(1);

      // Verify tracker exists in database
      const tracker = await prisma.tracker.findUnique({
        where: { id: body[0].id },
      });
      expect(tracker).toBeTruthy();

      // Verify tracker is not in FAILED state (processing should be allowed)
      expect(tracker?.scrapingError).not.toBe(
        'Tracker processing disabled by guild settings',
      );
    });
  });
});
