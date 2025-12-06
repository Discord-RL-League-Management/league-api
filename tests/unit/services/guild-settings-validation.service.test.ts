/**
 * GuildSettingsValidationService Unit Tests
 * 
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { SettingsValidationService } from '@/guilds/services/settings-validation.service';
import { DiscordBotService } from '@/discord/discord-bot.service';
import { FormulaValidationService } from '@/mmr-calculation/services/formula-validation.service';

describe('SettingsValidationService (Guilds)', () => {
  let service: SettingsValidationService;
  let mockDiscordValidation: DiscordBotService;
  let mockFormulaValidation: FormulaValidationService;

  beforeEach(() => {
    // ARRANGE: Setup test dependencies
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

  describe('validate', () => {
    it('should_pass_when_all_validations_pass', async () => {
      // ARRANGE
      const guildId = 'guild123';
      const settings = {
        bot_command_channels: [
          { id: '123456789012345678', name: 'commands' },
        ],
        mmrCalculation: {
          algorithm: 'WEIGHTED_AVERAGE',
          weights: { ones: 0.2, twos: 0.3, threes: 0.5 },
        },
      };

      vi.mocked(mockDiscordValidation.validateChannelId).mockResolvedValue(
        true,
      );

      // ACT
      await service.validate(settings, guildId);

      // ASSERT
      expect(mockDiscordValidation.validateChannelId).toHaveBeenCalled();
    });

    it('should_validate_bot_command_channels', async () => {
      // ARRANGE
      const guildId = 'guild123';
      const settings = {
        bot_command_channels: [
          { id: '123456789012345678', name: 'commands' },
        ],
      };

      vi.mocked(mockDiscordValidation.validateChannelId).mockResolvedValue(
        true,
      );

      // ACT
      await service.validate(settings, guildId);

      // ASSERT
      expect(mockDiscordValidation.validateChannelId).toHaveBeenCalledWith(
        guildId,
        '123456789012345678',
      );
    });

    it('should_throw_BadRequestException_when_channel_id_missing', async () => {
      // ARRANGE
      const guildId = 'guild123';
      const settings = {
        bot_command_channels: [{ name: 'commands' }],
      };

      // ACT & ASSERT
      await expect(service.validate(settings, guildId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validate(settings, guildId)).rejects.toThrow(
        'Channel ID is required',
      );
    });

    it('should_throw_BadRequestException_when_channel_id_invalid_format', async () => {
      // ARRANGE
      const guildId = 'guild123';
      const settings = {
        bot_command_channels: [{ id: 'invalid', name: 'commands' }],
      };

      // ACT & ASSERT
      await expect(service.validate(settings, guildId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validate(settings, guildId)).rejects.toThrow(
        'Invalid Discord channel ID format',
      );
    });

    it('should_throw_BadRequestException_when_duplicate_channel_ids', async () => {
      // ARRANGE
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

      // ACT & ASSERT
      await expect(service.validate(settings, guildId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validate(settings, guildId)).rejects.toThrow(
        'Duplicate channel ID',
      );
    });

    it('should_throw_BadRequestException_when_channel_not_exists_in_discord', async () => {
      // ARRANGE
      const guildId = 'guild123';
      const settings = {
        bot_command_channels: [
          { id: '123456789012345678', name: 'commands' },
        ],
      };

      vi.mocked(mockDiscordValidation.validateChannelId).mockResolvedValue(
        false,
      );

      // ACT & ASSERT
      await expect(service.validate(settings, guildId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validate(settings, guildId)).rejects.toThrow(
        'does not exist in Discord guild',
      );
    });

    it('should_throw_BadRequestException_when_channel_name_too_long', async () => {
      // ARRANGE
      const guildId = 'guild123';
      const longName = 'a'.repeat(101);
      const settings = {
        bot_command_channels: [
          { id: '123456789012345678', name: longName },
        ],
      };

      vi.mocked(mockDiscordValidation.validateChannelId).mockResolvedValue(
        true,
      );

      // ACT & ASSERT
      await expect(service.validate(settings, guildId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validate(settings, guildId)).rejects.toThrow(
        'Channel name too long',
      );
    });

    it('should_validate_mmr_calculation_config', async () => {
      // ARRANGE
      const guildId = 'guild123';
      const settings = {
        mmrCalculation: {
          algorithm: 'WEIGHTED_AVERAGE',
          weights: { ones: 0.2, twos: 0.3, threes: 0.5 },
        },
      };

      // ACT
      await service.validate(settings, guildId);

      // ASSERT
      // Should not throw
    });

    it('should_throw_BadRequestException_when_mmr_algorithm_missing', async () => {
      // ARRANGE
      const guildId = 'guild123';
      const settings = {
        mmrCalculation: {
          weights: { ones: 0.2, twos: 0.3, threes: 0.5 },
        },
      };

      // ACT & ASSERT
      await expect(service.validate(settings, guildId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validate(settings, guildId)).rejects.toThrow(
        'MMR calculation algorithm is required',
      );
    });

    it('should_throw_BadRequestException_when_custom_formula_missing', async () => {
      // ARRANGE
      const guildId = 'guild123';
      const settings = {
        mmrCalculation: {
          algorithm: 'CUSTOM',
        },
      };

      // ACT & ASSERT
      await expect(service.validate(settings, guildId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validate(settings, guildId)).rejects.toThrow(
        'Custom formula is required',
      );
    });

    it('should_validate_custom_formula_when_provided', async () => {
      // ARRANGE
      const guildId = 'guild123';
      const settings = {
        mmrCalculation: {
          algorithm: 'CUSTOM',
          customFormula: '(ones + twos) / 2',
        },
      };

      vi.mocked(mockFormulaValidation.validateFormula).mockReturnValue({
        valid: true,
      });

      // ACT
      await service.validate(settings, guildId);

      // ASSERT
      expect(mockFormulaValidation.validateFormula).toHaveBeenCalledWith(
        settings.mmrCalculation.customFormula,
      );
    });

    it('should_throw_BadRequestException_when_custom_formula_invalid', async () => {
      // ARRANGE
      const guildId = 'guild123';
      const settings = {
        mmrCalculation: {
          algorithm: 'CUSTOM',
          customFormula: 'invalid formula',
        },
      };

      vi.mocked(mockFormulaValidation.validateFormula).mockReturnValue({
        valid: false,
        error: 'Invalid syntax',
      });

      // ACT & ASSERT
      await expect(service.validate(settings, guildId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validate(settings, guildId)).rejects.toThrow(
        'Invalid formula',
      );
    });
  });

  describe('validateStructure', () => {
    it('should_pass_when_structure_is_valid', () => {
      // ARRANGE
      const config = {
        bot_command_channels: [{ id: '123', name: 'test' }],
      };

      // ACT
      service.validateStructure(config);

      // ASSERT
      // Should not throw
    });

    it('should_throw_BadRequestException_when_config_is_not_object', () => {
      // ARRANGE
      const config = null;

      // ACT & ASSERT
      expect(() => service.validateStructure(config as any)).toThrow(
        BadRequestException,
      );
      expect(() => service.validateStructure(config as any)).toThrow(
        'Configuration must be an object',
      );
    });

    it('should_throw_BadRequestException_when_bot_command_channels_missing', () => {
      // ARRANGE
      const config = {};

      // ACT & ASSERT
      expect(() => service.validateStructure(config)).toThrow(
        BadRequestException,
      );
      expect(() => service.validateStructure(config)).toThrow(
        'Missing required section: bot_command_channels',
      );
    });

    it('should_throw_BadRequestException_when_bot_command_channels_not_array', () => {
      // ARRANGE
      const config = {
        bot_command_channels: 'not an array',
      };

      // ACT & ASSERT
      expect(() => service.validateStructure(config)).toThrow(
        BadRequestException,
      );
      expect(() => service.validateStructure(config)).toThrow(
        'bot_command_channels must be an array',
      );
    });
  });
});

