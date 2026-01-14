/**
 * TrackerUserOrchestratorService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TrackerUserOrchestratorService } from './tracker-user-orchestrator.service';
import { UsersService } from '../../users/users.service';

describe('TrackerUserOrchestratorService', () => {
  let service: TrackerUserOrchestratorService;
  let mockUsersService: UsersService;

  beforeEach(() => {
    mockUsersService = {
      upsert: vi.fn().mockResolvedValue(undefined),
    } as unknown as UsersService;

    service = new TrackerUserOrchestratorService(mockUsersService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ensureUserExists', () => {
    it('should_create_user_when_user_does_not_exist', async () => {
      const userId = 'user_123';
      const userData = {
        username: 'testuser',
        globalName: 'Test User',
        avatar: 'avatar_url',
      };

      await service.ensureUserExists(userId, userData);

      expect(mockUsersService.upsert).toHaveBeenCalledWith({
        id: userId,
        username: userData.username,
        globalName: userData.globalName,
        avatar: userData.avatar,
      });
    });

    it('should_update_user_when_user_already_exists', async () => {
      const userId = 'user_123';
      const userData = {
        username: 'updateduser',
        globalName: 'Updated User',
        avatar: 'new_avatar_url',
      };

      await service.ensureUserExists(userId, userData);

      expect(mockUsersService.upsert).toHaveBeenCalledWith({
        id: userId,
        username: userData.username,
        globalName: userData.globalName,
        avatar: userData.avatar,
      });
    });

    it('should_use_user_id_as_username_when_username_not_provided', async () => {
      const userId = 'user_123';

      await service.ensureUserExists(userId);

      expect(mockUsersService.upsert).toHaveBeenCalledWith({
        id: userId,
        username: userId,
        globalName: null,
        avatar: null,
      });
    });

    it('should_handle_partial_user_data_when_only_username_provided', async () => {
      const userId = 'user_123';
      const userData = {
        username: 'testuser',
      };

      await service.ensureUserExists(userId, userData);

      expect(mockUsersService.upsert).toHaveBeenCalledWith({
        id: userId,
        username: userData.username,
        globalName: null,
        avatar: null,
      });
    });

    it('should_handle_null_global_name_when_provided_as_null', async () => {
      const userId = 'user_123';
      const userData = {
        username: 'testuser',
        globalName: null,
        avatar: 'avatar_url',
      };

      await service.ensureUserExists(userId, userData);

      expect(mockUsersService.upsert).toHaveBeenCalledWith({
        id: userId,
        username: userData.username,
        globalName: null,
        avatar: userData.avatar,
      });
    });

    it('should_handle_undefined_global_name_when_not_provided', async () => {
      const userId = 'user_123';
      const userData = {
        username: 'testuser',
        avatar: 'avatar_url',
      };

      await service.ensureUserExists(userId, userData);

      expect(mockUsersService.upsert).toHaveBeenCalledWith({
        id: userId,
        username: userData.username,
        globalName: null,
        avatar: userData.avatar,
      });
    });

    it('should_handle_null_avatar_when_provided_as_null', async () => {
      const userId = 'user_123';
      const userData = {
        username: 'testuser',
        globalName: 'Test User',
        avatar: null,
      };

      await service.ensureUserExists(userId, userData);

      expect(mockUsersService.upsert).toHaveBeenCalledWith({
        id: userId,
        username: userData.username,
        globalName: userData.globalName,
        avatar: null,
      });
    });

    it('should_handle_undefined_avatar_when_not_provided', async () => {
      const userId = 'user_123';
      const userData = {
        username: 'testuser',
        globalName: 'Test User',
      };

      await service.ensureUserExists(userId, userData);

      expect(mockUsersService.upsert).toHaveBeenCalledWith({
        id: userId,
        username: userData.username,
        globalName: userData.globalName,
        avatar: null,
      });
    });
  });
});
