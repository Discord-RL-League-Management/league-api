/**
 * Visibility Interface
 * Type definitions for entity visibility
 */

export interface EntityVisibility {
  id: string;
  entityType: string;
  entityId: string;
  targetType: string;
  targetId: string;
  createdAt: Date;
}
