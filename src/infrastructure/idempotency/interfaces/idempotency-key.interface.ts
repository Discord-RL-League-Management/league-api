/**
 * Idempotency Key Interface
 * Type definitions for idempotency keys
 */

export interface ProcessedEvent {
  id: string;
  eventKey: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  processedAt: Date;
}
