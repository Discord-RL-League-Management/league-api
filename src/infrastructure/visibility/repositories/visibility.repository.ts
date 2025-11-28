import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, EntityVisibility } from '@prisma/client';

/**
 * VisibilityRepository - Single Responsibility: Data access layer for EntityVisibility entity
 *
 * Pure data access layer with no business logic.
 * Handles all database operations for EntityVisibility model.
 */
@Injectable()
export class VisibilityRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create visibility relationship
   */
  async create(
    data: Prisma.EntityVisibilityCreateInput,
  ): Promise<EntityVisibility> {
    return this.prisma.entityVisibility.create({ data });
  }

  /**
   * Remove visibility relationship
   */
  async delete(
    entityType: string,
    entityId: string,
    targetType: string,
    targetId: string,
  ): Promise<void> {
    await this.prisma.entityVisibility.delete({
      where: {
        entityType_entityId_targetType_targetId: {
          entityType,
          entityId,
          targetType,
          targetId,
        },
      },
    });
  }

  /**
   * Find visible entities for a target
   */
  async findVisibleEntities(
    entityType: string,
    targetType: string,
    targetId: string,
  ): Promise<EntityVisibility[]> {
    return this.prisma.entityVisibility.findMany({
      where: {
        entityType,
        targetType,
        targetId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find visibility targets for an entity
   */
  async findVisibilityTargets(
    entityType: string,
    entityId: string,
  ): Promise<EntityVisibility[]> {
    return this.prisma.entityVisibility.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
