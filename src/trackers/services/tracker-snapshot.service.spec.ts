import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TrackerSnapshotService } from './tracker-snapshot.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackerSnapshotRepository } from '../repositories/tracker-snapshot.repository';
import { TrackerRepository } from '../repositories/tracker.repository';
import { VisibilityService } from '../../infrastructure/visibility/services/visibility.service';

const mockPrismaService = {};

const mockSnapshotRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findByTrackerId: jest.fn(),
  findByTrackerIdAndSeason: jest.fn(),
  findByGuildId: jest.fn(),
};

const mockTrackerRepository = {
  findById: jest.fn(),
};

const mockVisibilityService = {
  addVisibility: jest.fn(),
  removeVisibility: jest.fn(),
};

describe('TrackerSnapshotService', () => {
  let service: TrackerSnapshotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackerSnapshotService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: TrackerSnapshotRepository,
          useValue: mockSnapshotRepository,
        },
        {
          provide: TrackerRepository,
          useValue: mockTrackerRepository,
        },
        {
          provide: VisibilityService,
          useValue: mockVisibilityService,
        },
      ],
    }).compile();

    service = module.get<TrackerSnapshotService>(TrackerSnapshotService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSnapshot', () => {
    const trackerId = 'tracker123';
    const enteredBy = 'user123';
    const snapshotData = {
      capturedAt: new Date('2024-01-01'),
      seasonNumber: 1,
      ones: 1000,
      twos: 1200,
      threes: 1400,
      fours: 1600,
      onesGamesPlayed: 50,
      twosGamesPlayed: 60,
      threesGamesPlayed: 70,
      foursGamesPlayed: 80,
    };

    const mockTracker = {
      id: trackerId,
      userId: 'user123',
      isDeleted: false,
    };

    const mockSnapshot = {
      id: 'snapshot123',
      trackerId,
      enteredBy,
      ...snapshotData,
    };

    it('should successfully create a snapshot when tracker exists and is not deleted', async () => {
      mockTrackerRepository.findById.mockResolvedValue(mockTracker);
      mockSnapshotRepository.create.mockResolvedValue(mockSnapshot);

      const result = await service.createSnapshot(
        trackerId,
        enteredBy,
        snapshotData,
      );

      expect(result).toEqual(mockSnapshot);
      expect(mockTrackerRepository.findById).toHaveBeenCalledWith(trackerId);
      expect(mockSnapshotRepository.create).toHaveBeenCalledWith({
        trackerId,
        enteredBy,
        ...snapshotData,
      });
    });

    it('should create snapshot with guild visibility when guildIds are provided', async () => {
      const guildIds = ['guild1', 'guild2'];
      const snapshotWithGuilds = {
        ...mockSnapshot,
        guildIds,
      };

      mockTrackerRepository.findById.mockResolvedValue(mockTracker);
      mockSnapshotRepository.create.mockResolvedValue(snapshotWithGuilds);
      mockVisibilityService.addVisibility.mockResolvedValue(undefined);

      const result = await service.createSnapshot(trackerId, enteredBy, {
        ...snapshotData,
        guildIds,
      });

      expect(result).toEqual(snapshotWithGuilds);
      expect(mockVisibilityService.addVisibility).toHaveBeenCalledTimes(2);
      expect(mockVisibilityService.addVisibility).toHaveBeenCalledWith(
        'tracker_snapshot',
        snapshotWithGuilds.id,
        'guild',
        'guild1',
      );
      expect(mockVisibilityService.addVisibility).toHaveBeenCalledWith(
        'tracker_snapshot',
        snapshotWithGuilds.id,
        'guild',
        'guild2',
      );
    });

    it('should not add guild visibility when guildIds array is empty', async () => {
      mockTrackerRepository.findById.mockResolvedValue(mockTracker);
      mockSnapshotRepository.create.mockResolvedValue(mockSnapshot);

      await service.createSnapshot(trackerId, enteredBy, {
        ...snapshotData,
        guildIds: [],
      });

      expect(mockVisibilityService.addVisibility).not.toHaveBeenCalled();
    });

    it('should not add guild visibility when guildIds is undefined', async () => {
      mockTrackerRepository.findById.mockResolvedValue(mockTracker);
      mockSnapshotRepository.create.mockResolvedValue(mockSnapshot);

      await service.createSnapshot(trackerId, enteredBy, snapshotData);

      expect(mockVisibilityService.addVisibility).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when tracker does not exist', async () => {
      mockTrackerRepository.findById.mockResolvedValue(null);

      await expect(
        service.createSnapshot(trackerId, enteredBy, snapshotData),
      ).rejects.toThrow(NotFoundException);
      expect(mockTrackerRepository.findById).toHaveBeenCalledWith(trackerId);
      expect(mockSnapshotRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when tracker is deleted', async () => {
      const deletedTracker = {
        ...mockTracker,
        isDeleted: true,
      };
      mockTrackerRepository.findById.mockResolvedValue(deletedTracker);

      await expect(
        service.createSnapshot(trackerId, enteredBy, snapshotData),
      ).rejects.toThrow(BadRequestException);
      expect(mockTrackerRepository.findById).toHaveBeenCalledWith(trackerId);
      expect(mockSnapshotRepository.create).not.toHaveBeenCalled();
    });

    it('should create snapshot with minimal required data', async () => {
      const minimalData = {};
      const minimalSnapshot = {
        id: 'snapshot456',
        trackerId,
        enteredBy,
      };

      mockTrackerRepository.findById.mockResolvedValue(mockTracker);
      mockSnapshotRepository.create.mockResolvedValue(minimalSnapshot);

      const result = await service.createSnapshot(
        trackerId,
        enteredBy,
        minimalData,
      );

      expect(result).toEqual(minimalSnapshot);
      expect(mockSnapshotRepository.create).toHaveBeenCalledWith({
        trackerId,
        enteredBy,
      });
    });
  });

  describe('getSnapshotById', () => {
    const snapshotId = 'snapshot123';
    const mockSnapshot = {
      id: snapshotId,
      trackerId: 'tracker123',
      enteredBy: 'user123',
      capturedAt: new Date('2024-01-01'),
    };

    it('should successfully return snapshot when it exists', async () => {
      mockSnapshotRepository.findById.mockResolvedValue(mockSnapshot);

      const result = await service.getSnapshotById(snapshotId);

      expect(result).toEqual(mockSnapshot);
      expect(mockSnapshotRepository.findById).toHaveBeenCalledWith(snapshotId);
    });

    it('should throw NotFoundException when snapshot does not exist', async () => {
      mockSnapshotRepository.findById.mockResolvedValue(null);

      await expect(service.getSnapshotById(snapshotId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockSnapshotRepository.findById).toHaveBeenCalledWith(snapshotId);
    });
  });

  describe('getSnapshotsByTracker', () => {
    const trackerId = 'tracker123';
    const mockTracker = {
      id: trackerId,
      userId: 'user123',
      isDeleted: false,
    };
    const mockSnapshots = [
      {
        id: 'snapshot1',
        trackerId,
        capturedAt: new Date('2024-01-01'),
      },
      {
        id: 'snapshot2',
        trackerId,
        capturedAt: new Date('2024-01-02'),
      },
    ];

    it('should successfully return snapshots when tracker exists', async () => {
      mockTrackerRepository.findById.mockResolvedValue(mockTracker);
      mockSnapshotRepository.findByTrackerId.mockResolvedValue(mockSnapshots);

      const result = await service.getSnapshotsByTracker(trackerId);

      expect(result).toEqual(mockSnapshots);
      expect(mockTrackerRepository.findById).toHaveBeenCalledWith(trackerId);
      expect(mockSnapshotRepository.findByTrackerId).toHaveBeenCalledWith(
        trackerId,
      );
    });

    it('should throw NotFoundException when tracker does not exist', async () => {
      mockTrackerRepository.findById.mockResolvedValue(null);

      await expect(service.getSnapshotsByTracker(trackerId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockTrackerRepository.findById).toHaveBeenCalledWith(trackerId);
      expect(mockSnapshotRepository.findByTrackerId).not.toHaveBeenCalled();
    });

    it('should return empty array when tracker has no snapshots', async () => {
      mockTrackerRepository.findById.mockResolvedValue(mockTracker);
      mockSnapshotRepository.findByTrackerId.mockResolvedValue([]);

      const result = await service.getSnapshotsByTracker(trackerId);

      expect(result).toEqual([]);
      expect(mockSnapshotRepository.findByTrackerId).toHaveBeenCalledWith(
        trackerId,
      );
    });
  });

  describe('getSnapshotsByTrackerAndSeason', () => {
    const trackerId = 'tracker123';
    const seasonNumber = 1;
    const mockTracker = {
      id: trackerId,
      userId: 'user123',
      isDeleted: false,
    };
    const mockSnapshots = [
      {
        id: 'snapshot1',
        trackerId,
        seasonNumber: 1,
        capturedAt: new Date('2024-01-01'),
      },
      {
        id: 'snapshot2',
        trackerId,
        seasonNumber: 1,
        capturedAt: new Date('2024-01-02'),
      },
    ];

    it('should successfully return snapshots filtered by season when tracker exists', async () => {
      mockTrackerRepository.findById.mockResolvedValue(mockTracker);
      mockSnapshotRepository.findByTrackerIdAndSeason.mockResolvedValue(
        mockSnapshots,
      );

      const result = await service.getSnapshotsByTrackerAndSeason(
        trackerId,
        seasonNumber,
      );

      expect(result).toEqual(mockSnapshots);
      expect(mockTrackerRepository.findById).toHaveBeenCalledWith(trackerId);
      expect(
        mockSnapshotRepository.findByTrackerIdAndSeason,
      ).toHaveBeenCalledWith(trackerId, seasonNumber);
    });

    it('should throw NotFoundException when tracker does not exist', async () => {
      mockTrackerRepository.findById.mockResolvedValue(null);

      await expect(
        service.getSnapshotsByTrackerAndSeason(trackerId, seasonNumber),
      ).rejects.toThrow(NotFoundException);
      expect(mockTrackerRepository.findById).toHaveBeenCalledWith(trackerId);
      expect(
        mockSnapshotRepository.findByTrackerIdAndSeason,
      ).not.toHaveBeenCalled();
    });

    it('should return empty array when no snapshots exist for the season', async () => {
      mockTrackerRepository.findById.mockResolvedValue(mockTracker);
      mockSnapshotRepository.findByTrackerIdAndSeason.mockResolvedValue([]);

      const result = await service.getSnapshotsByTrackerAndSeason(
        trackerId,
        seasonNumber,
      );

      expect(result).toEqual([]);
      expect(
        mockSnapshotRepository.findByTrackerIdAndSeason,
      ).toHaveBeenCalledWith(trackerId, seasonNumber);
    });
  });

  describe('getSnapshotsByGuild', () => {
    const guildId = 'guild123';
    const mockSnapshots = [
      {
        id: 'snapshot1',
        trackerId: 'tracker1',
        capturedAt: new Date('2024-01-01'),
      },
      {
        id: 'snapshot2',
        trackerId: 'tracker2',
        capturedAt: new Date('2024-01-02'),
      },
    ];

    it('should successfully return snapshots visible to the guild', async () => {
      mockSnapshotRepository.findByGuildId.mockResolvedValue(mockSnapshots);

      const result = await service.getSnapshotsByGuild(guildId);

      expect(result).toEqual(mockSnapshots);
      expect(mockSnapshotRepository.findByGuildId).toHaveBeenCalledWith(
        guildId,
      );
    });

    it('should return empty array when guild has no visible snapshots', async () => {
      mockSnapshotRepository.findByGuildId.mockResolvedValue([]);

      const result = await service.getSnapshotsByGuild(guildId);

      expect(result).toEqual([]);
      expect(mockSnapshotRepository.findByGuildId).toHaveBeenCalledWith(
        guildId,
      );
    });
  });

  describe('addGuildVisibility', () => {
    const snapshotId = 'snapshot123';
    const guildId = 'guild123';
    const mockSnapshot = {
      id: snapshotId,
      trackerId: 'tracker123',
      enteredBy: 'user123',
    };

    it('should successfully add guild visibility to existing snapshot', async () => {
      mockSnapshotRepository.findById.mockResolvedValue(mockSnapshot);
      mockVisibilityService.addVisibility.mockResolvedValue(undefined);

      await service.addGuildVisibility(snapshotId, guildId);

      expect(mockSnapshotRepository.findById).toHaveBeenCalledWith(snapshotId);
      expect(mockVisibilityService.addVisibility).toHaveBeenCalledWith(
        'tracker_snapshot',
        snapshotId,
        'guild',
        guildId,
      );
    });

    it('should throw NotFoundException when snapshot does not exist', async () => {
      mockSnapshotRepository.findById.mockResolvedValue(null);

      await expect(
        service.addGuildVisibility(snapshotId, guildId),
      ).rejects.toThrow(NotFoundException);
      expect(mockSnapshotRepository.findById).toHaveBeenCalledWith(snapshotId);
      expect(mockVisibilityService.addVisibility).not.toHaveBeenCalled();
    });
  });

  describe('removeGuildVisibility', () => {
    const snapshotId = 'snapshot123';
    const guildId = 'guild123';
    const mockSnapshot = {
      id: snapshotId,
      trackerId: 'tracker123',
      enteredBy: 'user123',
    };

    it('should successfully remove guild visibility from existing snapshot', async () => {
      mockSnapshotRepository.findById.mockResolvedValue(mockSnapshot);
      mockVisibilityService.removeVisibility.mockResolvedValue(undefined);

      await service.removeGuildVisibility(snapshotId, guildId);

      expect(mockSnapshotRepository.findById).toHaveBeenCalledWith(snapshotId);
      expect(mockVisibilityService.removeVisibility).toHaveBeenCalledWith(
        'tracker_snapshot',
        snapshotId,
        'guild',
        guildId,
      );
    });

    it('should throw NotFoundException when snapshot does not exist', async () => {
      mockSnapshotRepository.findById.mockResolvedValue(null);

      await expect(
        service.removeGuildVisibility(snapshotId, guildId),
      ).rejects.toThrow(NotFoundException);
      expect(mockSnapshotRepository.findById).toHaveBeenCalledWith(snapshotId);
      expect(mockVisibilityService.removeVisibility).not.toHaveBeenCalled();
    });
  });
});
