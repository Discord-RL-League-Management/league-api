import { User, UserCreateDto, UserProfile, UserStats } from '../../src/common/interfaces/user.interface';

/**
 * User Fixtures - Predefined test user data for common scenarios
 * 
 * Reusable across unit and e2e tests for consistent test data
 */

export const validUser: User = {
  id: '123456789012345678',
  username: 'validuser',
  discriminator: '1234',
  globalName: 'Valid User',
  avatar: 'valid_avatar_hash',
  email: 'valid@example.com',
  accessToken: 'valid_access_token',
  refreshToken: 'valid_refresh_token',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  lastLoginAt: new Date('2024-01-01T00:00:00.000Z'),
};

export const userWithoutEmail: User = {
  id: '987654321098765432',
  username: 'noemailuser',
  discriminator: '5678',
  globalName: 'No Email User',
  avatar: 'no_email_avatar',
  email: undefined,
  accessToken: 'no_email_access_token',
  refreshToken: 'no_email_refresh_token',
  createdAt: new Date('2024-01-02T00:00:00.000Z'),
  updatedAt: new Date('2024-01-02T00:00:00.000Z'),
  lastLoginAt: new Date('2024-01-02T00:00:00.000Z'),
};

export const discordUserData = {
  discordId: '111111111111111111',
  username: 'discorduser',
  discriminator: '9999',
  globalName: 'Discord User',
  avatar: 'discord_avatar_hash',
  email: 'discord@example.com',
  accessToken: 'discord_access_token',
  refreshToken: 'discord_refresh_token',
};

export const validUserCreateDto: UserCreateDto = {
  id: '222222222222222222',
  username: 'newuser',
  discriminator: '0000',
  globalName: 'New User',
  avatar: 'new_avatar_hash',
  email: 'new@example.com',
  accessToken: 'new_access_token',
  refreshToken: 'new_refresh_token',
};

export const validUserProfile: UserProfile = {
  id: '333333333333333333',
  username: 'profileuser',
  globalName: 'Profile User',
  avatar: 'profile_avatar_hash',
  email: 'profile@example.com',
  createdAt: new Date('2024-01-03T00:00:00.000Z'),
  lastLoginAt: new Date('2024-01-03T00:00:00.000Z'),
};

export const validUserStats: UserStats = {
  userId: '444444444444444444',
  gamesPlayed: 25,
  wins: 18,
  losses: 7,
  winRate: 0.72,
};

export const testUsers = [
  validUser,
  userWithoutEmail,
  {
    id: '555555555555555555',
    username: 'testuser3',
    discriminator: '3333',
    globalName: 'Test User 3',
    avatar: 'test3_avatar',
    email: 'test3@example.com',
    accessToken: 'test3_access_token',
    refreshToken: 'test3_refresh_token',
    createdAt: new Date('2024-01-04T00:00:00.000Z'),
    updatedAt: new Date('2024-01-04T00:00:00.000Z'),
    lastLoginAt: new Date('2024-01-04T00:00:00.000Z'),
  },
];

export const invalidUserIds = [
  'invalid',
  '123',
  'not-a-snowflake',
  '',
  null,
  undefined,
];

export const invalidEmails = [
  'not-an-email',
  '@example.com',
  'test@',
  'test.example.com',
  '',
];

export const validApiKey = '2b2b3d4b5ca4d61eb461886d4cd65d1a9b6000fd2c23bacf727056d38ecb6e32';
export const invalidApiKey = 'invalid-api-key';

export const validJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwMTIzNDU2Nzg5IiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
export const invalidJwtToken = 'invalid.jwt.token';
