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
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp: Date;
}

