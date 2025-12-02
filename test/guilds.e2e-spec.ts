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
    await prisma.settings.deleteMany({ where: { ownerType: 'guild' } });
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
      });
      expect(guild).toBeTruthy();
      
      // Verify settings were created (Settings model with ownerType='guild')
      const settings = await prisma.settings.findUnique({
        where: {
          ownerType_ownerId: {
            ownerType: 'guild',
            ownerId: guildData.id,
          },
        },
      });
      expect(settings).toBeTruthy();
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

  describe('POST /internal/guilds/upsert', () => {
    it('should return 201 and create guild when guild does not exist', async () => {
      // Arrange
      const guildData = {
        id: '123456789012345678',
        name: 'New Guild',
        ownerId: '987654321098765432',
        memberCount: 100,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/internal/guilds/upsert')
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

      // Verify guild exists in database
      const guild = await prisma.guild.findUnique({
        where: { id: guildData.id },
      });
      expect(guild).toBeTruthy();
      expect(guild?.isActive).toBe(true);
      
      // Verify settings were created (Settings model with ownerType='guild')
      const settings = await prisma.settings.findUnique({
        where: {
          ownerType_ownerId: {
            ownerType: 'guild',
            ownerId: guildData.id,
          },
        },
      });
      expect(settings).toBeTruthy();
    });

    it('should return 200 and update guild when guild exists', async () => {
      // Arrange - Create existing guild
      const existingGuild = await prisma.guild.create({
        data: {
          id: '123456789012345679',
          name: 'Old Guild',
          ownerId: '987654321098765432',
          memberCount: 50,
        },
      });

      const updatedGuildData = {
        id: existingGuild.id,
        name: 'Updated Guild',
        ownerId: existingGuild.ownerId,
        memberCount: 150,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/internal/guilds/upsert')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(updatedGuildData)
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        id: existingGuild.id,
        name: 'Updated Guild',
        memberCount: 150,
      });

      // Verify guild was updated in database
      const guild = await prisma.guild.findUnique({
        where: { id: existingGuild.id },
      });
      expect(guild).toBeTruthy();
      expect(guild?.name).toBe('Updated Guild');
      expect(guild?.memberCount).toBe(150);
    });

    it('should return 200 and reactivate soft-deleted guild', async () => {
      // Arrange - Create soft-deleted guild
      const deletedGuild = await prisma.guild.create({
        data: {
          id: '123456789012345680',
          name: 'Deleted Guild',
          ownerId: '987654321098765432',
          memberCount: 50,
          isActive: false,
          leftAt: new Date(),
        },
      });

      const reactivateData = {
        id: deletedGuild.id,
        name: 'Reactivated Guild',
        ownerId: deletedGuild.ownerId,
        memberCount: 100,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/internal/guilds/upsert')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(reactivateData)
        .expect(200);

      // Assert
      expect(response.body.isActive).toBe(true);
      expect(response.body.leftAt).toBeNull();

      // Verify guild was reactivated in database
      const guild = await prisma.guild.findUnique({
        where: { id: deletedGuild.id },
      });
      expect(guild).toBeTruthy();
      expect(guild?.isActive).toBe(true);
      expect(guild?.leftAt).toBeNull();
    });

    it('should create settings when guild exists but has no settings', async () => {
      // Arrange - Create guild without settings
      const guild = await prisma.guild.create({
        data: {
          id: '123456789012345681',
          name: 'Guild Without Settings',
          ownerId: '987654321098765432',
        },
      });

      const upsertData = {
        id: guild.id,
        name: guild.name,
        ownerId: guild.ownerId,
        memberCount: 100,
      };

      // Act
      await request(app.getHttpServer())
        .post('/internal/guilds/upsert')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(upsertData)
        .expect(200);

      // Assert - Verify settings were created
      const settings = await prisma.settings.findUnique({
        where: {
          ownerType_ownerId: {
            ownerType: 'guild',
            ownerId: guild.id,
          },
        },
      });
      expect(settings).toBeTruthy();
      expect(settings?.settings).toBeTruthy();
    });

    it('should reject request without API key', async () => {
      // Arrange
      const guildData = {
        id: '123456789012345682',
        name: 'Test Guild',
        ownerId: '987654321098765432',
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/internal/guilds/upsert')
        .send(guildData)
        .expect(401);
    });

    it('should reject request with invalid API key', async () => {
      // Arrange
      const guildData = {
        id: '123456789012345683',
        name: 'Test Guild',
        ownerId: '987654321098765432',
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/internal/guilds/upsert')
        .set('Authorization', `Bearer ${invalidApiKey}`)
        .send(guildData)
        .expect(401);
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
      expect(deletedGuild).toBeTruthy();
      expect(deletedGuild?.isActive).toBe(false);
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
      await prisma.settings.create({
        data: {
          ownerType: 'guild',
          ownerId: guild.id,
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

  describe('POST /internal/guilds/:id/sync', () => {
    it('should atomically sync guild with members', async () => {
      // Arrange
      const guildId = 'atomic-guild-123';
      const syncData = {
        guild: {
          id: guildId,
          name: 'Atomic Test Guild',
          ownerId: 'owner123',
          memberCount: 2,
        },
        members: [
          {
            userId: 'user1',
            username: 'User1',
            roles: ['role1', 'role2'],
          },
          {
            userId: 'user2',
            username: 'User2',
            roles: ['role3'],
          },
        ],
      };

      // Act
      const response = await request(app.getHttpServer())
        .post(`/internal/guilds/${guildId}/sync`)
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(syncData)
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        guild: expect.objectContaining({
          id: guildId,
          name: 'Atomic Test Guild',
          ownerId: 'owner123',
        }),
        membersSynced: 2,
      });

      // Verify guild was created in database
      const guild = await prisma.guild.findUnique({
        where: { id: guildId },
        include: { members: true },
      });
      expect(guild).toBeTruthy();
      
      // Verify settings were created
      const settings = await prisma.settings.findUnique({
        where: {
          ownerType_ownerId: {
            ownerType: 'guild',
            ownerId: guildId,
          },
        },
      });
      expect(settings).toBeTruthy();
      
      expect(guild?.members).toHaveLength(2);
      expect(guild?.members[0].userId).toBe('user1');
      expect(guild?.members[1].userId).toBe('user2');
    });

    it('should verify transaction atomicity - guild and members created together', async () => {
      // Arrange
      const guildId = 'atomic-guild-atomicity';
      const syncData = {
        guild: {
          id: guildId,
          name: 'Atomicity Test',
          ownerId: 'owner123',
          memberCount: 3,
        },
        members: [
          { userId: 'user1', username: 'User1', roles: [] },
          { userId: 'user2', username: 'User2', roles: [] },
          { userId: 'user3', username: 'User3', roles: [] },
        ],
      };

      // Act
      await request(app.getHttpServer())
        .post(`/internal/guilds/${guildId}/sync`)
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(syncData)
        .expect(200);

      // Assert - Both guild and members must exist
      const guild = await prisma.guild.findUnique({
        where: { id: guildId },
        include: { members: true },
      });
      expect(guild).toBeTruthy();
      expect(guild?.members).toHaveLength(3);
    });

    it('should verify rollback - no guild or members created if transaction fails', async () => {
      // Arrange - Use a scenario that will cause transaction to fail
      // We'll use a very long string for userId to trigger database constraint
      const guildId = 'atomic-guild-rollback';
      const syncData = {
        guild: {
          id: guildId,
          name: 'Rollback Test',
          ownerId: 'owner123',
          memberCount: 1,
        },
        members: [
          {
            userId: 'a'.repeat(300), // Invalid: userId too long for database constraint
            username: 'Invalid User',
            roles: [],
          },
        ],
      };

      // Act & Assert - Should fail with validation/constraint error
      const response = await request(app.getHttpServer())
        .post(`/internal/guilds/${guildId}/sync`)
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(syncData);

      // Should fail with 400 or 500 depending on when validation happens
      expect([400, 500]).toContain(response.status);

      // Assert - Guild should not exist (transaction rolled back)
      // Verify atomicity: if transaction fails, nothing should be created
      const guild = await prisma.guild.findUnique({
        where: { id: guildId },
        include: { members: true },
      });
      expect(guild).toBeNull();

      const members = await prisma.guildMember.findMany({
        where: { guildId },
      });
      expect(members).toHaveLength(0);
    });

    it('should delete existing members before creating new ones', async () => {
      // Arrange
      const guildId = 'atomic-guild-replace';

      // Create guild with initial members
      await prisma.guild.create({
        data: {
          id: guildId,
          name: 'Replace Test',
          ownerId: 'owner123',
          members: {
            create: [
              { userId: 'old-user1', username: 'OldUser1', roles: [] },
              { userId: 'old-user2', username: 'OldUser2', roles: [] },
            ],
          },
        },
      });

      const syncData = {
        guild: {
          id: guildId,
          name: 'Replace Test Updated',
          ownerId: 'owner123',
          memberCount: 1,
        },
        members: [
          {
            userId: 'new-user1',
            username: 'NewUser1',
            roles: ['role1'],
          },
        ],
      };

      // Act
      await request(app.getHttpServer())
        .post(`/internal/guilds/${guildId}/sync`)
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(syncData)
        .expect(200);

      // Assert - Old members should be deleted, new ones created
      const members = await prisma.guildMember.findMany({
        where: { guildId },
      });
      expect(members).toHaveLength(1);
      expect(members[0].userId).toBe('new-user1');
      expect(members[0].username).toBe('NewUser1');

      // Verify old members are gone
      const oldMembers = await prisma.guildMember.findMany({
        where: {
          guildId,
          userId: { in: ['old-user1', 'old-user2'] },
        },
      });
      expect(oldMembers).toHaveLength(0);
    });

    it('should handle empty members array', async () => {
      // Arrange
      const guildId = 'atomic-guild-empty';
      const syncData = {
        guild: {
          id: guildId,
          name: 'Empty Members Test',
          ownerId: 'owner123',
          memberCount: 0,
        },
        members: [],
      };

      // Act
      const response = await request(app.getHttpServer())
        .post(`/internal/guilds/${guildId}/sync`)
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(syncData)
        .expect(200);

      // Assert
      expect(response.body.membersSynced).toBe(0);

      const guild = await prisma.guild.findUnique({
        where: { id: guildId },
        include: { members: true },
      });
      expect(guild).toBeTruthy();
      expect(guild?.members).toHaveLength(0);
    });

    it('should reject request without API key', async () => {
      // Arrange
      const guildId = 'atomic-guild-auth';
      const syncData = {
        guild: {
          id: guildId,
          name: 'Auth Test',
          ownerId: 'owner123',
          memberCount: 1,
        },
        members: [{ userId: 'user1', username: 'User1', roles: [] }],
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post(`/internal/guilds/${guildId}/sync`)
        .send(syncData)
        .expect(401);
    });

    it('should reject request with invalid API key', async () => {
      // Arrange
      const guildId = 'atomic-guild-invalid-auth';
      const syncData = {
        guild: {
          id: guildId,
          name: 'Invalid Auth Test',
          ownerId: 'owner123',
          memberCount: 1,
        },
        members: [{ userId: 'user1', username: 'User1', roles: [] }],
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post(`/internal/guilds/${guildId}/sync`)
        .set('Authorization', `Bearer ${invalidApiKey}`)
        .send(syncData)
        .expect(401);
    });

    it('should handle large member arrays', async () => {
      // Arrange
      const guildId = 'atomic-guild-large';
      const largeMembers = Array.from({ length: 100 }, (_, i) => ({
        userId: `user${i}`,
        username: `User${i}`,
        roles: [`role${i}`],
      }));

      const syncData = {
        guild: {
          id: guildId,
          name: 'Large Members Test',
          ownerId: 'owner123',
          memberCount: 100,
        },
        members: largeMembers,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post(`/internal/guilds/${guildId}/sync`)
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(syncData)
        .expect(200);

      // Assert
      expect(response.body.membersSynced).toBe(100);

      const members = await prisma.guildMember.findMany({
        where: { guildId },
      });
      expect(members).toHaveLength(100);
    });

    it('should update existing guild if it already exists', async () => {
      // Arrange
      const guildId = 'atomic-guild-update';

      // Create existing guild
      await prisma.guild.create({
        data: {
          id: guildId,
          name: 'Original Name',
          ownerId: 'owner123',
        },
      });

      const syncData = {
        guild: {
          id: guildId,
          name: 'Updated Name',
          ownerId: 'owner123',
          memberCount: 2,
        },
        members: [
          { userId: 'user1', username: 'User1', roles: [] },
          { userId: 'user2', username: 'User2', roles: [] },
        ],
      };

      // Act
      const response = await request(app.getHttpServer())
        .post(`/internal/guilds/${guildId}/sync`)
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(syncData)
        .expect(200);

      // Assert
      expect(response.body.guild.name).toBe('Updated Name');

      const guild = await prisma.guild.findUnique({
        where: { id: guildId },
        include: { members: true },
      });
      expect(guild).toBeTruthy();
      expect(guild?.name).toBe('Updated Name');
      expect(guild?.members).toHaveLength(2);
    });

    it('should handle concurrent sync requests without race conditions', async () => {
      // Arrange - Multiple concurrent sync requests for same guild
      const guildId = 'atomic-guild-concurrent';
      const syncData1 = {
        guild: {
          id: guildId,
          name: 'Concurrent Test',
          ownerId: 'owner123',
          memberCount: 2,
        },
        members: [
          { userId: 'user1', username: 'User1', roles: [] },
          { userId: 'user2', username: 'User2', roles: [] },
        ],
      };
      const syncData2 = {
        guild: {
          id: guildId,
          name: 'Concurrent Test Updated',
          ownerId: 'owner123',
          memberCount: 3,
        },
        members: [
          { userId: 'user1', username: 'User1', roles: [] },
          { userId: 'user2', username: 'User2', roles: [] },
          { userId: 'user3', username: 'User3', roles: [] },
        ],
      };

      // Act - Make concurrent requests
      const [response1, response2] = await Promise.all([
        request(app.getHttpServer())
          .post(`/internal/guilds/${guildId}/sync`)
          .set('Authorization', `Bearer ${validApiKey}`)
          .send(syncData1),
        request(app.getHttpServer())
          .post(`/internal/guilds/${guildId}/sync`)
          .set('Authorization', `Bearer ${validApiKey}`)
          .send(syncData2),
      ]);

      // Assert - Both should succeed (transactions should serialize)
      expect([response1.status, response2.status]).toContain(200);

      // Verify final state - should be consistent (one of the two results)
      const guild = await prisma.guild.findUnique({
        where: { id: guildId },
        include: { members: true },
      });
      expect(guild).toBeTruthy();
      // Members should be consistent - either 2 or 3, not mixed
      expect([2, 3]).toContain(guild?.members.length);
    });

    it('should complete sync in acceptable time for large guilds', async () => {
      // Arrange
      const guildId = 'atomic-guild-performance';
      const largeMembers = Array.from({ length: 1000 }, (_, i) => ({
        userId: `user${i}`,
        username: `User${i}`,
        roles: [`role${i}`],
      }));

      const syncData = {
        guild: {
          id: guildId,
          name: 'Performance Test',
          ownerId: 'owner123',
          memberCount: 1000,
        },
        members: largeMembers,
      };

      // Act - Measure time
      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .post(`/internal/guilds/${guildId}/sync`)
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(syncData)
        .expect(200);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(response.body.membersSynced).toBe(1000);
      expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds for 1000 members

      // Verify all members were created
      const members = await prisma.guildMember.findMany({
        where: { guildId },
      });
      expect(members).toHaveLength(1000);
    });
  });

  describe('Regression Tests - Existing Endpoints Still Work', () => {
    it('should still allow POST /internal/guilds/upsert for guild join events', async () => {
      // Arrange
      const guildData = {
        id: 'regression-guild-upsert',
        name: 'Regression Test Guild',
        ownerId: 'owner123',
        memberCount: 10,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/internal/guilds/upsert')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(guildData)
        .expect(200); // Or 201 if created

      // Assert
      expect(response.body).toMatchObject({
        id: guildData.id,
        name: guildData.name,
        ownerId: guildData.ownerId,
      });

      // Verify guild exists in database
      const guild = await prisma.guild.findUnique({
        where: { id: guildData.id },
      });
      expect(guild).toBeTruthy();
    });

    it('should still allow POST /internal/guild-members/:guildId/sync for incremental updates', async () => {
      // Arrange
      const guildId = 'regression-guild-incremental';
      await prisma.guild.create({
        data: {
          id: guildId,
          name: 'Regression Test',
          ownerId: 'owner123',
        },
      });

      const syncData = {
        members: [
          { userId: 'user1', username: 'User1', roles: ['role1'] },
          { userId: 'user2', username: 'User2', roles: ['role2'] },
        ],
      };

      // Act
      const response = await request(app.getHttpServer())
        .post(`/internal/guild-members/${guildId}/sync`)
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(syncData)
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        synced: 2,
      });

      // Verify members were synced
      const members = await prisma.guildMember.findMany({
        where: { guildId },
      });
      expect(members).toHaveLength(2);
    });
  });
});
