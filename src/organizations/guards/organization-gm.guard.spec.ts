/**
 * OrganizationGmGuard Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { OrganizationGmGuard } from './organization-gm.guard';
import { OrganizationAuthorizationService } from '../services/organization-authorization.service';

describe('OrganizationGmGuard', () => {
  let guard: OrganizationGmGuard;
  let mockAuthorizationService: OrganizationAuthorizationService;

  const createMockExecutionContext = (
    user: object | undefined,
    params: Record<string, string>,
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user, params }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    mockAuthorizationService = {
      isGeneralManager: vi.fn(),
      hasGeneralManagers: vi.fn(),
    } as unknown as OrganizationAuthorizationService;

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrganizationGmGuard,
        {
          provide: OrganizationAuthorizationService,
          useValue: mockAuthorizationService,
        },
      ],
    }).compile();

    guard = moduleRef.get<OrganizationGmGuard>(OrganizationGmGuard);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('canActivate', () => {
    it('should_return_true_when_user_is_general_manager', async () => {
      const context = createMockExecutionContext(
        { id: 'user-123' },
        { id: 'org-123' },
      );
      vi.mocked(mockAuthorizationService.isGeneralManager).mockResolvedValue(
        true,
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockAuthorizationService.isGeneralManager).toHaveBeenCalledWith(
        'user-123',
        'org-123',
      );
    });

    it('should_throw_forbidden_when_user_missing', async () => {
      const context = createMockExecutionContext(undefined, { id: 'org-123' });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should_throw_forbidden_when_organization_id_missing', async () => {
      const context = createMockExecutionContext({ id: 'user-123' }, {});

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should_throw_forbidden_when_user_not_general_manager', async () => {
      const context = createMockExecutionContext(
        { id: 'user-123' },
        { id: 'org-123' },
      );
      vi.mocked(mockAuthorizationService.isGeneralManager).mockResolvedValue(
        false,
      );
      vi.mocked(mockAuthorizationService.hasGeneralManagers).mockResolvedValue(
        true,
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        'You must be a General Manager of this organization',
      );
    });

    it('should_allow_bot_user_when_organization_has_no_gms', async () => {
      const context = createMockExecutionContext(
        { id: 'bot-123', type: 'bot' },
        { id: 'org-123' },
      );
      vi.mocked(mockAuthorizationService.isGeneralManager).mockResolvedValue(
        false,
      );
      vi.mocked(mockAuthorizationService.hasGeneralManagers).mockResolvedValue(
        false,
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should_use_organizationId_param_when_id_not_present', async () => {
      const context = createMockExecutionContext(
        { id: 'user-123' },
        { organizationId: 'org-456' },
      );
      vi.mocked(mockAuthorizationService.isGeneralManager).mockResolvedValue(
        true,
      );

      await guard.canActivate(context);

      expect(mockAuthorizationService.isGeneralManager).toHaveBeenCalledWith(
        'user-123',
        'org-456',
      );
    });
  });
});
