/**
 * VisibilityRepository Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VisibilityRepository } from './visibility.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { EntityVisibility, Prisma } from '@prisma/client';

describe('VisibilityRepository', () => {
  let repository: VisibilityRepository;
  let mockPrisma: PrismaService;

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
    mockPrisma = {
      entityVisibility: {
        create: vi.fn(),
        delete: vi.fn(),
        findMany: vi.fn(),
      },
    } as unknown as PrismaService;

    repository = new VisibilityRepository(mockPrisma);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('should_create_visibility_relationship', async () => {
      const data: Prisma.EntityVisibilityCreateInput = {
        entityType: 'League',
        entityId: 'league_123',
        targetType: 'Guild',
        targetId: 'guild_123',
      };

      vi.mocked(mockPrisma.entityVisibility.create).mockResolvedValue(
        mockVisibility,
      );

      const result = await repository.create(data);

      expect(result).toEqual(mockVisibility);
      expect(mockPrisma.entityVisibility.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('delete', () => {
    it('should_delete_visibility_relationship', async () => {
      const entityType = 'League';
      const entityId = 'league_123';
      const targetType = 'Guild';
      const targetId = 'guild_123';

      vi.mocked(mockPrisma.entityVisibility.delete).mockResolvedValue(
        mockVisibility,
      );

      await repository.delete(entityType, entityId, targetType, targetId);

      expect(mockPrisma.entityVisibility.delete).toHaveBeenCalledWith({
        where: {
          entityType_entityId_targetType_targetId: {
            entityType,
            entityId,
            targetType,
            targetId,
          },
        },
      });
    });
  });

  describe('findVisibleEntities', () => {
    it('should_return_visible_entities_for_target', async () => {
      const entityType = 'League';
      const targetType = 'Guild';
      const targetId = 'guild_123';
      const visibilities = [mockVisibility];

      vi.mocked(mockPrisma.entityVisibility.findMany).mockResolvedValue(
        visibilities,
      );

      const result = await repository.findVisibleEntities(
        entityType,
        targetType,
        targetId,
      );

      expect(result).toEqual(visibilities);
      expect(mockPrisma.entityVisibility.findMany).toHaveBeenCalledWith({
        where: {
          entityType,
          targetType,
          targetId,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should_return_empty_array_when_no_visible_entities_exist', async () => {
      const entityType = 'League';
      const targetType = 'Guild';
      const targetId = 'guild_123';

      vi.mocked(mockPrisma.entityVisibility.findMany).mockResolvedValue([]);

      const result = await repository.findVisibleEntities(
        entityType,
        targetType,
        targetId,
      );

      expect(result).toEqual([]);
      expect(mockPrisma.entityVisibility.findMany).toHaveBeenCalledWith({
        where: {
          entityType,
          targetType,
          targetId,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findVisibilityTargets', () => {
    it('should_return_visibility_targets_for_entity', async () => {
      const entityType = 'League';
      const entityId = 'league_123';
      const visibilities = [mockVisibility];

      vi.mocked(mockPrisma.entityVisibility.findMany).mockResolvedValue(
        visibilities,
      );

      const result = await repository.findVisibilityTargets(
        entityType,
        entityId,
      );

      expect(result).toEqual(visibilities);
      expect(mockPrisma.entityVisibility.findMany).toHaveBeenCalledWith({
        where: {
          entityType,
          entityId,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should_return_empty_array_when_no_visibility_targets_exist', async () => {
      const entityType = 'League';
      const entityId = 'league_123';

      vi.mocked(mockPrisma.entityVisibility.findMany).mockResolvedValue([]);

      const result = await repository.findVisibilityTargets(
        entityType,
        entityId,
      );

      expect(result).toEqual([]);
      expect(mockPrisma.entityVisibility.findMany).toHaveBeenCalledWith({
        where: {
          entityType,
          entityId,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
