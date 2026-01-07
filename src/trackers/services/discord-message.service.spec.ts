/**
 * DiscordMessageService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosError } from 'axios';
import { DiscordMessageService } from './discord-message.service';

describe('DiscordMessageService', () => {
  let service: DiscordMessageService;
  let mockHttpService: HttpService;
  let mockConfigService: ConfigService;

  beforeEach(async () => {
    mockHttpService = {
      post: vi.fn(),
    } as unknown as HttpService;

    mockConfigService = {
      get: vi.fn().mockReturnValue('test-bot-token'),
    } as unknown as ConfigService;

    const module = await Test.createTestingModule({
      providers: [
        DiscordMessageService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<DiscordMessageService>(DiscordMessageService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendDirectMessage', () => {
    it('should_throw_error_when_bot_token_not_configured', async () => {
      // Create a new service instance with empty token
      const emptyTokenConfigService = {
        get: vi.fn().mockReturnValue(''),
      } as unknown as ConfigService;

      const module = await Test.createTestingModule({
        providers: [
          DiscordMessageService,
          { provide: HttpService, useValue: mockHttpService },
          { provide: ConfigService, useValue: emptyTokenConfigService },
        ],
      }).compile();

      const emptyTokenService = module.get<DiscordMessageService>(
        DiscordMessageService,
      );

      await expect(
        emptyTokenService.sendDirectMessage('user-1', { content: 'test' }),
      ).rejects.toThrow('Discord bot token not configured');
    });

    it('should_send_message_when_token_and_payload_valid', async () => {
      const mockChannelResponse = { data: { id: 'channel-1' } };
      vi.mocked(mockHttpService.post)
        .mockReturnValueOnce(of(mockChannelResponse))
        .mockReturnValueOnce(of({ data: {} }));

      await service.sendDirectMessage('user-1', { content: 'test' });

      expect(mockHttpService.post).toHaveBeenCalled();
    });

    it('should_throw_error_when_circuit_breaker_open', async () => {
      // Create service with lower threshold for testing
      const lowThresholdConfigService = {
        get: vi.fn().mockImplementation((key: string) => {
          if (key === 'discord.botToken') return 'test-bot-token';
          if (key === 'discord.apiUrl') return 'https://discord.com/api/v10';
          if (key === 'circuitBreaker') return { threshold: 1, timeout: 60000 };
          return undefined;
        }),
      } as unknown as ConfigService;

      const testHttpService = {
        post: vi.fn(),
      } as unknown as HttpService;

      const testModule = await Test.createTestingModule({
        providers: [
          DiscordMessageService,
          { provide: HttpService, useValue: testHttpService },
          { provide: ConfigService, useValue: lowThresholdConfigService },
        ],
      }).compile();

      const testService = testModule.get<DiscordMessageService>(
        DiscordMessageService,
      );

      // Mock first call to fail (opens circuit after threshold: 1)
      const axiosError = new AxiosError('Network error');
      vi.mocked(testHttpService.post).mockRejectedValueOnce(axiosError);

      // First call should fail and open circuit
      await expect(
        testService.sendDirectMessage('user-1', { content: 'test' }),
      ).rejects.toThrow();

      // Second call should throw circuit breaker error
      await expect(
        testService.sendDirectMessage('user-1', { content: 'test' }),
      ).rejects.toThrow('Circuit breaker is open');
    });
  });

  describe('sendEphemeralFollowUp', () => {
    it('should_throw_error_when_token_invalid', async () => {
      await expect(
        service.sendEphemeralFollowUp('', { content: 'test' }),
      ).rejects.toThrow('Invalid interaction token provided');
    });

    it('should_send_followup_when_token_valid', async () => {
      vi.mocked(mockHttpService.post).mockReturnValue(of({ data: {} }));

      await service.sendEphemeralFollowUp('valid-token', { content: 'test' });

      expect(mockHttpService.post).toHaveBeenCalled();
    });
  });
});
