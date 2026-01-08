/**
 * SettingsValidationService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SettingsValidationService } from './settings-validation.service';
import { DiscordBotService } from '../../discord/discord-bot.service';
import { FormulaValidationService } from '../../formula-validation/services/formula-validation/formula-validation.service';
import { GuildSettingsDto } from '../dto/guild-settings.dto';

describe('SettingsValidationService', () => {
  let service: SettingsValidationService;
  let mockDiscordBotService: DiscordBotService;
  let mockFormulaValidationService: FormulaValidationService;

  const guildId = 'guild-123';

  beforeEach(async () => {
    mockDiscordBotService = {
      validateChannelId: vi.fn(),
    } as unknown as DiscordBotService;

    mockFormulaValidationService = {
      validateFormula: vi.fn(),
    } as unknown as FormulaValidationService;

    const moduleRef = await Test.createTestingModule({
      providers: [
        SettingsValidationService,
        { provide: DiscordBotService, useValue: mockDiscordBotService },
        {
          provide: FormulaValidationService,
          useValue: mockFormulaValidationService,
        },
      ],
    }).compile();

    service = moduleRef.get<SettingsValidationService>(
      SettingsValidationService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validate', () => {
    it('should_pass_validation_when_valid_settings_provided', async () => {
      const settings: GuildSettingsDto = {
        bot_command_channels: [{ id: '12345678901234567', name: 'commands' }],
      };
      vi.mocked(mockDiscordBotService.validateChannelId).mockResolvedValue(
        true,
      );

      await expect(service.validate(settings, guildId)).resolves.not.toThrow();
    });

    it('should_throw_when_channel_id_invalid_format', async () => {
      const settings: GuildSettingsDto = {
        bot_command_channels: [{ id: 'invalid', name: 'commands' }],
      };

      await expect(service.validate(settings, guildId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should_throw_when_channel_does_not_exist_in_discord', async () => {
      const settings: GuildSettingsDto = {
        bot_command_channels: [{ id: '12345678901234567', name: 'commands' }],
      };
      vi.mocked(mockDiscordBotService.validateChannelId).mockResolvedValue(
        false,
      );

      await expect(service.validate(settings, guildId)).rejects.toThrow(
        'does not exist in Discord guild',
      );
    });

    it('should_throw_when_duplicate_channel_ids_provided', async () => {
      const settings: GuildSettingsDto = {
        bot_command_channels: [
          { id: '12345678901234567', name: 'channel1' },
          { id: '12345678901234567', name: 'channel2' },
        ],
      };
      vi.mocked(mockDiscordBotService.validateChannelId).mockResolvedValue(
        true,
      );

      await expect(service.validate(settings, guildId)).rejects.toThrow(
        'Duplicate channel ID',
      );
    });
  });

  describe('validateStructure', () => {
    it('should_pass_when_valid_structure_provided', () => {
      const config = {
        bot_command_channels: [{ id: '123', name: 'test' }],
      };

      expect(() => service.validateStructure(config)).not.toThrow();
    });

    it('should_throw_when_config_is_not_object', () => {
      expect(() =>
        service.validateStructure(null as unknown as object),
      ).toThrow('Configuration must be an object');
    });

    it('should_throw_when_bot_command_channels_missing', () => {
      const config = {};

      expect(() => service.validateStructure(config)).toThrow(
        'Missing required section: bot_command_channels',
      );
    });

    it('should_throw_when_bot_command_channels_not_array', () => {
      const config = { bot_command_channels: 'not-an-array' };

      expect(() => service.validateStructure(config)).toThrow(
        'bot_command_channels must be an array',
      );
    });
  });

  describe('MMR calculation validation', () => {
    it('should_pass_when_valid_weighted_average_config', async () => {
      const settings: GuildSettingsDto = {
        mmrCalculation: {
          algorithm: 'WEIGHTED_AVERAGE',
          weights: { ones: 0.25, twos: 0.25, threes: 0.25, fours: 0.25 },
        },
      };

      await expect(service.validate(settings, guildId)).resolves.not.toThrow();
    });

    it('should_throw_when_custom_formula_missing_for_custom_algorithm', async () => {
      const settings: GuildSettingsDto = {
        mmrCalculation: {
          algorithm: 'CUSTOM',
        },
      };

      await expect(service.validate(settings, guildId)).rejects.toThrow(
        'Custom formula is required for CUSTOM algorithm',
      );
    });

    it('should_throw_when_invalid_algorithm_provided', async () => {
      const settings: GuildSettingsDto = {
        mmrCalculation: {
          algorithm: 'INVALID_ALGO' as 'WEIGHTED_AVERAGE',
        },
      };

      await expect(service.validate(settings, guildId)).rejects.toThrow(
        'Invalid algorithm',
      );
    });
  });

  describe('tracker processing validation', () => {
    it('should_pass_when_valid_tracker_processing_config', async () => {
      const settings: GuildSettingsDto = {
        trackerProcessing: { enabled: true },
      };

      await expect(service.validate(settings, guildId)).resolves.not.toThrow();
    });

    it('should_throw_when_enabled_is_not_boolean', async () => {
      const settings: GuildSettingsDto = {
        trackerProcessing: { enabled: 'yes' as unknown as boolean },
      };

      await expect(service.validate(settings, guildId)).rejects.toThrow(
        'trackerProcessing.enabled must be a boolean',
      );
    });
  });
});
