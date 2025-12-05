/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserGuildsService } from '../user-guilds/user-guilds.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: '123456789012345678',
    username: 'testuser',
    discriminator: '1234',
    globalName: 'Test User',
    avatar: 'avatar_hash',
    email: 'test@example.com',
    accessToken: 'access_token',
    refreshToken: 'refresh_token',
    isBanned: false,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  const mockDiscordData = {
    discordId: '123456789012345678',
    username: 'testuser',
    discriminator: '1234',
    globalName: 'Test User',
    avatar: 'avatar_hash',
    email: 'test@example.com',
    accessToken: 'access_token',
    refreshToken: 'refresh_token',
  };

  beforeEach(async () => {
    const mockUsersService = {
      findOne: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
    };

    const mockUserGuildsService = {
      getUserAvailableGuildsWithPermissions: jest.fn().mockResolvedValue([]),
      completeOAuthFlow: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: UserGuildsService,
          useValue: mockUserGuildsService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  describe('validateDiscordUser', () => {
    it('should update existing user and return user with updated lastLoginAt', async () => {
      // Arrange
      const updatedUser = { ...mockUser, lastLoginAt: new Date() };
      usersService.findOne.mockResolvedValue(mockUser);
      usersService.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.validateDiscordUser(mockDiscordData);

      // Assert
      expect(result).toEqual(updatedUser);
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('should create new user when user does not exist', async () => {
      // Arrange
      usersService.findOne.mockRejectedValue(
        new NotFoundException('User not found'),
      );
      usersService.create.mockResolvedValue(mockUser);

      // Act
      const result = await service.validateDiscordUser(mockDiscordData);

      // Assert
      expect(result).toEqual(mockUser);
      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('should propagate non-NotFoundException errors', async () => {
      // Arrange
      const databaseError = new Error('Database connection failed');
      usersService.findOne.mockRejectedValue(databaseError);

      // Act & Assert
      await expect(
        service.validateDiscordUser(mockDiscordData),
      ).rejects.toThrow('Database connection failed');
      expect(usersService.create).not.toHaveBeenCalled();
      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('should handle user creation failure', async () => {
      // Arrange
      usersService.findOne.mockRejectedValue(
        new NotFoundException('User not found'),
      );
      usersService.create.mockRejectedValue(
        new Error('Database constraint violation'),
      );

      // Act & Assert
      await expect(
        service.validateDiscordUser(mockDiscordData),
      ).rejects.toThrow('Database constraint violation');
    });
  });

  describe('generateJwt', () => {
    it('should generate JWT token with correct payload and return token object', () => {
      // Arrange
      const user = { id: '123456789012345678', username: 'testuser' };
      const mockToken = 'jwt_token_here';
      jwtService.sign.mockReturnValue(mockToken);

      // Act
      const result = service.generateJwt(user);

      // Assert
      expect(result).toEqual({
        access_token: mockToken,
        user: {
          id: user.id,
          username: user.username,
        },
      });
    });

    it('should handle missing user data', () => {
      // Arrange
      const invalidUser = { id: '', username: '' };
      const mockToken = 'jwt_token_here';
      jwtService.sign.mockReturnValue(mockToken);

      // Act
      const result = service.generateJwt(invalidUser);

      // Assert
      expect(result.access_token).toBeDefined();
      expect(result.user).toEqual({
        id: '',
        username: '',
      });
    });
  });
});
