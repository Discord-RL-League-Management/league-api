/**
 * AuditMetadata - Metadata attached to request for audit logging
 *
 * Guards and authorization services set this metadata on the request object
 * to enable automatic audit logging via interceptors.
 */
export interface AuditMetadata {
  action: string; // e.g., 'admin.check', 'resource.ownership.check'
  guardType: string; // e.g., 'SystemAdminGuard', 'ResourceOwnershipGuard'
  entityType?: string; // Optional: 'admin', 'permission', 'guild'
  guildId?: string; // Optional: guild ID for guild-related actions
  metadata?: Record<string, unknown>; // Optional: Additional metadata for audit logging
}

// Extend Express Request type to include audit metadata
declare module 'express' {
  interface Request {
    _auditMetadata?: AuditMetadata;
  }
}
