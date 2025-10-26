import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestHelpers } from './helpers/test-helpers';
import { validApiKey, validUser, validUserCreateDto } from './fixtures/users.fixture';
import { bootstrapTestApp } from './helpers/create-test-app';
import { JwtService } from '@nestjs/jwt';

describe('Integration Tests - Both Auth Types (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testHelpers: TestHelpers;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    testHelpers = new TestHelpers(app, prisma, jwtService);
    
    await bootstrapTestApp(app);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await testHelpers.cleanupUsers();
  });

  describe('Bot Creates User → User Can Access via JWT', () => {
    it('should allow bot to create user and user to access via JWT', async () => {
      // Step 1: Bot creates user via internal endpoint
      const createResponse = await testHelpers.makeBotRequest('POST', '/internal/users', validUserCreateDto);
      expect(createResponse.status).toBe(201);
      expect(createResponse.body.id).toBe(validUserCreateDto.id);

      // Step 2: Generate JWT token for the created user
      const jwtToken = testHelpers.generateJwtToken(validUserCreateDto.id, validUserCreateDto.username);

      // Step 3: User accesses their profile via JWT endpoint
      const profileResponse = await request(app.getHttpServer())
        .get('/api/profile')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // Step 4: Verify user can see their data
      expect(profileResponse.body).toHaveProperty('id');
      expect(profileResponse.body.id).toBe(validUserCreateDto.id);
      expect(profileResponse.body).toHaveProperty('username');
    });

    it('should allow bot to update user and user to see updated data', async () => {
      // Step 1: Bot creates user
      await testHelpers.makeBotRequest('POST', '/internal/users', validUserCreateDto);

      // Step 2: Bot updates user
      const updateData = { username: 'updated_username', globalName: 'Updated User' };
      const updateResponse = await testHelpers.makeBotRequest('PATCH', `/internal/users/${validUserCreateDto.id}`, updateData);
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.username).toBe('updated_username');

      // Step 3: Generate JWT token and user can see updated data
      const jwtToken = testHelpers.generateJwtToken(validUserCreateDto.id, 'updated_username');
      const profileResponse = await request(app.getHttpServer())
        .get('/api/profile')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(profileResponse.body.username).toBe('updated_username');
    });
  });

  describe('User Updates Data → Bot Can Fetch It', () => {
    it('should allow user to update settings and bot to fetch updated data', async () => {
      // Step 1: Bot creates user
      await testHelpers.makeBotRequest('POST', '/internal/users', validUserCreateDto);

      // Step 2: Generate JWT token and user updates their profile
      const jwtToken = testHelpers.generateJwtToken(validUserCreateDto.id, validUserCreateDto.username);
      const userUpdateData = { username: 'user_updated_username' };
      const userUpdateResponse = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(userUpdateData)
        .expect(200);

      expect(userUpdateResponse.body.username).toBe('user_updated_username');

      // Step 3: Bot can fetch updated data
      const botFetchResponse = await testHelpers.makeBotRequest('GET', `/internal/users/${validUserCreateDto.id}`);
      expect(botFetchResponse.status).toBe(200);
      expect(botFetchResponse.body.username).toBe('user_updated_username');
    });

    it('should allow user to update profile settings and bot to see changes', async () => {
      // Step 1: Bot creates user
      await testHelpers.makeBotRequest('POST', '/internal/users', validUserCreateDto);

      // Step 2: Generate JWT token and user updates profile settings
      const jwtToken = testHelpers.generateJwtToken(validUserCreateDto.id, validUserCreateDto.username);
      const settingsData = { notifications: true, theme: 'dark' };
      const settingsResponse = await request(app.getHttpServer())
        .patch('/api/profile/settings')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(settingsData)
        .expect(200);

      expect(settingsResponse.body.settings).toEqual(settingsData);

      // Step 3: Bot can still access user data
      const botResponse = await testHelpers.makeBotRequest('GET', `/internal/users/${validUserCreateDto.id}`);
      expect(botResponse.status).toBe(200);
      expect(botResponse.body.id).toBe(validUserCreateDto.id);
    });
  });

  describe('Cross-Auth-Type Data Flow', () => {
    it('should maintain data consistency between bot and user operations', async () => {
      // Step 1: Bot creates user
      const createResponse = await testHelpers.makeBotRequest('POST', '/internal/users', validUserCreateDto);
      const userId = createResponse.body.id;

      // Step 2: Generate JWT token and user accesses their data
      const jwtToken = testHelpers.generateJwtToken(userId, validUserCreateDto.username);
      const userProfileResponse = await request(app.getHttpServer())
        .get('/api/profile')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // Step 3: Bot fetches same user data
      const botUserResponse = await testHelpers.makeBotRequest('GET', `/internal/users/${userId}`);

      // Step 4: Verify data consistency
      expect(userProfileResponse.body.id).toBe(botUserResponse.body.id);
      expect(userProfileResponse.body.username).toBe(botUserResponse.body.username);
    });

    it('should handle concurrent bot and user operations', async () => {
      // Step 1: Bot creates user
      await testHelpers.makeBotRequest('POST', '/internal/users', validUserCreateDto);

      // Step 2: Generate JWT token and concurrent operations
      const jwtToken = testHelpers.generateJwtToken(validUserCreateDto.id, validUserCreateDto.username);
      const [botResponse, userResponse] = await Promise.all([
        testHelpers.makeBotRequest('GET', `/internal/users/${validUserCreateDto.id}`),
        request(app.getHttpServer())
          .get('/api/profile')
          .set('Authorization', `Bearer ${jwtToken}`)
      ]);

      // Step 3: Both should succeed
      expect(botResponse.status).toBe(200);
      expect(userResponse.status).toBe(200);
    });
  });

  describe('Authorization Boundaries', () => {
    it('should prevent user from accessing other users data', async () => {
      // Step 1: Bot creates two users
      const user1 = { ...validUserCreateDto, id: '111111111111111111', username: 'user1' };
      const user2 = { ...validUserCreateDto, id: '222222222222222222', username: 'user2' };

      await testHelpers.makeBotRequest('POST', '/internal/users', user1);
      await testHelpers.makeBotRequest('POST', '/internal/users', user2);

      // Step 2: Generate JWT token for user1 and try to access user2's data
      const jwtToken = testHelpers.generateJwtToken('111111111111111111', 'user1');
      const unauthorizedResponse = await request(app.getHttpServer())
        .get('/api/users/222222222222222222')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(403);

      expect(unauthorizedResponse.body.message).toContain('You can only view your own profile');
    });

    it('should allow bot to access all user data', async () => {
      // Step 1: Bot creates multiple users
      const users = [
        { ...validUserCreateDto, id: '111111111111111111', username: 'user1' },
        { ...validUserCreateDto, id: '222222222222222222', username: 'user2' },
        { ...validUserCreateDto, id: '333333333333333333', username: 'user3' },
      ];

      for (const user of users) {
        await testHelpers.makeBotRequest('POST', '/internal/users', user);
      }

      // Step 2: Bot can list all users
      const allUsersResponse = await testHelpers.makeBotRequest('GET', '/internal/users');
      expect(allUsersResponse.status).toBe(200);
      expect(allUsersResponse.body).toHaveLength(3);

      // Step 3: Bot can access any specific user
      const specificUserResponse = await testHelpers.makeBotRequest('GET', '/internal/users/222222222222222222');
      expect(specificUserResponse.status).toBe(200);
      expect(specificUserResponse.body.username).toBe('user2');
    });
  });

  describe('Error Handling Across Auth Types', () => {
    it('should handle bot operations on non-existent user', async () => {
      const response = await testHelpers.makeBotRequest('GET', '/internal/users/nonexistent');
      expect(response.status).toBe(404);
    });

    it('should handle user operations with invalid JWT', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/profile')
        .set('Authorization', 'Bearer invalid-jwt-token')
        .expect(401);
    });

    it('should handle unauthenticated requests appropriately', async () => {
      // Bot endpoint without auth
      const botResponse = await testHelpers.makeUnauthenticatedRequest('GET', '/internal/users');
      expect(botResponse.status).toBe(401);

      // User endpoint without auth
      const userResponse = await testHelpers.makeUnauthenticatedRequest('GET', '/api/profile');
      expect(userResponse.status).toBe(401);
    });
  });
});
