import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../users/users.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: jest.Mocked<UsersService>;

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

  const validPayload = {
    sub: '123456789012345678',
    username: 'testuser',
  };

  beforeEach(async () => {
    const mockUsersService = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    usersService = module.get(UsersService);
  });

  describe('validate', () => {
    it('should return user when valid payload with existing user', async () => {
      // Arrange
      usersService.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(validPayload);

      // Assert
      expect(usersService.findOne).toHaveBeenCalledWith(validPayload.sub);
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      // Arrange
      usersService.findOne.mockRejectedValue(new Error('User not found'));

      // Act & Assert
      await expect(strategy.validate(validPayload)).rejects.toThrow(
        'User not found',
      );
      expect(usersService.findOne).toHaveBeenCalledWith(validPayload.sub);
    });

    it('should throw UnauthorizedException when user service returns null', async () => {
      // Arrange
      usersService.findOne.mockResolvedValue(null as any);

      // Act & Assert
      await expect(strategy.validate(validPayload)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(usersService.findOne).toHaveBeenCalledWith(validPayload.sub);
    });

    it('should handle different user IDs', async () => {
      // Arrange
      const differentPayload = {
        sub: '987654321098765432',
        username: 'differentuser',
      };
      const differentUser = {
        ...mockUser,
        id: differentPayload.sub,
        username: differentPayload.username,
      };
      usersService.findOne.mockResolvedValue(differentUser);

      // Act
      const result = await strategy.validate(differentPayload);

      // Assert
      expect(usersService.findOne).toHaveBeenCalledWith(differentPayload.sub);
      expect(result).toEqual(differentUser);
    });

    it('should propagate database errors other than user not found', async () => {
      // Arrange
      const databaseError = new Error('Database connection failed');
      usersService.findOne.mockRejectedValue(databaseError);

      // Act & Assert
      await expect(strategy.validate(validPayload)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle empty payload', async () => {
      // Arrange
      const emptyPayload = { sub: '', username: '' };
      usersService.findOne.mockRejectedValue(new Error('User not found'));

      // Act & Assert
      await expect(strategy.validate(emptyPayload)).rejects.toThrow(
        'User not found',
      );
      expect(usersService.findOne).toHaveBeenCalledWith('');
    });
  });
});
