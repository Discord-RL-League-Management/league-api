import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { bootstrapTestApp } from './helpers/create-test-app';

describe('Guilds API (e2e)', () => {
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
    await prisma.guildMember.deleteMany();
    await prisma.guildSettings.deleteMany();
    await prisma.guild.deleteMany();
    await prisma.user.deleteMany();
  });

  const validApiKey =
    '2b2b3d4b5ca4d61eb461886d4cd65d1a9b6000fd2c23bacf727056d38ecb6e32';
  const invalidApiKey = 'invalid-key';

  describe('POST /internal/guilds', () => {
    it('should create guild with valid data and API key', async () => {
      // Arrange
      const guildData = {
        id: '123456789012345678',
        name: 'Test Guild',
        ownerId: '987654321098765432',
        memberCount: 100,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/internal/guilds')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(guildData)
        .expect(201);

      // Assert
      expect(response.body).toMatchObject({
        id: guildData.id,
        name: guildData.name,
        ownerId: guildData.ownerId,
        memberCount: guildData.memberCount,
        isActive: true,
        joinedAt: expect.any(String),
        leftAt: null,
      });

      // Verify guild was created in database
      const guild = await prisma.guild.findUnique({
        where: { id: guildData.id },
        include: { settings: true },
      });
      expect(guild).toBeTruthy();
      expect(guild.settings).toBeTruthy();
    });

    it('should reject request without API key', async () => {
      // Arrange
      const guildData = {
        id: '123456789012345678',
        name: 'Test Guild',
        ownerId: '987654321098765432',
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/internal/guilds')
        .send(guildData)
        .expect(401);
    });

    it('should reject request with invalid API key', async () => {
      // Arrange
      const guildData = {
        id: '123456789012345678',
        name: 'Test Guild',
        ownerId: '987654321098765432',
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/internal/guilds')
        .set('Authorization', `Bearer ${invalidApiKey}`)
        .send(guildData)
        .expect(401);
    });

    it('should validate required fields', async () => {
      // Arrange
      const invalidGuildData = {
        name: 'Test Guild',
        // Missing required fields: id, ownerId
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/internal/guilds')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(invalidGuildData)
        .expect(400);
    });

    it('should validate Discord snowflake ID format', async () => {
      // Arrange
      const invalidGuildData = {
        id: 'invalid-id',
        name: 'Test Guild',
        ownerId: '987654321098765432',
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/internal/guilds')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(invalidGuildData)
        .expect(400);
    });
  });

  describe('GET /internal/guilds', () => {
    it('should return all active guilds', async () => {
      // Arrange
      await prisma.guild.createMany({
        data: [
          { id: 'guild1', name: 'Guild 1', ownerId: 'owner1', isActive: true },
          { id: 'guild2', name: 'Guild 2', ownerId: 'owner2', isActive: true },
          { id: 'guild3', name: 'Guild 3', ownerId: 'owner3', isActive: false },
        ],
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/internal/guilds')
        .set('Authorization', `Bearer ${validApiKey}`)
        .expect(200);

      // Assert
      expect(response.body.guilds).toHaveLength(2);
      expect(response.body.guilds[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        isActive: true,
      });
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 50,
        total: 2,
        pages: 1,
      });
    });
  });

  describe('GET /internal/guilds/:id', () => {
    it('should return guild details when found', async () => {
      // Arrange
      const guild = await prisma.guild.create({
        data: {
          id: 'guild1',
          name: 'Test Guild',
          ownerId: 'owner1',
        },
      });

      // Act
      const response = await request(app.getHttpServer())
        .get(`/internal/guilds/${guild.id}`)
        .set('Authorization', `Bearer ${validApiKey}`)
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        id: guild.id,
        name: guild.name,
        ownerId: guild.ownerId,
        isActive: true,
      });
    });

    it('should return 404 when guild not found', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get('/internal/guilds/nonexistent')
        .set('Authorization', `Bearer ${validApiKey}`)
        .expect(404);
    });
  });

  describe('DELETE /internal/guilds/:id', () => {
    it('should soft delete guild', async () => {
      // Arrange
      const guild = await prisma.guild.create({
        data: { id: 'guild1', name: 'Test Guild', ownerId: 'owner1' },
      });

      // Act
      const response = await request(app.getHttpServer())
        .delete(`/internal/guilds/${guild.id}`)
        .set('Authorization', `Bearer ${validApiKey}`)
        .expect(200);

      // Assert
      expect(response.body.isActive).toBe(false);
      expect(response.body.leftAt).toBeTruthy();

      // Verify soft delete in database
      const deletedGuild = await prisma.guild.findUnique({
        where: { id: guild.id },
      });
      expect(deletedGuild.isActive).toBe(false);
    });

    it('should return 404 when guild not found', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .delete('/internal/guilds/nonexistent')
        .set('Authorization', `Bearer ${validApiKey}`)
        .expect(404);
    });
  });

  describe('GET /internal/guilds/:id/settings', () => {
    it('should return guild settings when they exist', async () => {
      // Arrange
      const guild = await prisma.guild.create({
        data: { id: 'guild1', name: 'Test Guild', ownerId: 'owner1' },
      });
      await prisma.guildSettings.create({
        data: {
          guildId: guild.id,
          settings: { features: { league_management: true } },
        },
      });

      // Act
      const response = await request(app.getHttpServer())
        .get(`/internal/guilds/${guild.id}/settings`)
        .set('Authorization', `Bearer ${validApiKey}`)
        .expect(200);

      // Assert
      expect(response.body.settings).toMatchObject({
        features: { league_management: true },
      });
    });

    it('should return default settings when none exist', async () => {
      // Arrange
      const guild = await prisma.guild.create({
        data: { id: 'guild1', name: 'Test Guild', ownerId: 'owner1' },
      });

      // Act
      const response = await request(app.getHttpServer())
        .get(`/internal/guilds/${guild.id}/settings`)
        .set('Authorization', `Bearer ${validApiKey}`)
        .expect(200);

      // Assert
      expect(response.body.settings).toMatchObject({
        features: expect.any(Object),
        permissions: expect.any(Object),
      });
    });
  });
});
