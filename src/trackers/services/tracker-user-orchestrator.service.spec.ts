/**
 * TrackerUserOrchestratorService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TrackerUserOrchestratorService } from './tracker-user-orchestrator.service';
import { UsersService } from '../../users/users.service';

describe('TrackerUserOrchestratorService', () => {
  let service: TrackerUserOrchestratorService;
  let mockUsersService: UsersService;

  beforeEach(() => {
    mockUsersService = {
      upsert: vi.fn(),
    } as unknown as UsersService;

    service = new TrackerUserOrchestratorService(mockUsersService);
  });

  describe('ensureUserExists', () => {
    it('should_upsert_user_when_user_data_provided', async () => {
      const userId = 'user-123';
      const userData = {
        username: 'testuser',
        globalName: 'Test User',
        avatar: 'avatar_hash',
      };

      vi.spyOn(mockUsersService, 'upsert').mockResolvedValue(undefined);

      await service.ensureUserExists(userId, userData);

      expect(mockUsersService.upsert).toHaveBeenCalledWith({
        id: userId,
        username: 'testuser',
        globalName: 'Test User',
        avatar: 'avatar_hash',
      });
    });

    it('should_upsert_user_with_defaults_when_user_data_not_provided', async () => {
      const userId = 'user-123';

      vi.spyOn(mockUsersService, 'upsert').mockResolvedValue(undefined);

      await service.ensureUserExists(userId);

      expect(mockUsersService.upsert).toHaveBeenCalledWith({
        id: userId,
        username: userId,
        globalName: null,
        avatar: null,
      });
    });

    it('should_upsert_user_with_partial_data', async () => {
      const userId = 'user-123';
      const userData = {
        username: 'testuser',
      };

      vi.spyOn(mockUsersService, 'upsert').mockResolvedValue(undefined);

      await service.ensureUserExists(userId, userData);

      expect(mockUsersService.upsert).toHaveBeenCalledWith({
        id: userId,
        username: 'testuser',
        globalName: null,
        avatar: null,
      });
    });
  });
});
