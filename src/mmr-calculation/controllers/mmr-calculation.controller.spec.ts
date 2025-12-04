import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MmrCalculationController } from './mmr-calculation.controller';
import { MmrCalculationService } from '../services/mmr-calculation.service';
import { FormulaValidationService } from '../services/formula-validation.service';
import { GuildSettingsService } from '../../guilds/guild-settings.service';
import { SettingsDefaultsService } from '../../guilds/services/settings-defaults.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CalculateMmrDto } from '../dto/calculate-mmr.dto';
import { TrackerData } from '../services/mmr-calculation.service';
import { MmrCalculationConfig } from '../../guilds/interfaces/settings.interface';

const mockMmrService = {
  calculateMmr: jest.fn(),
  testFormula: jest.fn(),
};

const mockFormulaValidation = {
  validateFormula: jest.fn(),
};

const mockGuildSettingsService = {
  getSettings: jest.fn(),
};

const mockSettingsDefaults = {
  getDefaults: jest.fn(),
};

describe('MmrCalculationController', () => {
  let controller: MmrCalculationController;
  let mmrService: jest.Mocked<MmrCalculationService>;
  let guildSettingsService: jest.Mocked<GuildSettingsService>;
  let settingsDefaults: jest.Mocked<SettingsDefaultsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MmrCalculationController],
      providers: [
        {
          provide: MmrCalculationService,
          useValue: mockMmrService,
        },
        {
          provide: FormulaValidationService,
          useValue: mockFormulaValidation,
        },
        {
          provide: GuildSettingsService,
          useValue: mockGuildSettingsService,
        },
        {
          provide: SettingsDefaultsService,
          useValue: mockSettingsDefaults,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<MmrCalculationController>(MmrCalculationController);
    mmrService = module.get<MmrCalculationService>(
      MmrCalculationService,
    ) as jest.Mocked<MmrCalculationService>;
    guildSettingsService = module.get<GuildSettingsService>(
      GuildSettingsService,
    ) as jest.Mocked<GuildSettingsService>;
    settingsDefaults = module.get<SettingsDefaultsService>(
      SettingsDefaultsService,
    ) as jest.Mocked<SettingsDefaultsService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('calculateMmr', () => {
    const guildId = '123456789012345678';
    const trackerData: TrackerData = {
      ones: 1200,
      twos: 1400,
      threes: 1600,
      fours: 1000,
      onesGamesPlayed: 150,
      twosGamesPlayed: 300,
      threesGamesPlayed: 500,
      foursGamesPlayed: 50,
    };

    const defaultConfig: MmrCalculationConfig = {
      algorithm: 'WEIGHTED_AVERAGE',
      weights: {
        ones: 0.1,
        twos: 0.3,
        threes: 0.5,
        fours: 0.1,
      },
    };

    it('should calculate MMR with valid guild ID and tracker data', async () => {
      const guildSettings = {
        mmrCalculation: defaultConfig,
      };
      guildSettingsService.getSettings.mockResolvedValue(guildSettings as any);
      mmrService.calculateMmr.mockReturnValue(1440);

      const dto: CalculateMmrDto = {
        guildId,
        trackerData,
      };

      const result = await controller.calculateMmr(dto);

      expect(guildSettingsService.getSettings).toHaveBeenCalledWith(guildId);
      expect(mmrService.calculateMmr).toHaveBeenCalledWith(
        trackerData,
        defaultConfig,
      );
      expect(result).toEqual({
        result: 1440,
        algorithm: 'WEIGHTED_AVERAGE',
        config: defaultConfig,
      });
    });

    it('should use default config when guild settings do not have mmrCalculation', async () => {
      const guildSettings = {};
      guildSettingsService.getSettings.mockResolvedValue(guildSettings as any);
      settingsDefaults.getDefaults.mockReturnValue({
        mmrCalculation: defaultConfig,
      } as any);
      mmrService.calculateMmr.mockReturnValue(1440);

      const dto: CalculateMmrDto = {
        guildId,
        trackerData,
      };

      const result = await controller.calculateMmr(dto);

      expect(guildSettingsService.getSettings).toHaveBeenCalledWith(guildId);
      expect(settingsDefaults.getDefaults).toHaveBeenCalled();
      expect(mmrService.calculateMmr).toHaveBeenCalledWith(
        trackerData,
        defaultConfig,
      );
      expect(result).toEqual({
        result: 1440,
        algorithm: 'WEIGHTED_AVERAGE',
        config: defaultConfig,
      });
    });

    it('should calculate MMR with PEAK_MMR algorithm', async () => {
      const peakConfig: MmrCalculationConfig = {
        algorithm: 'PEAK_MMR',
      };
      const guildSettings = {
        mmrCalculation: peakConfig,
      };
      guildSettingsService.getSettings.mockResolvedValue(guildSettings as any);
      mmrService.calculateMmr.mockReturnValue(1600);

      const dto: CalculateMmrDto = {
        guildId,
        trackerData,
      };

      const result = await controller.calculateMmr(dto);

      expect(mmrService.calculateMmr).toHaveBeenCalledWith(
        trackerData,
        peakConfig,
      );
      expect(result).toEqual({
        result: 1600,
        algorithm: 'PEAK_MMR',
        config: peakConfig,
      });
    });

    it('should calculate MMR with CUSTOM algorithm', async () => {
      const customConfig: MmrCalculationConfig = {
        algorithm: 'CUSTOM',
        customFormula: '(ones * 0.1 + twos * 0.3 + threes * 0.5 + fours * 0.1)',
      };
      const guildSettings = {
        mmrCalculation: customConfig,
      };
      guildSettingsService.getSettings.mockResolvedValue(guildSettings as any);
      mmrService.calculateMmr.mockReturnValue(1440);

      const dto: CalculateMmrDto = {
        guildId,
        trackerData,
      };

      const result = await controller.calculateMmr(dto);

      expect(mmrService.calculateMmr).toHaveBeenCalledWith(
        trackerData,
        customConfig,
      );
      expect(result).toEqual({
        result: 1440,
        algorithm: 'CUSTOM',
        config: customConfig,
      });
    });

    it('should throw BadRequestException when mmrCalculation config is missing', async () => {
      const guildSettings = {};
      guildSettingsService.getSettings.mockResolvedValue(guildSettings as any);
      settingsDefaults.getDefaults.mockReturnValue({} as any);

      const dto: CalculateMmrDto = {
        guildId,
        trackerData,
      };

      await expect(controller.calculateMmr(dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.calculateMmr(dto)).rejects.toThrow(
        'MMR calculation configuration not found for guild',
      );
    });

    it('should throw BadRequestException when guild is not found', async () => {
      guildSettingsService.getSettings.mockRejectedValue(
        new NotFoundException('Guild not found'),
      );

      const dto: CalculateMmrDto = {
        guildId: 'invalid',
        trackerData,
      };

      await expect(controller.calculateMmr(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when MMR calculation fails', async () => {
      const guildSettings = {
        mmrCalculation: defaultConfig,
      };
      guildSettingsService.getSettings.mockResolvedValue(guildSettings as any);
      mmrService.calculateMmr.mockImplementation(() => {
        throw new BadRequestException('Invalid tracker data');
      });

      const dto: CalculateMmrDto = {
        guildId,
        trackerData,
      };

      await expect(controller.calculateMmr(dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.calculateMmr(dto)).rejects.toThrow(
        'Invalid tracker data',
      );
    });

    it('should handle generic errors gracefully', async () => {
      const guildSettings = {
        mmrCalculation: defaultConfig,
      };
      guildSettingsService.getSettings.mockResolvedValue(guildSettings as any);
      mmrService.calculateMmr.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const dto: CalculateMmrDto = {
        guildId,
        trackerData,
      };

      await expect(controller.calculateMmr(dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.calculateMmr(dto)).rejects.toThrow(
        'Failed to calculate MMR',
      );
    });
  });
});
