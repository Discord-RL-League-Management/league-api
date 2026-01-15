/**
 * InternalLeaguesController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { InternalLeaguesController } from './internal-leagues.controller';
import { LeaguesService } from './leagues.service';
import { LeagueSettingsService } from './league-settings.service';
import { CreateLeagueDto } from './dto/create-league.dto';
import { UpdateLeagueDto } from './dto/update-league.dto';
import { LeagueSettingsDto } from './dto/league-settings.dto';

describe('InternalLeaguesController', () => {
  let controller: InternalLeaguesController;
  let mockLeaguesService: LeaguesService;
  let mockLeagueSettingsService: LeagueSettingsService;

  const mockLeague = {
    id: 'league_123',
    name: 'Test League',
    description: 'Test Description',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockLeaguesService = {
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    } as unknown as LeaguesService;

    mockLeagueSettingsService = {
      getSettings: vi.fn(),
      updateSettings: vi.fn(),
    } as unknown as LeagueSettingsService;

    const module = await Test.createTestingModule({
      controllers: [InternalLeaguesController],
      providers: [
        { provide: LeaguesService, useValue: mockLeaguesService },
        {
          provide: LeagueSettingsService,
          useValue: mockLeagueSettingsService,
        },
      ],
    }).compile();

    controller = module.get<InternalLeaguesController>(
      InternalLeaguesController,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findOne', () => {
    it('should_return_league_when_exists', async () => {
      vi.spyOn(mockLeaguesService, 'findOne').mockResolvedValue(
        mockLeague as never,
      );

      const result = await controller.findOne('league_123');

      expect(result).toEqual(mockLeague);
      expect(mockLeaguesService.findOne).toHaveBeenCalledWith('league_123');
    });
  });

  describe('create', () => {
    it('should_create_league_when_valid_data_provided', async () => {
      const createDto: CreateLeagueDto & { createdBy: string } = {
        name: 'Test League',
        description: 'Test Description',
        createdBy: 'bot_123',
      };
      vi.spyOn(mockLeaguesService, 'create').mockResolvedValue(
        mockLeague as never,
      );

      const result = await controller.create(createDto);

      expect(result).toEqual(mockLeague);
      expect(mockLeaguesService.create).toHaveBeenCalledWith(
        createDto,
        'bot_123',
      );
    });

    it('should_use_bot_as_default_created_by_when_not_provided', async () => {
      const createDto: CreateLeagueDto & { createdBy?: string } = {
        name: 'Test League',
        description: 'Test Description',
      };
      vi.spyOn(mockLeaguesService, 'create').mockResolvedValue(
        mockLeague as never,
      );

      await controller.create(createDto);

      expect(mockLeaguesService.create).toHaveBeenCalledWith(createDto, 'bot');
    });
  });

  describe('update', () => {
    it('should_update_league_when_exists', async () => {
      const updateDto: UpdateLeagueDto = { name: 'Updated League' };
      vi.spyOn(mockLeaguesService, 'update').mockResolvedValue({
        ...mockLeague,
        ...updateDto,
      } as never);

      const result = await controller.update('league_123', updateDto);

      expect(result.name).toBe('Updated League');
      expect(mockLeaguesService.update).toHaveBeenCalledWith(
        'league_123',
        updateDto,
      );
    });
  });

  describe('remove', () => {
    it('should_delete_league_when_exists', async () => {
      vi.spyOn(mockLeaguesService, 'remove').mockResolvedValue(
        undefined as never,
      );

      await controller.remove('league_123');

      expect(mockLeaguesService.remove).toHaveBeenCalledWith('league_123');
    });
  });

  describe('getSettings', () => {
    it('should_return_league_settings_when_exists', async () => {
      const mockSettings = {
        mmrCalculation: { algorithm: 'WEIGHTED_AVERAGE' },
      };
      vi.spyOn(mockLeagueSettingsService, 'getSettings').mockResolvedValue(
        mockSettings as never,
      );

      const result = await controller.getSettings('league_123');

      expect(result).toEqual(mockSettings);
      expect(mockLeagueSettingsService.getSettings).toHaveBeenCalledWith(
        'league_123',
      );
    });
  });

  describe('updateSettings', () => {
    it('should_update_league_settings_when_valid', async () => {
      const settingsDto: LeagueSettingsDto = {
        mmrCalculation: { algorithm: 'PEAK_MMR' },
      };
      vi.spyOn(mockLeagueSettingsService, 'updateSettings').mockResolvedValue(
        settingsDto as never,
      );

      const result = await controller.updateSettings('league_123', settingsDto);

      expect(result).toEqual(settingsDto);
      expect(mockLeagueSettingsService.updateSettings).toHaveBeenCalledWith(
        'league_123',
        settingsDto,
      );
    });
  });
});
