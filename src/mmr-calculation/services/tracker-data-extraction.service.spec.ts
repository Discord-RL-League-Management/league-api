import { Test, TestingModule } from '@nestjs/testing';
import { TrackerDataExtractionService } from './tracker-data-extraction.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('TrackerDataExtractionService', () => {
  let service: TrackerDataExtractionService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackerDataExtractionService,
        {
          provide: PrismaService,
          useValue: {
            trackerSeason: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TrackerDataExtractionService>(
      TrackerDataExtractionService,
    );
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractTrackerData', () => {
    // INPUT: Valid tracker data
    it('should extract tracker data from latest season', async () => {
      const mockSeason = {
        playlist1v1: { rating: 1200, matchesPlayed: 150 },
        playlist2v2: { rating: 1400, matchesPlayed: 300 },
        playlist3v3: { rating: 1600, matchesPlayed: 500 },
        playlist4v4: { rating: 1000, matchesPlayed: 50 },
      };

      (prisma.trackerSeason.findFirst as jest.Mock).mockResolvedValue(
        mockSeason,
      );

      const result = await service.extractTrackerData('tracker-123');

      expect(result).toEqual({
        ones: 1200,
        twos: 1400,
        threes: 1600,
        fours: 1000,
        onesGamesPlayed: 150,
        twosGamesPlayed: 300,
        threesGamesPlayed: 500,
        foursGamesPlayed: 50,
      });
    });

    // OUTPUT: Handle missing season
    it('should return null when no season data exists', async () => {
      (prisma.trackerSeason.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.extractTrackerData('tracker-123');

      expect(result).toBeNull();
    });

    // PROTECTION: Handle missing playlist data
    it('should handle missing playlist data gracefully', async () => {
      const mockSeason = {
        playlist1v1: null,
        playlist2v2: { rating: 1400, matchesPlayed: 300 },
        playlist3v3: null,
        playlist4v4: { rating: 1000, matchesPlayed: 50 },
      };

      (prisma.trackerSeason.findFirst as jest.Mock).mockResolvedValue(
        mockSeason,
      );

      const result = await service.extractTrackerData('tracker-123');

      expect(result).toEqual({
        ones: undefined,
        twos: 1400,
        threes: undefined,
        fours: 1000,
        onesGamesPlayed: undefined,
        twosGamesPlayed: 300,
        threesGamesPlayed: undefined,
        foursGamesPlayed: 50,
      });
    });

    // PROTECTION: Handle null rating/matchesPlayed
    it('should handle null rating and matchesPlayed values', async () => {
      const mockSeason = {
        playlist1v1: { rating: null, matchesPlayed: null },
        playlist2v2: { rating: 1400, matchesPlayed: 300 },
      };

      (prisma.trackerSeason.findFirst as jest.Mock).mockResolvedValue(
        mockSeason,
      );

      const result = await service.extractTrackerData('tracker-123');

      expect(result).toEqual({
        ones: undefined,
        twos: 1400,
        threes: undefined,
        fours: undefined,
        onesGamesPlayed: undefined,
        twosGamesPlayed: 300,
        threesGamesPlayed: undefined,
        foursGamesPlayed: undefined,
      });
    });

    // PROTECTION: Handle database errors
    it('should return null on database error', async () => {
      (prisma.trackerSeason.findFirst as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.extractTrackerData('tracker-123');

      expect(result).toBeNull();
    });

    // INPUT: Test invalid tracker ID
    it('should handle invalid tracker ID gracefully', async () => {
      (prisma.trackerSeason.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.extractTrackerData('invalid-id');

      expect(result).toBeNull();
    });
  });
});
