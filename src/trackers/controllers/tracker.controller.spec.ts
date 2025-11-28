import { Test, TestingModule } from '@nestjs/testing';
import { TrackerController } from './tracker.controller';
import { TrackerService } from '../services/tracker.service';
import { TrackerSnapshotService } from '../services/tracker-snapshot.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../common/interfaces/user.interface';

const mockTrackerService = {
  registerTrackers: jest.fn(),
  getTrackersByUserId: jest.fn(),
  getTrackersByGuild: jest.fn(),
  getTrackerById: jest.fn(),
  getTrackerSeasons: jest.fn(),
  getScrapingStatus: jest.fn(),
  refreshTrackerData: jest.fn(),
  updateTracker: jest.fn(),
  deleteTracker: jest.fn(),
  addTracker: jest.fn(),
};

const mockSnapshotService = {
  getSnapshotsByTracker: jest.fn(),
  getSnapshotsByTrackerAndSeason: jest.fn(),
  createSnapshot: jest.fn(),
};

describe('TrackerController', () => {
  let controller: TrackerController;
  let trackerService: jest.Mocked<TrackerService>;
  let snapshotService: jest.Mocked<TrackerSnapshotService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrackerController],
      providers: [
        {
          provide: TrackerService,
          useValue: mockTrackerService,
        },
        {
          provide: TrackerSnapshotService,
          useValue: mockSnapshotService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<TrackerController>(TrackerController);
    trackerService = module.get<TrackerService>(
      TrackerService,
    ) as jest.Mocked<TrackerService>;
    snapshotService = module.get<TrackerSnapshotService>(
      TrackerSnapshotService,
    ) as jest.Mocked<TrackerSnapshotService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getTrackers', () => {
    const mockUser: AuthenticatedUser = {
      id: '123456789012345678',
      username: 'testuser',
      globalName: 'Test User',
      avatar: 'avatar_hash',
      email: 'test@example.com',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      lastLoginAt: new Date('2024-01-02'),
    };

    const mockTrackers = [
      {
        id: 'tracker1',
        url: 'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview',
        userId: '123456789012345678',
        isDeleted: false,
        seasons: [],
      },
      {
        id: 'tracker2',
        url: 'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser2/overview',
        userId: '123456789012345678',
        isDeleted: false,
        seasons: [],
      },
    ];

    it('should return trackers by guildId when guildId query parameter is provided', async () => {
      const guildId = '987654321098765432';
      const guildTrackers = [
        {
          id: 'tracker3',
          url: 'https://rocketleague.tracker.network/rocket-league/profile/steam/guilduser/overview',
          userId: '111111111111111111',
          isDeleted: false,
          seasons: [],
        },
      ];

      mockTrackerService.getTrackersByGuild.mockResolvedValue(guildTrackers);

      const result = await controller.getTrackers(guildId, mockUser);

      expect(result).toEqual(guildTrackers);
      expect(trackerService.getTrackersByGuild).toHaveBeenCalledWith(guildId);
      expect(trackerService.getTrackersByGuild).toHaveBeenCalledTimes(1);
      expect(trackerService.getTrackersByUserId).not.toHaveBeenCalled();
    });

    it('should return user trackers when no guildId is provided', async () => {
      mockTrackerService.getTrackersByUserId.mockResolvedValue(mockTrackers);

      const result = await controller.getTrackers(undefined, mockUser);

      expect(result).toEqual(mockTrackers);
      expect(trackerService.getTrackersByUserId).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(trackerService.getTrackersByUserId).toHaveBeenCalledTimes(1);
      expect(trackerService.getTrackersByGuild).not.toHaveBeenCalled();
    });

    it('should call getTrackersByUserId with user.id when guildId is not provided', async () => {
      const differentUser: AuthenticatedUser = {
        id: '999999999999999999',
        username: 'differentuser',
        globalName: 'Different User',
        avatar: 'different_avatar',
        email: 'different@example.com',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        lastLoginAt: new Date('2024-01-02'),
      };
      const userTrackers = [
        {
          id: 'tracker4',
          url: 'https://rocketleague.tracker.network/rocket-league/profile/steam/differentuser/overview',
          userId: '999999999999999999',
          isDeleted: false,
          seasons: [],
        },
      ];

      mockTrackerService.getTrackersByUserId.mockResolvedValue(userTrackers);

      const result = await controller.getTrackers(undefined, differentUser);

      expect(result).toEqual(userTrackers);
      expect(trackerService.getTrackersByUserId).toHaveBeenCalledWith(
        '999999999999999999',
      );
      expect(trackerService.getTrackersByUserId).toHaveBeenCalledTimes(1);
    });
  });
});
