/**
 * Audit Log Interface
 * Type definitions for audit logs
 */

export interface AuditLog {
  id: string;
  userId?: string;
  botId?: string;
  ipAddress: string;
  userAgent?: string;
  method: string;
  endpoint: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  requestBody?: Record<string, unknown>;
  responseStatus?: number;
  timestamp: Date;
}

export interface CreateAuditLogInput {
  userId?: string;
  botId?: string;
  ipAddress: string;
  userAgent?: string;
  method: string;
  endpoint: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  requestBody?: Record<string, unknown>;
  responseStatus?: number;
}

export interface QueryFilters {
  userId?: string;
  botId?: string;
  resourceType?: string;
  resourceId?: string;
  method?: string;
  endpoint?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}
