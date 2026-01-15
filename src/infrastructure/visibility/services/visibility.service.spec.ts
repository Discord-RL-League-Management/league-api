/**
 * VisibilityService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VisibilityService } from './visibility.service';
import { VisibilityRepository } from '../repositories/visibility.repository';
import { EntityVisibility } from '@prisma/client';

describe('VisibilityService', () => {
  let service: VisibilityService;
  let mockRepository: VisibilityRepository;

  const mockVisibility: EntityVisibility = {
    id: 'visibility_123',
    entityType: 'League',
    entityId: 'league_123',
    targetType: 'Guild',
    targetId: 'guild_123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      delete: vi.fn(),
      findVisibleEntities: vi.fn(),
      findVisibilityTargets: vi.fn(),
    } as unknown as VisibilityRepository;

    service = new VisibilityService(mockRepository);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('addVisibility', () => {
    it('should_create_visibility_relationship', async () => {
      const entityType = 'League';
      const entityId = 'league_123';
      const targetType = 'Guild';
      const targetId = 'guild_123';

      vi.mocked(mockRepository.create).mockResolvedValue(mockVisibility);

      const result = await service.addVisibility(
        entityType,
        entityId,
        targetType,
        targetId,
      );

      expect(result).toEqual(mockVisibility);
      expect(mockRepository.create).toHaveBeenCalledWith({
        entityType,
        entityId,
        targetType,
        targetId,
      });
    });
  });

  describe('removeVisibility', () => {
    it('should_delete_visibility_relationship', async () => {
      const entityType = 'League';
      const entityId = 'league_123';
      const targetType = 'Guild';
      const targetId = 'guild_123';

      vi.mocked(mockRepository.delete).mockResolvedValue();

      await service.removeVisibility(
        entityType,
        entityId,
        targetType,
        targetId,
      );

      expect(mockRepository.delete).toHaveBeenCalledWith(
        entityType,
        entityId,
        targetType,
        targetId,
      );
    });
  });

  describe('getVisibleEntities', () => {
    it('should_return_visible_entities_for_target', async () => {
      const entityType = 'League';
      const targetType = 'Guild';
      const targetId = 'guild_123';
      const visibilities = [mockVisibility];

      vi.mocked(mockRepository.findVisibleEntities).mockResolvedValue(
        visibilities,
      );

      const result = await service.getVisibleEntities(
        entityType,
        targetType,
        targetId,
      );

      expect(result).toEqual(visibilities);
      expect(mockRepository.findVisibleEntities).toHaveBeenCalledWith(
        entityType,
        targetType,
        targetId,
      );
    });

    it('should_return_empty_array_when_no_visible_entities_exist', async () => {
      const entityType = 'League';
      const targetType = 'Guild';
      const targetId = 'guild_123';

      vi.mocked(mockRepository.findVisibleEntities).mockResolvedValue([]);

      const result = await service.getVisibleEntities(
        entityType,
        targetType,
        targetId,
      );

      expect(result).toEqual([]);
      expect(mockRepository.findVisibleEntities).toHaveBeenCalledWith(
        entityType,
        targetType,
        targetId,
      );
    });
  });

  describe('getVisibilityTargets', () => {
    it('should_return_visibility_targets_for_entity', async () => {
      const entityType = 'League';
      const entityId = 'league_123';
      const visibilities = [mockVisibility];

      vi.mocked(mockRepository.findVisibilityTargets).mockResolvedValue(
        visibilities,
      );

      const result = await service.getVisibilityTargets(entityType, entityId);

      expect(result).toEqual(visibilities);
      expect(mockRepository.findVisibilityTargets).toHaveBeenCalledWith(
        entityType,
        entityId,
      );
    });

    it('should_return_empty_array_when_no_visibility_targets_exist', async () => {
      const entityType = 'League';
      const entityId = 'league_123';

      vi.mocked(mockRepository.findVisibilityTargets).mockResolvedValue([]);

      const result = await service.getVisibilityTargets(entityType, entityId);

      expect(result).toEqual([]);
      expect(mockRepository.findVisibilityTargets).toHaveBeenCalledWith(
        entityType,
        entityId,
      );
    });
  });
});
