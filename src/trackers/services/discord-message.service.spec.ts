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

  const createServiceWithCircuitBreakerConfig = async (
    threshold: number,
    timeout: number,
  ) => {
    const configService = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'discord.botToken') return 'test-bot-token';
        if (key === 'discord.apiUrl') return 'https://discord.com/api/v10';
        if (key === 'circuitBreaker') return { threshold, timeout };
        return undefined;
      }),
    } as unknown as ConfigService;

    const httpService = {
      post: vi.fn(),
    } as unknown as HttpService;

    const module = await Test.createTestingModule({
      providers: [
        DiscordMessageService,
        { provide: HttpService, useValue: httpService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    return {
      service: module.get<DiscordMessageService>(DiscordMessageService),
      httpService,
    };
  };

  beforeEach(async () => {
    mockHttpService = {
      post: vi.fn(),
    } as unknown as HttpService;

    mockConfigService = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'discord.botToken') return 'test-bot-token';
        if (key === 'discord.apiUrl') return 'https://discord.com/api/v10';
        return undefined;
      }),
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

    it('should_send_dm_successfully_when_all_conditions_met', async () => {
      const mockChannelResponse = { data: { id: 'channel-1' } };
      vi.mocked(mockHttpService.post)
        .mockReturnValueOnce(of(mockChannelResponse))
        .mockReturnValueOnce(of({ data: {} }));

      await service.sendDirectMessage('user-1', { content: 'test message' });

      expect(mockHttpService.post).toHaveBeenCalledTimes(2);
      expect(mockHttpService.post).toHaveBeenNthCalledWith(
        1,
        'https://discord.com/api/v10/users/@me/channels',
        { recipient_id: 'user-1' },
        expect.objectContaining({
          headers: {
            Authorization: 'Bot test-bot-token',
            'Content-Type': 'application/json',
          },
        }),
      );
      expect(mockHttpService.post).toHaveBeenNthCalledWith(
        2,
        'https://discord.com/api/v10/channels/channel-1/messages',
        { content: 'test message' },
        expect.objectContaining({
          headers: {
            Authorization: 'Bot test-bot-token',
            'Content-Type': 'application/json',
          },
        }),
      );
    });

    it('should_handle_dm_channel_creation_error', async () => {
      const axiosError = new AxiosError('Network error');
      vi.mocked(mockHttpService.post).mockReturnValue(
        throwError(() => axiosError),
      );

      await expect(
        service.sendDirectMessage('user-1', { content: 'test' }),
      ).rejects.toThrow('Network error');
    });

    it('should_handle_message_send_error_after_channel_creation', async () => {
      const mockChannelResponse = { data: { id: 'channel-1' } };
      const axiosError = new AxiosError('Message send failed');
      vi.mocked(mockHttpService.post)
        .mockReturnValueOnce(of(mockChannelResponse))
        .mockReturnValueOnce(throwError(() => axiosError));

      await expect(
        service.sendDirectMessage('user-1', { content: 'test' }),
      ).rejects.toThrow('Message send failed');
    });

    it('should_throw_error_when_circuit_breaker_open', async () => {
      const { service: testService, httpService: testHttpService } =
        await createServiceWithCircuitBreakerConfig(1, 60000);

      const axiosError = new AxiosError('Network error');
      vi.mocked(testHttpService.post).mockReturnValue(
        throwError(() => axiosError),
      );

      await expect(
        testService.sendDirectMessage('user-1', { content: 'test' }),
      ).rejects.toThrow();
      await expect(
        testService.sendDirectMessage('user-1', { content: 'test' }),
      ).rejects.toThrow('Circuit breaker is open');
    });
  });

  describe('sendMessage', () => {
    it('should_send_message_when_token_and_payload_valid', async () => {
      vi.mocked(mockHttpService.post).mockReturnValue(of({ data: {} }));

      await service.sendMessage('channel-1', { content: 'test message' });

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/channels/channel-1/messages'),
        { content: 'test message' },
        expect.objectContaining({
          headers: {
            Authorization: 'Bot test-bot-token',
            'Content-Type': 'application/json',
          },
        }),
      );
    });

    it('should_throw_error_when_bot_token_not_configured', async () => {
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
        emptyTokenService.sendMessage('channel-1', { content: 'test' }),
      ).rejects.toThrow('Discord bot token not configured');
    });

    it('should_throw_error_when_circuit_breaker_open', async () => {
      const { service: testService, httpService: testHttpService } =
        await createServiceWithCircuitBreakerConfig(1, 60000);

      const axiosError = new AxiosError('Network error');
      vi.mocked(testHttpService.post).mockReturnValue(
        throwError(() => axiosError),
      );

      await expect(
        testService.sendMessage('channel-1', { content: 'test' }),
      ).rejects.toThrow();
      await expect(
        testService.sendMessage('channel-1', { content: 'test' }),
      ).rejects.toThrow('Discord API circuit breaker is open');
    });

    it('should_record_failure_when_request_fails', async () => {
      const axiosError = new AxiosError('Network error');
      vi.mocked(mockHttpService.post).mockReturnValue(
        throwError(() => axiosError),
      );

      await expect(
        service.sendMessage('channel-1', { content: 'test' }),
      ).rejects.toThrow('Network error');
    });

    it('should_record_success_when_request_succeeds', async () => {
      vi.mocked(mockHttpService.post).mockReturnValue(of({ data: {} }));

      await service.sendMessage('channel-1', { content: 'test' });

      expect(mockHttpService.post).toHaveBeenCalled();
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

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/webhooks/@me/valid-token'),
        expect.objectContaining({
          content: 'test',
          flags: 64,
        }),
        expect.objectContaining({
          headers: {
            Authorization: 'Bot test-bot-token',
            'Content-Type': 'application/json',
          },
        }),
      );
    });

    it('should_handle_404_error_when_token_expired', async () => {
      const axiosError = new AxiosError('Not found');
      axiosError.response = { status: 404 } as never;
      vi.mocked(mockHttpService.post).mockReturnValue(
        throwError(() => axiosError),
      );

      await expect(
        service.sendEphemeralFollowUp('expired-token', { content: 'test' }),
      ).rejects.toThrow('Interaction token expired or invalid');
    });

    it('should_handle_400_error_when_token_invalid', async () => {
      const axiosError = new AxiosError('Bad request');
      axiosError.response = { status: 400 } as never;
      vi.mocked(mockHttpService.post).mockReturnValue(
        throwError(() => axiosError),
      );

      await expect(
        service.sendEphemeralFollowUp('invalid-token', { content: 'test' }),
      ).rejects.toThrow('Interaction token expired or invalid');
    });

    it('should_handle_other_http_errors', async () => {
      const axiosError = new AxiosError('Server error');
      axiosError.response = { status: 500 } as never;
      vi.mocked(mockHttpService.post).mockReturnValue(
        throwError(() => axiosError),
      );

      await expect(
        service.sendEphemeralFollowUp('valid-token', { content: 'test' }),
      ).rejects.toThrow('Server error');
    });

    it('should_throw_error_when_bot_token_not_configured', async () => {
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
        emptyTokenService.sendEphemeralFollowUp('token', { content: 'test' }),
      ).rejects.toThrow('Discord bot token not configured');
    });

    it('should_throw_error_when_circuit_breaker_open', async () => {
      const { service: testService, httpService: testHttpService } =
        await createServiceWithCircuitBreakerConfig(1, 60000);

      const axiosError = new AxiosError('Network error');
      vi.mocked(testHttpService.post).mockReturnValue(
        throwError(() => axiosError),
      );

      await expect(
        testService.sendEphemeralFollowUp('token', { content: 'test' }),
      ).rejects.toThrow();
      await expect(
        testService.sendEphemeralFollowUp('token', { content: 'test' }),
      ).rejects.toThrow('Circuit breaker is open');
    });
  });

  describe('circuit breaker', () => {
    it('should_open_circuit_after_threshold_failures', async () => {
      const { service: testService, httpService: testHttpService } =
        await createServiceWithCircuitBreakerConfig(2, 60000);

      const axiosError = new AxiosError('Network error');
      vi.mocked(testHttpService.post).mockReturnValue(
        throwError(() => axiosError),
      );

      await expect(
        testService.sendMessage('channel-1', { content: 'test' }),
      ).rejects.toThrow();
      await expect(
        testService.sendMessage('channel-1', { content: 'test' }),
      ).rejects.toThrow();
      await expect(
        testService.sendMessage('channel-1', { content: 'test' }),
      ).rejects.toThrow('Discord API circuit breaker is open');
    });

    it('should_close_circuit_after_timeout', async () => {
      vi.useFakeTimers();
      const { service: testService, httpService: testHttpService } =
        await createServiceWithCircuitBreakerConfig(1, 100);

      const axiosError = new AxiosError('Network error');
      vi.mocked(testHttpService.post).mockReturnValueOnce(
        throwError(() => axiosError),
      );

      await expect(
        testService.sendMessage('channel-1', { content: 'test' }),
      ).rejects.toThrow();

      await expect(
        testService.sendMessage('channel-1', { content: 'test' }),
      ).rejects.toThrow('Discord API circuit breaker is open');

      vi.advanceTimersByTime(150);

      vi.mocked(testHttpService.post).mockReturnValueOnce(of({ data: {} }));

      await testService.sendMessage('channel-1', { content: 'test' });

      expect(testHttpService.post).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should_reset_failure_count_on_success', async () => {
      const { service: testService, httpService: testHttpService } =
        await createServiceWithCircuitBreakerConfig(2, 60000);

      const axiosError = new AxiosError('Network error');
      vi.mocked(testHttpService.post)
        .mockReturnValueOnce(throwError(() => axiosError))
        .mockReturnValueOnce(of({ data: {} }))
        .mockReturnValueOnce(of({ data: {} }));

      await expect(
        testService.sendMessage('channel-1', { content: 'test' }),
      ).rejects.toThrow();

      await testService.sendMessage('channel-1', { content: 'test' });

      await testService.sendMessage('channel-1', { content: 'test' });

      expect(testHttpService.post).toHaveBeenCalledTimes(3);
    });
  });
});
