/**
 * Outbox Event Interface
 * Type definitions for outbox events
 */

export interface OutboxEvent {
  id: string;
  sourceType: string;
  sourceId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  processedAt?: Date;
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}
