/**
 * Activity Log Interface
 * Type definitions for activity logs
 */

export interface ActivityLog {
  id: string;
  entityType: string;
  entityId: string;
  eventType: string;
  action: string;
  userId?: string;
  guildId?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
