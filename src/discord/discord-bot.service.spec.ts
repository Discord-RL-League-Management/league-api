/**
 * DiscordBotService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { of, throwError } from 'rxjs';
import * as rxjs from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { DiscordBotService, DiscordRole } from './discord-bot.service';

describe('DiscordBotService', () => {
  let service: DiscordBotService;
  let mockHttpService: HttpService;
  let mockConfigService: ConfigService;
  let mockCacheManager: Cache;
  let firstValueFromSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    mockConfigService = {
      get: vi.fn().mockImplementation((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          'discord.botToken': 'test-bot-token',
          'discord.apiUrl': 'https://discord.com/api/v10',
          'discord.timeout': 10000,
          'discord.retryAttempts': 3,
        };
        return config[key] ?? defaultValue;
      }),
    } as unknown as ConfigService;

    mockHttpService = {
      get: vi.fn(),
    } as unknown as HttpService;

    mockCacheManager = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    } as unknown as Cache;

    const module = await Test.createTestingModule({
      providers: [
        DiscordBotService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<DiscordBotService>(DiscordBotService);
  });

  afterEach(() => {
    if (firstValueFromSpy) {
      firstValueFromSpy.mockRestore();
    }
    vi.restoreAllMocks();
  });

  describe('validateRoleIds', () => {
    it('should_return_empty_map_when_role_ids_array_is_empty', async () => {
      const result = await service.validateRoleIds('guild-123', []);

      expect(result).toEqual(new Map());
      expect(result.size).toBe(0);
    });

    it('should_return_map_with_valid_role_ids_when_roles_exist', async () => {
      const mockRoles: DiscordRole[] = [
        { id: 'role-1', name: 'Role 1' },
        { id: 'role-2', name: 'Role 2' },
      ];

      vi.spyOn(service, 'getGuildRoles').mockResolvedValue(mockRoles);

      const result = await service.validateRoleIds('guild-123', [
        'role-1',
        'role-2',
        'role-3',
      ]);

      expect(result.size).toBe(3);
      expect(result.get('role-1')).toBe(true);
      expect(result.get('role-2')).toBe(true);
      expect(result.get('role-3')).toBe(false);
    });

    it('should_return_all_false_when_getGuildRoles_throws_error', async () => {
      vi.spyOn(service, 'getGuildRoles').mockRejectedValue(
        new Error('API error'),
      );

      const result = await service.validateRoleIds('guild-123', [
        'role-1',
        'role-2',
      ]);

      expect(result.size).toBe(2);
      expect(result.get('role-1')).toBe(false);
      expect(result.get('role-2')).toBe(false);
    });
  });

  describe('validateChannelIds', () => {
    it('should_return_empty_map_when_channel_ids_array_is_empty', async () => {
      const result = await service.validateChannelIds('guild-123', []);

      expect(result).toEqual(new Map());
      expect(result.size).toBe(0);
    });

    it('should_return_map_with_valid_channel_ids_when_channels_exist', async () => {
      const mockChannels = [
        { id: 'channel-1', name: 'Channel 1', type: 0 },
        { id: 'channel-2', name: 'Channel 2', type: 0 },
      ];

      vi.spyOn(service, 'getGuildChannels').mockResolvedValue(mockChannels);

      const result = await service.validateChannelIds('guild-123', [
        'channel-1',
        'channel-2',
        'channel-3',
      ]);

      expect(result.size).toBe(3);
      expect(result.get('channel-1')).toBe(true);
      expect(result.get('channel-2')).toBe(true);
      expect(result.get('channel-3')).toBe(false);
    });

    it('should_return_all_false_when_getGuildChannels_throws_error', async () => {
      vi.spyOn(service, 'getGuildChannels').mockRejectedValue(
        new Error('API error'),
      );

      const result = await service.validateChannelIds('guild-123', [
        'channel-1',
        'channel-2',
      ]);

      expect(result.size).toBe(2);
      expect(result.get('channel-1')).toBe(false);
      expect(result.get('channel-2')).toBe(false);
    });
  });

  describe('validateRoleId', () => {
    it('should_return_true_when_role_exists', async () => {
      const mockResponse: AxiosResponse = {
        data: [{ id: 'role-1', name: 'Role 1' }],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };

      vi.mocked(mockHttpService.get).mockReturnValue(
        of(mockResponse).pipe() as never,
      );

      firstValueFromSpy = vi
        .spyOn(rxjs, 'firstValueFrom')
        .mockResolvedValue(mockResponse);

      const result = await service.validateRoleId('guild-123', 'role-1');

      expect(result).toBe(true);
      firstValueFromSpy.mockRestore();
    });

    it('should_return_false_when_role_does_not_exist', async () => {
      const mockResponse: AxiosResponse = {
        data: [{ id: 'role-1', name: 'Role 1' }],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };

      vi.mocked(mockHttpService.get).mockReturnValue(
        of(mockResponse).pipe() as never,
      );

      firstValueFromSpy = vi
        .spyOn(rxjs, 'firstValueFrom')
        .mockResolvedValue(mockResponse);

      const result = await service.validateRoleId('guild-123', 'role-999');

      expect(result).toBe(false);
      firstValueFromSpy.mockRestore();
    });

    it('should_return_false_when_api_call_fails', async () => {
      const axiosError = new AxiosError('Request failed');
      axiosError.response = {
        status: 500,
        statusText: 'Internal Server Error',
        data: {},
        headers: {},
        config: {} as never,
      };

      vi.mocked(mockHttpService.get).mockReturnValue(
        throwError(() => axiosError) as never,
      );

      const result = await service.validateRoleId('guild-123', 'role-1');

      expect(result).toBe(false);
    });
  });

  describe('validateChannelId', () => {
    it('should_return_true_when_channel_exists', async () => {
      const mockResponse: AxiosResponse = {
        data: [{ id: 'channel-1', name: 'Channel 1', type: 0 }],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };

      vi.mocked(mockHttpService.get).mockReturnValue(
        of(mockResponse).pipe() as never,
      );

      firstValueFromSpy = vi
        .spyOn(rxjs, 'firstValueFrom')
        .mockResolvedValue(mockResponse);

      const result = await service.validateChannelId('guild-123', 'channel-1');

      expect(result).toBe(true);
      firstValueFromSpy.mockRestore();
    });

    it('should_return_false_when_channel_does_not_exist', async () => {
      const mockResponse: AxiosResponse = {
        data: [{ id: 'channel-1', name: 'Channel 1', type: 0 }],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };

      vi.mocked(mockHttpService.get).mockReturnValue(
        of(mockResponse).pipe() as never,
      );

      firstValueFromSpy = vi
        .spyOn(rxjs, 'firstValueFrom')
        .mockResolvedValue(mockResponse);

      const result = await service.validateChannelId(
        'guild-123',
        'channel-999',
      );

      expect(result).toBe(false);
      firstValueFromSpy.mockRestore();
    });

    it('should_return_false_when_api_call_fails', async () => {
      const axiosError = new AxiosError('Request failed');
      axiosError.response = {
        status: 500,
        statusText: 'Internal Server Error',
        data: {},
        headers: {},
        config: {} as never,
      };

      vi.mocked(mockHttpService.get).mockReturnValue(
        throwError(() => axiosError) as never,
      );

      const result = await service.validateChannelId('guild-123', 'channel-1');

      expect(result).toBe(false);
    });
  });

  describe('getGuildRoles', () => {
    it('should_throw_service_unavailable_when_bot_token_not_configured', async () => {
      const configServiceNoToken = {
        get: vi.fn().mockImplementation((key: string) => {
          if (key === 'discord.botToken') return '';
          if (key === 'discord.apiUrl') return 'https://discord.com/api/v10';
          if (key === 'discord.timeout') return 10000;
          if (key === 'discord.retryAttempts') return 3;
          return undefined;
        }),
      } as unknown as ConfigService;

      const module = await Test.createTestingModule({
        providers: [
          DiscordBotService,
          { provide: HttpService, useValue: mockHttpService },
          { provide: ConfigService, useValue: configServiceNoToken },
          { provide: CACHE_MANAGER, useValue: mockCacheManager },
        ],
      }).compile();

      const serviceNoToken = module.get<DiscordBotService>(DiscordBotService);

      await expect(serviceNoToken.getGuildRoles('guild-123')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should_return_cached_roles_when_cache_hit', async () => {
      const cachedRoles: DiscordRole[] = [{ id: 'role-1', name: 'Role 1' }];

      vi.mocked(mockCacheManager.get).mockResolvedValue(cachedRoles);

      const result = await service.getGuildRoles('guild-123');

      expect(result).toEqual(cachedRoles);
      expect(mockCacheManager.get).toHaveBeenCalledWith(
        'discord:roles:guild-123',
      );
      expect(mockHttpService.get).not.toHaveBeenCalled();
    });

    it('should_fetch_and_cache_roles_when_cache_miss', async () => {
      const mockApiRoles = [
        { id: '123', name: 'Role 1' },
        { id: '456', name: 'Role 2' },
      ];

      const mockResponse: AxiosResponse = {
        data: mockApiRoles,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };

      vi.mocked(mockCacheManager.get).mockResolvedValue(undefined);
      vi.mocked(mockHttpService.get).mockReturnValue(
        of(mockResponse).pipe() as never,
      );
      vi.mocked(mockCacheManager.set).mockResolvedValue(undefined);

      firstValueFromSpy = vi
        .spyOn(rxjs, 'firstValueFrom')
        .mockResolvedValue(mockResponse);

      const result = await service.getGuildRoles('guild-123');

      expect(result).toEqual([
        { id: '123', name: 'Role 1' },
        { id: '456', name: 'Role 2' },
      ]);
      expect(mockCacheManager.set).toHaveBeenCalled();
      firstValueFromSpy.mockRestore();
    });

    it('should_filter_invalid_roles_from_api_response', async () => {
      const mockApiRoles = [
        { id: '123', name: 'Role 1' },
        { name: 'Missing ID' },
      ];

      const mockResponse: AxiosResponse = {
        data: mockApiRoles,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };

      vi.mocked(mockCacheManager.get).mockResolvedValue(undefined);
      vi.mocked(mockHttpService.get).mockReturnValue(
        of(mockResponse).pipe() as never,
      );

      firstValueFromSpy = vi
        .spyOn(rxjs, 'firstValueFrom')
        .mockResolvedValue(mockResponse);

      const result = await service.getGuildRoles('guild-123');

      expect(result).toEqual([{ id: '123', name: 'Role 1' }]);
      firstValueFromSpy.mockRestore();
    });

    it('should_throw_service_unavailable_when_api_call_fails', async () => {
      vi.mocked(mockCacheManager.get).mockResolvedValue(undefined);

      const axiosError = new AxiosError('Request failed');
      axiosError.response = {
        status: 500,
        statusText: 'Internal Server Error',
        data: {},
        headers: {},
        config: {} as never,
      };

      vi.mocked(mockHttpService.get).mockReturnValue(
        throwError(() => axiosError) as never,
      );

      await expect(service.getGuildRoles('guild-123')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('getGuildChannels', () => {
    it('should_throw_service_unavailable_when_bot_token_not_configured', async () => {
      const configServiceNoToken = {
        get: vi.fn().mockImplementation((key: string) => {
          if (key === 'discord.botToken') return '';
          if (key === 'discord.apiUrl') return 'https://discord.com/api/v10';
          if (key === 'discord.timeout') return 10000;
          if (key === 'discord.retryAttempts') return 3;
          return undefined;
        }),
      } as unknown as ConfigService;

      const module = await Test.createTestingModule({
        providers: [
          DiscordBotService,
          { provide: HttpService, useValue: mockHttpService },
          { provide: ConfigService, useValue: configServiceNoToken },
          { provide: CACHE_MANAGER, useValue: mockCacheManager },
        ],
      }).compile();

      const serviceNoToken = module.get<DiscordBotService>(DiscordBotService);

      await expect(
        serviceNoToken.getGuildChannels('guild-123'),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should_return_cached_channels_when_cache_hit', async () => {
      const cachedChannels = [{ id: 'channel-1', name: 'Channel 1', type: 0 }];

      vi.mocked(mockCacheManager.get).mockResolvedValue(cachedChannels);

      const result = await service.getGuildChannels('guild-123');

      expect(result).toEqual(cachedChannels);
      expect(mockCacheManager.get).toHaveBeenCalledWith(
        'discord:channels:guild-123',
      );
      expect(mockHttpService.get).not.toHaveBeenCalled();
    });

    it('should_fetch_and_cache_channels_when_cache_miss', async () => {
      const mockApiChannels = [
        { id: '123', name: 'Channel 1', type: 0, parent_id: '456' },
        { id: '789', name: 'Channel 2', type: 2 },
      ];

      const mockResponse: AxiosResponse = {
        data: mockApiChannels,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };

      vi.mocked(mockCacheManager.get).mockResolvedValue(undefined);
      vi.mocked(mockHttpService.get).mockReturnValue(
        of(mockResponse).pipe() as never,
      );
      vi.mocked(mockCacheManager.set).mockResolvedValue(undefined);

      firstValueFromSpy = vi
        .spyOn(rxjs, 'firstValueFrom')
        .mockResolvedValue(mockResponse);

      const result = await service.getGuildChannels('guild-123');

      expect(result).toEqual([
        { id: '123', name: 'Channel 1', type: 0, parent_id: '456' },
        { id: '789', name: 'Channel 2', type: 2, parent_id: undefined },
      ]);
      expect(mockCacheManager.set).toHaveBeenCalled();
      firstValueFromSpy.mockRestore();
    });

    it('should_filter_invalid_channels_from_api_response', async () => {
      const mockApiChannels = [
        { id: '123', name: 'Channel 1', type: 0 },
        { name: 'Missing ID' },
      ];

      const mockResponse: AxiosResponse = {
        data: mockApiChannels,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };

      vi.mocked(mockCacheManager.get).mockResolvedValue(undefined);
      vi.mocked(mockHttpService.get).mockReturnValue(
        of(mockResponse).pipe() as never,
      );

      firstValueFromSpy = vi
        .spyOn(rxjs, 'firstValueFrom')
        .mockResolvedValue(mockResponse);

      const result = await service.getGuildChannels('guild-123');

      expect(result).toEqual([
        { id: '123', name: 'Channel 1', type: 0, parent_id: undefined },
      ]);
      firstValueFromSpy.mockRestore();
    });

    it('should_throw_service_unavailable_when_api_call_fails', async () => {
      vi.mocked(mockCacheManager.get).mockResolvedValue(undefined);

      const axiosError = new AxiosError('Request failed');
      axiosError.response = {
        status: 500,
        statusText: 'Internal Server Error',
        data: {},
        headers: {},
        config: {} as never,
      };

      vi.mocked(mockHttpService.get).mockReturnValue(
        throwError(() => axiosError) as never,
      );

      await expect(service.getGuildChannels('guild-123')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('getGuildMemberByUserId', () => {
    it('should_throw_service_unavailable_when_bot_token_not_configured', async () => {
      const configServiceNoToken = {
        get: vi.fn().mockImplementation((key: string) => {
          if (key === 'discord.botToken') return '';
          if (key === 'discord.apiUrl') return 'https://discord.com/api/v10';
          if (key === 'discord.timeout') return 10000;
          if (key === 'discord.retryAttempts') return 3;
          return undefined;
        }),
      } as unknown as ConfigService;

      const module = await Test.createTestingModule({
        providers: [
          DiscordBotService,
          { provide: HttpService, useValue: mockHttpService },
          { provide: ConfigService, useValue: configServiceNoToken },
          { provide: CACHE_MANAGER, useValue: mockCacheManager },
        ],
      }).compile();

      const serviceNoToken = module.get<DiscordBotService>(DiscordBotService);

      await expect(
        serviceNoToken.getGuildMemberByUserId('guild-123', 'user-123'),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should_return_cached_member_when_cache_hit', async () => {
      const cachedMember = {
        roles: ['role-1', 'role-2'],
        user: { id: 'user-123', username: 'testuser' },
      };

      vi.mocked(mockCacheManager.get).mockResolvedValue(cachedMember);

      const result = await service.getGuildMemberByUserId(
        'guild-123',
        'user-123',
      );

      expect(result).toEqual(cachedMember);
      expect(mockCacheManager.get).toHaveBeenCalledWith(
        'discord:member:guild-123:user-123',
      );
      expect(mockHttpService.get).not.toHaveBeenCalled();
    });

    it('should_return_null_when_user_not_in_guild', async () => {
      const axiosError = new AxiosError('Not found');
      axiosError.response = {
        status: 404,
        statusText: 'Not Found',
        data: {},
        headers: {},
        config: {} as never,
      };

      const mockResponse: AxiosResponse = {
        data: null,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };

      vi.mocked(mockCacheManager.get).mockResolvedValue(undefined);
      vi.mocked(mockHttpService.get).mockReturnValue(
        throwError(() => axiosError).pipe() as never,
      );

      firstValueFromSpy = vi
        .spyOn(rxjs, 'firstValueFrom')
        .mockResolvedValue(mockResponse);

      const result = await service.getGuildMemberByUserId(
        'guild-123',
        'user-123',
      );

      expect(result).toBeNull();
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'discord:member:guild-123:user-123',
        null,
        expect.any(Number),
      );
      firstValueFromSpy.mockRestore();
    });

    it('should_fetch_and_cache_member_when_cache_miss', async () => {
      const mockApiMember = {
        roles: ['role-1', 'role-2'],
        user: { id: 'user-123', username: 'testuser' },
      };

      const mockResponse: AxiosResponse = {
        data: mockApiMember,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };

      vi.mocked(mockCacheManager.get).mockResolvedValue(undefined);
      vi.mocked(mockHttpService.get).mockReturnValue(
        of(mockResponse).pipe() as never,
      );
      vi.mocked(mockCacheManager.set).mockResolvedValue(undefined);

      firstValueFromSpy = vi
        .spyOn(rxjs, 'firstValueFrom')
        .mockResolvedValue(mockResponse);

      const result = await service.getGuildMemberByUserId(
        'guild-123',
        'user-123',
      );

      expect(result).toEqual({
        roles: ['role-1', 'role-2'],
        user: { id: 'user-123', username: 'testuser' },
      });
      expect(mockCacheManager.set).toHaveBeenCalled();
      firstValueFromSpy.mockRestore();
    });

    it('should_return_member_without_user_when_user_not_in_response', async () => {
      const mockApiMember = {
        roles: ['role-1'],
      };

      const mockResponse: AxiosResponse = {
        data: mockApiMember,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };

      vi.mocked(mockCacheManager.get).mockResolvedValue(undefined);
      vi.mocked(mockHttpService.get).mockReturnValue(
        of(mockResponse).pipe() as never,
      );

      firstValueFromSpy = vi
        .spyOn(rxjs, 'firstValueFrom')
        .mockResolvedValue(mockResponse);

      const result = await service.getGuildMemberByUserId(
        'guild-123',
        'user-123',
      );

      expect(result).toEqual({
        roles: ['role-1'],
        user: undefined,
      });
      firstValueFromSpy.mockRestore();
    });

    it('should_throw_service_unavailable_when_api_call_fails', async () => {
      vi.mocked(mockCacheManager.get).mockResolvedValue(undefined);

      const axiosError = new AxiosError('Request failed');
      axiosError.response = {
        status: 500,
        statusText: 'Internal Server Error',
        data: {},
        headers: {},
        config: {} as never,
      };

      vi.mocked(mockHttpService.get).mockReturnValue(
        throwError(() => axiosError) as never,
      );

      await expect(
        service.getGuildMemberByUserId('guild-123', 'user-123'),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
