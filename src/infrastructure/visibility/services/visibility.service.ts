import { Injectable } from '@nestjs/common';
import { VisibilityRepository } from '../repositories/visibility.repository';
import { EntityVisibility } from '@prisma/client';

/**
 * VisibilityService - Single Responsibility: Visibility management
 *
 * Handles entity visibility/sharing operations.
 * Replaces domain-specific visibility patterns with generic pattern.
 */
@Injectable()
export class VisibilityService {
  constructor(private readonly repository: VisibilityRepository) {}

  /**
   * Add visibility relationship
   */
  async addVisibility(
    entityType: string,
    entityId: string,
    targetType: string,
    targetId: string,
  ): Promise<EntityVisibility> {
    return this.repository.create({
      entityType,
      entityId,
      targetType,
      targetId,
    });
  }

  /**
   * Remove visibility relationship
   */
  async removeVisibility(
    entityType: string,
    entityId: string,
    targetType: string,
    targetId: string,
  ): Promise<void> {
    await this.repository.delete(entityType, entityId, targetType, targetId);
  }

  /**
   * Get visible entities for a target
   */
  async getVisibleEntities(
    entityType: string,
    targetType: string,
    targetId: string,
  ): Promise<EntityVisibility[]> {
    return this.repository.findVisibleEntities(
      entityType,
      targetType,
      targetId,
    );
  }

  /**
   * Get visibility targets for an entity
   */
  async getVisibilityTargets(
    entityType: string,
    entityId: string,
  ): Promise<EntityVisibility[]> {
    return this.repository.findVisibilityTargets(entityType, entityId);
  }
}
