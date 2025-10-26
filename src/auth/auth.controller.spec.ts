import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let mockResponse: Partial<Response>;

  const mockUser = {
    id: '123456789012345678',
    username: 'testuser',
    discriminator: '1234',
    globalName: 'Test User',
    avatar: 'avatar_hash',
    email: 'test@example.com',
    accessToken: 'access_token',
    refreshToken: 'refresh_token',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  const mockJwtResponse = {
    access_token: 'jwt_token_here',
    user: {
      id: mockUser.id,
      username: mockUser.username,
    },
  };

  beforeEach(async () => {
    const mockAuthService = {
      generateJwt: jest.fn(),
    };

    mockResponse = {
      redirect: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  describe('discordLogin', () => {
    it('should initiate Discord OAuth flow (no return value expected)', () => {
      // Act
      const result = controller.discordLogin();

      // Assert
      expect(result).toBeUndefined();
      // The actual OAuth initiation is handled by the AuthGuard('discord')
    });
  });

  describe('discordCallback', () => {
    it('should generate JWT and redirect to frontend with token', async () => {
      // Arrange
      const mockRequest = { user: mockUser };
      authService.generateJwt.mockResolvedValue(mockJwtResponse);
      process.env.FRONTEND_URL = 'http://localhost:5173';

      // Act
      await controller.discordCallback(mockRequest, mockResponse as Response);

      // Assert
      expect(authService.generateJwt).toHaveBeenCalledWith(mockUser);
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        `${process.env.FRONTEND_URL}/auth/callback?token=${mockJwtResponse.access_token}`
      );
    });

    it('should handle missing user in request', async () => {
      // Arrange
      const mockRequest = { user: null };

      // Act
      await controller.discordCallback(mockRequest, mockResponse as Response);

      // Assert
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/error?error=no_user')
      );
    });

    it('should handle JWT generation failure', async () => {
      // Arrange
      const mockRequest = { user: mockUser };
      authService.generateJwt.mockRejectedValue(new Error('JWT generation failed'));

      // Act
      await controller.discordCallback(mockRequest, mockResponse as Response);

      // Assert
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/error?error=jwt_failed')
      );
    });
  });

  describe('getCurrentUser', () => {
    it('should return authenticated user', () => {
      // Act
      const result = controller.getCurrentUser(mockUser);

      // Assert
      expect(result).toEqual(mockUser);
    });

    it('should return user with different data', () => {
      // Arrange
      const differentUser = { ...mockUser, username: 'differentuser' };

      // Act
      const result = controller.getCurrentUser(differentUser);

      // Assert
      expect(result).toEqual(differentUser);
    });
  });
});
