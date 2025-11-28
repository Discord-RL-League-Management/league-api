import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TrackerService } from './tracker.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackerRepository } from '../repositories/tracker.repository';
import { TrackerValidationService } from './tracker-validation.service';
import { TrackerScrapingQueueService } from '../queues/tracker-scraping.queue';
import { TrackerSeasonService } from './tracker-season.service';
import { GamePlatform, Game, TrackerScrapingStatus } from '@prisma/client';

describe('TrackerService', () => {
  let service: TrackerService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      upsert: jest.fn(),
    },
    tracker: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockTrackerRepository = {
    create: jest.fn(),
    findByUrl: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findByGuildId: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    checkUrlUniqueness: jest.fn(),
  };

  const mockValidationService = {
    validateTrackerUrl: jest.fn(),
  };

  const mockScrapingQueueService = {
    addScrapingJob: jest.fn(),
  };

  const mockSeasonService = {
    getSeasonsByTracker: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackerService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: TrackerRepository,
          useValue: mockTrackerRepository,
        },
        {
          provide: TrackerValidationService,
          useValue: mockValidationService,
        },
        {
          provide: TrackerScrapingQueueService,
          useValue: mockScrapingQueueService,
        },
        {
          provide: TrackerSeasonService,
          useValue: mockSeasonService,
        },
      ],
    }).compile();

    service = module.get<TrackerService>(TrackerService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerTrackers', () => {
    const userId = '123456789012345678';
    const validUrl =
      'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';
    const urls = [validUrl];

    const mockTracker = {
      id: 'tracker1',
      url: validUrl,
      game: Game.ROCKET_LEAGUE,
      platform: GamePlatform.STEAM,
      username: 'testuser',
      userId,
      isDeleted: false,
      scrapingStatus: TrackerScrapingStatus.PENDING,
    };

    const mockParsedUrl = {
      platform: GamePlatform.STEAM,
      username: 'testuser',
      game: Game.ROCKET_LEAGUE,
      isValid: true,
    };

    beforeEach(() => {
      // Reset all mocks
      jest.clearAllMocks();
      // Set default return values - getTrackersByUserId uses prisma.tracker.findMany
      mockPrismaService.tracker.findMany.mockResolvedValue([]);
      mockValidationService.validateTrackerUrl.mockResolvedValue(mockParsedUrl);
      mockTrackerRepository.create.mockResolvedValue(mockTracker);
      mockScrapingQueueService.addScrapingJob.mockResolvedValue(undefined);
    });

    it('should create user if user does not exist, then register trackers', async () => {
      // Arrange
      const userData = {
        username: 'testuser',
        globalName: 'Test User',
        avatar: 'avatar_hash',
      };

      // Act
      await service.registerTrackers(userId, urls, userData);

      // Assert
      expect(mockPrismaService.user.upsert).toHaveBeenCalledWith({
        where: { id: userId },
        update: {
          username: 'testuser',
          globalName: 'Test User',
          avatar: 'avatar_hash',
        },
        create: {
          id: userId,
          username: 'testuser',
          globalName: 'Test User',
          avatar: 'avatar_hash',
        },
      });
      expect(mockTrackerRepository.create).toHaveBeenCalled();
    });

    it('should update user info if user exists and userData is provided', async () => {
      // Arrange
      const userData = {
        username: 'updateduser',
        globalName: 'Updated User',
        avatar: 'new_avatar',
      };

      // Act
      await service.registerTrackers(userId, urls, userData);

      // Assert
      expect(mockPrismaService.user.upsert).toHaveBeenCalledWith({
        where: { id: userId },
        update: {
          username: 'updateduser',
          globalName: 'Updated User',
          avatar: 'new_avatar',
        },
        create: {
          id: userId,
          username: 'updateduser',
          globalName: 'Updated User',
          avatar: 'new_avatar',
        },
      });
    });

    it('should register trackers successfully when user already exists', async () => {
      // Arrange
      const userData = {
        username: 'testuser',
        globalName: 'Test User',
        avatar: 'avatar_hash',
      };

      // Act
      const result = await service.registerTrackers(userId, urls, userData);

      // Assert
      expect(mockPrismaService.user.upsert).toHaveBeenCalled();
      expect(mockValidationService.validateTrackerUrl).toHaveBeenCalledWith(
        validUrl,
        userId,
      );
      expect(mockTrackerRepository.create).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockTracker);
    });

    it('should create minimal user (userId as username) when userData is not provided', async () => {
      // Arrange - no userData provided

      // Act
      await service.registerTrackers(userId, urls);

      // Assert
      expect(mockPrismaService.user.upsert).toHaveBeenCalledWith({
        where: { id: userId },
        update: {
          username: userId,
          globalName: null,
          avatar: null,
        },
        create: {
          id: userId,
          username: userId,
          globalName: null,
          avatar: null,
        },
      });
      expect(mockTrackerRepository.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when user already has trackers', async () => {
      // Arrange
      mockPrismaService.tracker.findMany.mockResolvedValue([mockTracker]);
      const userData = { username: 'testuser' };

      // Act & Assert
      await expect(
        service.registerTrackers(userId, urls, userData),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.user.upsert).toHaveBeenCalled();
      expect(mockTrackerRepository.create).not.toHaveBeenCalled();
    });

    it('should validate URLs and check for duplicates', async () => {
      // Arrange
      const duplicateUrls = [validUrl, validUrl];
      const userData = { username: 'testuser' };

      // Act & Assert
      await expect(
        service.registerTrackers(userId, duplicateUrls, userData),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.user.upsert).toHaveBeenCalled();
    });
  });

  describe('addTracker', () => {
    const userId = '123456789012345678';
    const validUrl =
      'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';

    const mockTracker = {
      id: 'tracker1',
      url: validUrl,
      game: Game.ROCKET_LEAGUE,
      platform: GamePlatform.STEAM,
      username: 'testuser',
      userId,
      isDeleted: false,
      scrapingStatus: TrackerScrapingStatus.PENDING,
    };

    const mockParsedUrl = {
      platform: GamePlatform.STEAM,
      username: 'testuser',
      game: Game.ROCKET_LEAGUE,
      isValid: true,
    };

    beforeEach(() => {
      // Reset all mocks
      jest.clearAllMocks();
      // Set default return values - getTrackersByUserId uses prisma.tracker.findMany
      mockPrismaService.tracker.findMany.mockResolvedValue([]);
      mockValidationService.validateTrackerUrl.mockResolvedValue(mockParsedUrl);
      mockTrackerRepository.create.mockResolvedValue(mockTracker);
      mockScrapingQueueService.addScrapingJob.mockResolvedValue(undefined);
    });

    it('should create user if user does not exist, then add tracker', async () => {
      // Arrange
      const userData = {
        username: 'testuser',
        globalName: 'Test User',
        avatar: 'avatar_hash',
      };

      // Act
      await service.addTracker(userId, validUrl, userData);

      // Assert
      expect(mockPrismaService.user.upsert).toHaveBeenCalledWith({
        where: { id: userId },
        update: {
          username: 'testuser',
          globalName: 'Test User',
          avatar: 'avatar_hash',
        },
        create: {
          id: userId,
          username: 'testuser',
          globalName: 'Test User',
          avatar: 'avatar_hash',
        },
      });
      expect(mockTrackerRepository.create).toHaveBeenCalled();
    });

    it('should update user info if user exists and userData is provided', async () => {
      // Arrange
      const userData = {
        username: 'updateduser',
        globalName: 'Updated User',
        avatar: 'new_avatar',
      };

      // Act
      await service.addTracker(userId, validUrl, userData);

      // Assert
      expect(mockPrismaService.user.upsert).toHaveBeenCalledWith({
        where: { id: userId },
        update: {
          username: 'updateduser',
          globalName: 'Updated User',
          avatar: 'new_avatar',
        },
        create: {
          id: userId,
          username: 'updateduser',
          globalName: 'Updated User',
          avatar: 'new_avatar',
        },
      });
    });

    it('should add tracker successfully when user already exists', async () => {
      // Arrange
      const userData = {
        username: 'testuser',
        globalName: 'Test User',
        avatar: 'avatar_hash',
      };

      // Act
      const result = await service.addTracker(userId, validUrl, userData);

      // Assert
      expect(mockPrismaService.user.upsert).toHaveBeenCalled();
      expect(mockValidationService.validateTrackerUrl).toHaveBeenCalledWith(
        validUrl,
        userId,
      );
      expect(mockTrackerRepository.create).toHaveBeenCalled();
      expect(result).toEqual(mockTracker);
    });

    it('should create minimal user when userData is not provided', async () => {
      // Arrange - no userData provided

      // Act
      await service.addTracker(userId, validUrl);

      // Assert
      expect(mockPrismaService.user.upsert).toHaveBeenCalledWith({
        where: { id: userId },
        update: {
          username: userId,
          globalName: null,
          avatar: null,
        },
        create: {
          id: userId,
          username: userId,
          globalName: null,
          avatar: null,
        },
      });
      expect(mockTrackerRepository.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when user has reached maximum trackers', async () => {
      // Arrange
      const existingTrackers = Array(4).fill(mockTracker);
      mockPrismaService.tracker.findMany.mockResolvedValue(existingTrackers);
      const userData = { username: 'testuser' };

      // Act & Assert
      await expect(
        service.addTracker(userId, validUrl, userData),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.user.upsert).toHaveBeenCalled();
      expect(mockTrackerRepository.create).not.toHaveBeenCalled();
    });
  });
});
