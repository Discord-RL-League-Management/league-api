/**
 * GuildSettingsValidationService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { SettingsValidationService } from '@/guilds/services/settings-validation.service';
import { DiscordBotService } from '@/discord/discord-bot.service';
import { FormulaValidationService } from '@/mmr-calculation/services/formula-validation.service';

describe('SettingsValidationService (Guilds)', () => {
  let service: SettingsValidationService;
  let mockDiscordValidation: DiscordBotService;
  let mockFormulaValidation: FormulaValidationService;

  beforeEach(() => {
    mockDiscordValidation = {
      validateChannelId: vi.fn(),
    } as unknown as DiscordBotService;

    mockFormulaValidation = {
      validateFormula: vi.fn(),
    } as unknown as FormulaValidationService;

    service = new SettingsValidationService(
      mockDiscordValidation,
      mockFormulaValidation,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validate', () => {
    it('should_pass_when_all_validations_pass', async () => {
      const guildId = 'guild123';
      const settings = {
        bot_command_channels: [{ id: '123456789012345678', name: 'commands' }],
        mmrCalculation: {
          algorithm: 'WEIGHTED_AVERAGE' as const,
          weights: { ones: 0.2, twos: 0.3, threes: 0.5 },
        },
      };

      vi.mocked(mockDiscordValidation.validateChannelId).mockResolvedValue(
        true,
      );

      await service.validate(settings, guildId);

      expect(mockDiscordValidation.validateChannelId).toHaveBeenCalled();
    });

    it('should_validate_bot_command_channels', async () => {
      const guildId = 'guild123';
      const settings = {
        bot_command_channels: [{ id: '123456789012345678', name: 'commands' }],
      };

      vi.mocked(mockDiscordValidation.validateChannelId).mockResolvedValue(
        true,
      );

      await service.validate(settings, guildId);

      expect(mockDiscordValidation.validateChannelId).toHaveBeenCalledWith(
        guildId,
        '123456789012345678',
      );
    });

    it('should_throw_BadRequestException_when_channel_id_missing', async () => {
      const guildId = 'guild123';
      const settings = {
        bot_command_channels: [{ id: '', name: 'commands' }],
      };

      await expect(service.validate(settings, guildId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validate(settings, guildId)).rejects.toThrow(
        'Channel ID is required',
      );
    });

    it('should_throw_BadRequestException_when_channel_id_invalid_format', async () => {
      const guildId = 'guild123';
      const settings = {
        bot_command_channels: [{ id: 'invalid', name: 'commands' }],
      };

      await expect(service.validate(settings, guildId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validate(settings, guildId)).rejects.toThrow(
        'Invalid Discord channel ID format',
      );
    });

    it('should_throw_BadRequestException_when_duplicate_channel_ids', async () => {
      const guildId = 'guild123';
      const channelId = '123456789012345678';
      const settings = {
        bot_command_channels: [
          { id: channelId, name: 'commands1' },
          { id: channelId, name: 'commands2' },
        ],
      };

      // Mock Discord validation to pass so we can test duplicate check
      vi.mocked(mockDiscordValidation.validateChannelId).mockResolvedValue(
        true,
      );

      await expect(service.validate(settings, guildId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validate(settings, guildId)).rejects.toThrow(
        'Duplicate channel ID',
      );
    });

    it('should_throw_BadRequestException_when_channel_not_exists_in_discord', async () => {
      const guildId = 'guild123';
      const settings = {
        bot_command_channels: [{ id: '123456789012345678', name: 'commands' }],
      };

      vi.mocked(mockDiscordValidation.validateChannelId).mockResolvedValue(
        false,
      );

      await expect(service.validate(settings, guildId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validate(settings, guildId)).rejects.toThrow(
        'does not exist in Discord guild',
      );
    });

    it('should_throw_BadRequestException_when_channel_name_too_long', async () => {
      const guildId = 'guild123';
      const longName = 'a'.repeat(101);
      const settings = {
        bot_command_channels: [{ id: '123456789012345678', name: longName }],
      };

      vi.mocked(mockDiscordValidation.validateChannelId).mockResolvedValue(
        true,
      );

      await expect(service.validate(settings, guildId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validate(settings, guildId)).rejects.toThrow(
        'Channel name too long',
      );
    });

    it('should_validate_mmr_calculation_config', async () => {
      const guildId = 'guild123';
      const settings = {
        mmrCalculation: {
          algorithm: 'WEIGHTED_AVERAGE' as const,
          weights: { ones: 0.2, twos: 0.3, threes: 0.5 },
        },
      };

      await service.validate(settings, guildId);

      expect(settings.mmrCalculation.algorithm).toBe('WEIGHTED_AVERAGE');
    });

    it('should_throw_BadRequestException_when_mmr_algorithm_missing', async () => {
      const guildId = 'guild123';
      const settings = {
        mmrCalculation: {
          algorithm: undefined as any,
          weights: { ones: 0.2, twos: 0.3, threes: 0.5 },
        },
      };

      await expect(service.validate(settings, guildId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validate(settings, guildId)).rejects.toThrow(
        'MMR calculation algorithm is required',
      );
    });

    it('should_throw_BadRequestException_when_custom_formula_missing', async () => {
      const guildId = 'guild123';
      const settings = {
        mmrCalculation: {
          algorithm: 'CUSTOM' as const,
        },
      };

      await expect(service.validate(settings, guildId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validate(settings, guildId)).rejects.toThrow(
        'Custom formula is required',
      );
    });

    it('should_validate_custom_formula_when_provided', async () => {
      const guildId = 'guild123';
      const settings = {
        mmrCalculation: {
          algorithm: 'CUSTOM' as const,
          customFormula: '(ones + twos) / 2',
        },
      };

      vi.mocked(mockFormulaValidation.validateFormula).mockReturnValue({
        valid: true,
      });

      await service.validate(settings, guildId);

      expect(mockFormulaValidation.validateFormula).toHaveBeenCalledWith(
        settings.mmrCalculation.customFormula,
      );
    });

    it('should_throw_BadRequestException_when_custom_formula_invalid', async () => {
      const guildId = 'guild123';
      const settings = {
        mmrCalculation: {
          algorithm: 'CUSTOM' as const,
          customFormula: 'invalid formula',
        },
      };

      vi.mocked(mockFormulaValidation.validateFormula).mockReturnValue({
        valid: false,
        error: 'Invalid syntax',
      });

      await expect(service.validate(settings, guildId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validate(settings, guildId)).rejects.toThrow(
        'Invalid formula',
      );
    });

    it('should_validate_tracker_processing_config', async () => {
      const guildId = 'guild123';
      const settings = {
        trackerProcessing: {
          enabled: true,
        },
      };

      await service.validate(settings, guildId);

      expect(settings.trackerProcessing.enabled).toBe(true);
    });

    it('should_validate_tracker_processing_config_when_enabled_false', async () => {
      const guildId = 'guild123';
      const settings = {
        trackerProcessing: {
          enabled: false,
        },
      };

      await service.validate(settings, guildId);

      expect(settings.trackerProcessing.enabled).toBe(false);
    });

    it('should_pass_when_tracker_processing_omitted', async () => {
      const guildId = 'guild123';
      const settings = {};

      await service.validate(settings, guildId);

      expect(settings).not.toHaveProperty('trackerProcessing');
    });

    it('should_throw_BadRequestException_when_tracker_processing_enabled_not_boolean', async () => {
      const guildId = 'guild123';
      const settings = {
        trackerProcessing: {
          enabled: 'not a boolean' as any,
        },
      };

      await expect(service.validate(settings, guildId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validate(settings, guildId)).rejects.toThrow(
        'trackerProcessing.enabled must be a boolean',
      );
    });
  });

  describe('validateStructure', () => {
    it('should_pass_when_structure_is_valid', () => {
      const config = {
        bot_command_channels: [{ id: '123', name: 'test' }],
      };

      service.validateStructure(config);

      expect(config.bot_command_channels).toHaveLength(1);
    });

    it('should_throw_BadRequestException_when_config_is_not_object', () => {
      const config = null;

      const configAsUnknown = config as unknown as Record<string, unknown>;
      expect(() => service.validateStructure(configAsUnknown)).toThrow(
        BadRequestException,
      );
      expect(() => service.validateStructure(configAsUnknown)).toThrow(
        'Configuration must be an object',
      );
    });

    it('should_throw_BadRequestException_when_bot_command_channels_missing', () => {
      const config = {};

      expect(() => service.validateStructure(config)).toThrow(
        BadRequestException,
      );
      expect(() => service.validateStructure(config)).toThrow(
        'Missing required section: bot_command_channels',
      );
    });

    it('should_throw_BadRequestException_when_bot_command_channels_not_array', () => {
      const config = {
        bot_command_channels: 'not an array',
      };

      expect(() => service.validateStructure(config)).toThrow(
        BadRequestException,
      );
      expect(() => service.validateStructure(config)).toThrow(
        'bot_command_channels must be an array',
      );
    });
  });
});
