/**
 * TokenProviderAdapter Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { TokenProviderAdapter } from './token-provider.adapter';
import { TokenManagementService } from '../services/token-management.service';

describe('TokenProviderAdapter', () => {
  let adapter: TokenProviderAdapter;
  let mockTokenManagementService: TokenManagementService;

  beforeEach(async () => {
    mockTokenManagementService = {
      getValidAccessToken: vi.fn(),
    } as unknown as TokenManagementService;

    const module = await Test.createTestingModule({
      providers: [
        TokenProviderAdapter,
        {
          provide: TokenManagementService,
          useValue: mockTokenManagementService,
        },
      ],
    }).compile();

    adapter = module.get<TokenProviderAdapter>(TokenProviderAdapter);
  });

  describe('getValidAccessToken', () => {
    it('should_return_access_token_when_token_management_service_returns_token', async () => {
      const userId = 'user-123';
      const accessToken = 'valid-access-token';
      vi.spyOn(
        mockTokenManagementService,
        'getValidAccessToken',
      ).mockResolvedValue(accessToken);

      const result = await adapter.getValidAccessToken(userId);

      expect(result).toBe(accessToken);
      expect(
        mockTokenManagementService.getValidAccessToken,
      ).toHaveBeenCalledWith(userId);
    });

    it('should_return_null_when_token_management_service_returns_null', async () => {
      const userId = 'user-123';
      vi.spyOn(
        mockTokenManagementService,
        'getValidAccessToken',
      ).mockResolvedValue(null);

      const result = await adapter.getValidAccessToken(userId);

      expect(result).toBeNull();
      expect(
        mockTokenManagementService.getValidAccessToken,
      ).toHaveBeenCalledWith(userId);
    });

    it('should_delegate_to_token_management_service', async () => {
      const userId = 'user-456';
      const accessToken = 'another-token';
      vi.spyOn(
        mockTokenManagementService,
        'getValidAccessToken',
      ).mockResolvedValue(accessToken);

      await adapter.getValidAccessToken(userId);

      expect(
        mockTokenManagementService.getValidAccessToken,
      ).toHaveBeenCalledWith(userId);
      expect(
        mockTokenManagementService.getValidAccessToken,
      ).toHaveBeenCalledTimes(1);
    });
  });
});
